import { BLANCO, MODELOS, normalizarEstado, normalizarSimbolo } from './notacion.js'

const RE_CONJUNTO = /^(Q|Σ|Sigma|Γ|Gamma|F)\s*=\s*\{(.*)\}$/
const RE_DISTINGUIDO = /^(q0|q₀|qaccept|qreject)\s*=\s*(\S+)$/
const RE_TUPLA = /^([^\s=]+)\s*=\s*\((.*)\)$/
const RE_TRANSICION = /^(?:δ|delta)\s*\((.*)\)\s*(?:=|→|->)\s*\((.*)\)$/i
const RE_ES_TRANSICION = /^(?:δ|delta)\s*\(/i
const RE_ENTRADA = /^w\s*=\s*(.*)$/
const RE_CINTAS = /^cintas\s*=\s*(\S+)$/i
const RE_CACHE = /^(?:cach[eé]|memoria)\s*=\s*(\S+)$/i
const RE_ESTADO = /^[^\s,()[\]{}=]+$/
const RE_CORCHETE = /^\[([^[\]]*)\]\s*,(.*)$/
const RESERVADOS = new Set([',', '(', ')', '{', '}', '[', ']'])
const SI = new Set(['sí', 'si', 'true', '1', 'activada', 'activa'])
const NO = new Set(['no', 'false', '0', 'desactivada', 'inactiva'])
const BLANCOS_TUPLA = new Set([BLANCO, '_', 'B'])

const CAMPO_CONJUNTO = { Q: 'Q', Σ: 'Sigma', Sigma: 'Sigma', Γ: 'Gamma', Gamma: 'Gamma', F: 'F' }
const NOMBRE_CONJUNTO = { Q: 'Q', Sigma: 'Σ', Gamma: 'Γ', F: 'F' }
const CAMPO_DISTINGUIDO = { q0: 'q0', 'q₀': 'q0', qaccept: 'qaccept', qreject: 'qreject' }
const NOMBRE_DISTINGUIDO = { q0: 'q₀', qaccept: 'qaccept', qreject: 'qreject' }
const DE_ESTADOS = new Set(['Q', 'F'])

export const quitarComentario = (linea) => linea.replace(/\/\/.*$/, '').trim()

function lineasUtiles(texto) {
  return (texto ?? '')
    .split(/\r?\n/)
    .map((crudo, i) => ({ texto: quitarComentario(crudo), linea: i + 1 }))
    .filter((l) => l.texto !== '' && !encabezadoDeSeccion(l.texto))
}

export const esSimboloValido = (s) => s.length === 1 && !/\s/.test(s) && !RESERVADOS.has(s)

export const esEstadoValido = (q) => RE_ESTADO.test(q)

function crearRegistro(seccion) {
  const errores = []
  const advertencias = []
  return {
    errores,
    advertencias,
    error: (linea, mensaje) => errores.push({ seccion, linea, mensaje }),
    advertencia: (linea, mensaje) => advertencias.push({ seccion, linea, mensaje }),
  }
}

// (…, q₀, qaccept, qreject) -> Sipser; (…, q₀, ⊔, F) -> Hopcroft.
function leerTupla(partes) {
  const base = partes.length === 7 && partes[0] === 'Q' &&
    ['Σ', 'Sigma'].includes(partes[1]) && ['Γ', 'Gamma'].includes(partes[2]) && ['δ', 'delta'].includes(partes[3])
  if (!base) return null
  if (BLANCOS_TUPLA.has(partes[5]) && partes[6] === 'F') return { modelo: MODELOS.hopcroft, q0: partes[4] }
  return { modelo: MODELOS.sipser, q0: partes[4], qaccept: partes[5], qreject: partes[6] }
}

export function analizarDefinicion(texto) {
  const r = crearRegistro('definicion')
  const def = { nombre: 'M', modelo: null, Q: null, Sigma: null, Gamma: null, F: null, q0: null, qaccept: null, qreject: null, cache: false }
  const lineas = { claves: {} }

  const asignar = (campo, valor, linea) => {
    if (def[campo] !== null && def[campo] !== valor) {
      r.error(linea, `${NOMBRE_DISTINGUIDO[campo]} se definió dos veces con valores distintos (${def[campo]} y ${valor})`)
      return
    }
    if (!esEstadoValido(valor)) r.error(linea, `"${valor}" no es un nombre de estado válido`)
    def[campo] = valor
    lineas[campo] = linea
  }

  for (const { texto: l, linea } of lineasUtiles(texto)) {
    let m
    if ((m = RE_CONJUNTO.exec(l))) {
      const campo = CAMPO_CONJUNTO[m[1]]
      const nombre = NOMBRE_CONJUNTO[campo]
      if (def[campo]) {
        r.error(linea, `${nombre} se definió más de una vez`)
        continue
      }
      def[campo] = leerConjunto(m[2], campo, nombre, linea, r)
      lineas[campo] = linea
    } else if ((m = RE_DISTINGUIDO.exec(l))) {
      asignar(CAMPO_DISTINGUIDO[m[1]], normalizarEstado(m[2]), linea)
      lineas.claves[CAMPO_DISTINGUIDO[m[1]]] = linea
    } else if ((m = RE_TUPLA.exec(l))) {
      const tupla = leerTupla(m[2].split(',').map((s) => s.trim()))
      if (!tupla) {
        r.error(linea, 'La 7-tupla debe tener la forma M = (Q, Σ, Γ, δ, q₀, qaccept, qreject) o M = (Q, Σ, Γ, δ, q₀, ⊔, F)')
        continue
      }
      def.nombre = normalizarEstado(m[1])
      def.modelo = tupla.modelo
      lineas.tupla = linea
      asignar('q0', normalizarEstado(tupla.q0), linea)
      if (tupla.modelo === MODELOS.sipser) {
        asignar('qaccept', normalizarEstado(tupla.qaccept), linea)
        asignar('qreject', normalizarEstado(tupla.qreject), linea)
      }
    } else if ((m = RE_CACHE.exec(l))) {
      const valor = m[1].toLowerCase()
      if (lineas.cache) r.error(linea, 'La memoria caché se definió más de una vez')
      else if (SI.has(valor)) def.cache = true
      else if (!NO.has(valor)) r.error(linea, `"${m[1]}" no es válido: escribe caché = sí o caché = no`)
      lineas.cache = linea
    } else if (RE_CINTAS.test(l)) {
      r.error(linea, 'El simulador es de una sola cinta: quita la línea cintas = k')
    } else if (RE_ES_TRANSICION.test(l)) {
      r.error(linea, 'Las transiciones δ van en la sección de transiciones')
    } else {
      r.error(linea, `Línea no reconocida: "${l}". Se esperaba la 7-tupla, Q = {…}, Σ = {…}, Γ = {…}, F = {…} o caché = sí`)
    }
  }
  if (!def.modelo) def.modelo = def.F || (def.q0 && !def.qaccept && !def.qreject) ? MODELOS.hopcroft : MODELOS.sipser
  return { ...def, lineas, errores: r.errores, advertencias: r.advertencias }
}

function leerConjunto(cuerpo, campo, nombre, linea, r) {
  const crudos = cuerpo.trim() === '' ? [] : cuerpo.split(',').map((s) => s.trim())
  const esQ = DE_ESTADOS.has(campo)
  const elementos = []
  for (const crudo of crudos) {
    if (crudo === '') {
      r.error(linea, `${nombre} contiene un elemento vacío (revisa las comas)`)
      continue
    }
    const x = esQ ? normalizarEstado(crudo) : normalizarSimbolo(crudo)
    if (esQ && !esEstadoValido(x)) r.error(linea, `"${crudo}" no es un nombre de estado válido`)
    if (!esQ && !esSimboloValido(x)) r.error(linea, `"${crudo}" no es un símbolo válido: cada símbolo de ${nombre} debe ser un solo carácter`)
    if (elementos.includes(x)) r.advertencia(linea, `${nombre} repite el elemento ${x}`)
    else elementos.push(x)
  }
  return elementos
}

const separar = (s) => s.split(',').map((x) => x.trim())

function leerTransicion(l) {
  const m = RE_TRANSICION.exec(l)
  if (!m) return null
  const ci = RE_CORCHETE.exec(m[1].trim())
  const cd = RE_CORCHETE.exec(m[2].trim())
  if (Boolean(ci) !== Boolean(cd)) return { error: 'si un lado usa [q, m], el otro también' }
  if (ci) {
    const [ei, ri, ed, rd] = [separar(ci[1]), separar(ci[2]), separar(cd[1]), separar(cd[2])]
    if (ei.length !== 2 || ri.length !== 1 || ed.length !== 2 || rd.length !== 2 || [...ei, ...ri, ...ed, ...rd].includes('')) return null
    return {
      q: normalizarEstado(ei[0]),
      m: normalizarSimbolo(ei[1]),
      a: normalizarSimbolo(ri[0]),
      qj: normalizarEstado(ed[0]),
      n: normalizarSimbolo(ed[1]),
      c: normalizarSimbolo(rd[0]),
      mov: rd[1].toUpperCase(),
    }
  }
  const [izq, der] = [separar(m[1]), separar(m[2])]
  if (izq.length !== 2 || der.length !== 3 || [...izq, ...der].includes('')) return null
  if ([...izq, ...der].some((x) => /[[\]()]/.test(x))) return null
  return { q: normalizarEstado(izq[0]), a: normalizarSimbolo(izq[1]), qj: normalizarEstado(der[0]), c: normalizarSimbolo(der[1]), mov: der[2].toUpperCase() }
}

export function analizarTransiciones(texto) {
  const r = crearRegistro('transiciones')
  const transiciones = []
  for (const { texto: l, linea } of lineasUtiles(texto)) {
    const t = leerTransicion(l)
    if (!t || t.error) {
      r.error(linea, `"${l}" no es una transición válida${t?.error ? `: ${t.error}` : ''}. Formato: δ(qᵢ, b) = (qⱼ, c, D) o, con caché, δ([qᵢ, m], b) = ([qⱼ, n], c, D)`)
      continue
    }
    transiciones.push({ ...t, linea })
  }
  return { transiciones, errores: r.errores, advertencias: r.advertencias }
}

export function analizarEntrada(texto) {
  const r = crearRegistro('entrada')
  const cadenas = lineasUtiles(texto).map(({ texto: l, linea }) => {
    const m = RE_ENTRADA.exec(l)
    let valor = (m ? m[1] : l).replace(/\s+/g, '')
    if (valor === 'ε') valor = ''
    return { w: [...valor].map(normalizarSimbolo).join(''), linea }
  })
  if (cadenas.length === 0) cadenas.push({ w: '', linea: undefined })
  return { cadenas, w: cadenas[0].w, linea: cadenas[0].linea, errores: r.errores }
}

export const SECCIONES = ['definicion', 'transiciones', 'entrada']

export const ENCABEZADOS = { definicion: '[componentes]', transiciones: '[transiciones]', entrada: '[entrada]' }

const SECCION_DE_ENCABEZADO = {
  componentes: 'definicion',
  gramatica: 'definicion',
  definicion: 'definicion',
  transiciones: 'transiciones',
  entrada: 'entrada',
}

export function encabezadoDeSeccion(linea) {
  const m = /^\[\s*([^\]]+?)\s*\]$/.exec(quitarComentario(linea))
  return m ? SECCION_DE_ENCABEZADO[m[1].toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')] ?? null : null
}

const seccionPorContenido = (util) => (RE_ES_TRANSICION.test(util) ? 'transiciones' : RE_ENTRADA.test(util) ? 'entrada' : 'definicion')

// Sin encabezados, los comentarios y líneas en blanco se van con la siguiente línea con contenido.
export function clasificarLineas(texto) {
  const lineas = texto.split(/\r?\n/).map((crudo, i) => ({ numero: i + 1, texto: crudo, seccion: null, tipo: 'contenido' }))
  let elegida = null
  let ultima = 'definicion'
  let pendientes = []
  for (const l of lineas) {
    const encabezado = encabezadoDeSeccion(l.texto)
    if (encabezado) {
      l.tipo = 'encabezado'
      l.seccion = elegida = ultima = encabezado
      for (const p of pendientes) p.seccion = encabezado
      pendientes = []
      continue
    }
    const util = quitarComentario(l.texto)
    if (util === '') {
      l.tipo = l.texto.trim() ? 'comentario' : 'vacia'
      if (elegida) l.seccion = elegida
      else pendientes.push(l)
      continue
    }
    l.seccion = ultima = elegida ?? seccionPorContenido(util)
    for (const p of pendientes) p.seccion = l.seccion
    pendientes = []
  }
  for (const p of pendientes) p.seccion = ultima
  return lineas
}

export function separarEspecificacion(texto) {
  const secciones = { definicion: [], transiciones: [], entrada: [] }
  for (const l of clasificarLineas(texto)) if (l.tipo !== 'encabezado') secciones[l.seccion].push(l.texto)
  const limpiar = (ls) => ls.join('\n').replace(/^\s*\n/, '').trimEnd()
  return {
    definicion: limpiar(secciones.definicion),
    transiciones: limpiar(secciones.transiciones),
    entrada: limpiar(secciones.entrada),
  }
}
