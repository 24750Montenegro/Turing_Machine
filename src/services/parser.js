import { normalizarEstado, normalizarSimbolo } from './notacion.js'

const RE_CONJUNTO = /^(Q|Σ|Sigma|Γ|Gamma)\s*=\s*\{(.*)\}$/
const RE_DISTINGUIDO = /^(q0|q₀|qaccept|qreject)\s*=\s*(\S+)$/
const RE_TUPLA = /^([^\s=]+)\s*=\s*\((.*)\)$/
const RE_TRANSICION = /^(?:δ|delta)\s*\(([^()]*)\)\s*(?:=|→|->)\s*\(([^()]*)\)$/i
const RE_ES_TRANSICION = /^(?:δ|delta)\s*\(/i
const RE_ENTRADA = /^w\s*=\s*(.*)$/
const RE_CINTAS = /^cintas\s*=\s*(\S+)$/i
const RE_ESTADO = /^[^\s,(){}=]+$/
const RESERVADOS = new Set([',', '(', ')', '{', '}'])

const CAMPO_CONJUNTO = { Q: 'Q', Σ: 'Sigma', Sigma: 'Sigma', Γ: 'Gamma', Gamma: 'Gamma' }
const NOMBRE_CONJUNTO = { Q: 'Q', Sigma: 'Σ', Gamma: 'Γ' }
const CAMPO_DISTINGUIDO = { q0: 'q0', 'q₀': 'q0', qaccept: 'qaccept', qreject: 'qreject' }
const NOMBRE_DISTINGUIDO = { q0: 'q₀', qaccept: 'qaccept', qreject: 'qreject' }

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

export function analizarDefinicion(texto) {
  const r = crearRegistro('definicion')
  const def = { nombre: 'M', Q: null, Sigma: null, Gamma: null, q0: null, qaccept: null, qreject: null, cintas: 1 }
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
      const partes = m[2].split(',').map((s) => s.trim())
      const forma = partes.length === 7 && partes[0] === 'Q' &&
        ['Σ', 'Sigma'].includes(partes[1]) && ['Γ', 'Gamma'].includes(partes[2]) && ['δ', 'delta'].includes(partes[3])
      if (!forma) {
        r.error(linea, 'La 7-tupla debe tener la forma M = (Q, Σ, Γ, δ, q₀, qaccept, qreject)')
        continue
      }
      def.nombre = normalizarEstado(m[1])
      lineas.tupla = linea
      asignar('q0', normalizarEstado(partes[4]), linea)
      asignar('qaccept', normalizarEstado(partes[5]), linea)
      asignar('qreject', normalizarEstado(partes[6]), linea)
    } else if ((m = RE_CINTAS.exec(l))) {
      const k = Number(m[1])
      if (lineas.cintas) r.error(linea, 'El número de cintas se definió más de una vez')
      else if (!Number.isInteger(k) || k < 1) r.error(linea, `"${m[1]}" no es un número de cintas válido: debe ser un entero k ≥ 1`)
      else def.cintas = k
      lineas.cintas = linea
    } else if (RE_ES_TRANSICION.test(l)) {
      r.error(linea, 'Las transiciones δ van en la sección de transiciones')
    } else {
      r.error(linea, `Línea no reconocida: "${l}". Se esperaba la 7-tupla, Q = {…}, Σ = {…}, Γ = {…} o cintas = k`)
    }
  }
  return { ...def, lineas, errores: r.errores, advertencias: r.advertencias }
}

function leerConjunto(cuerpo, campo, nombre, linea, r) {
  const crudos = cuerpo.trim() === '' ? [] : cuerpo.split(',').map((s) => s.trim())
  const esQ = campo === 'Q'
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

export function analizarTransiciones(texto) {
  const r = crearRegistro('transiciones')
  const transiciones = []
  for (const { texto: l, linea } of lineasUtiles(texto)) {
    const m = RE_TRANSICION.exec(l)
    const izq = m?.[1].split(',').map((s) => s.trim())
    const der = m?.[2].split(',').map((s) => s.trim())
    const k = izq ? izq.length - 1 : 0
    if (!m || k < 1 || der.length !== 2 * k + 1 || [...izq, ...der].includes('')) {
      r.error(linea, `"${l}" no es una transición válida. Formato: δ(qᵢ, b) = (qⱼ, c, L) o δ(qᵢ, b) = (qⱼ, c, R); con k cintas, δ(qᵢ, b₁, …, bₖ) = (qⱼ, c₁, …, cₖ, D₁, …, Dₖ)`)
      continue
    }
    const leidos = izq.slice(1).map(normalizarSimbolo)
    const escritos = der.slice(1, k + 1).map(normalizarSimbolo)
    const movs = der.slice(k + 1).map((d) => d.toUpperCase())
    transiciones.push({
      q: normalizarEstado(izq[0]),
      a: leidos.join(''),
      qj: normalizarEstado(der[0]),
      c: escritos.join(''),
      mov: movs.join(''),
      leidos,
      escritos,
      movs,
      linea,
    })
  }
  return { transiciones, errores: r.errores, advertencias: r.advertencias }
}

export function analizarEntrada(texto) {
  const r = crearRegistro('entrada')
  const lineas = lineasUtiles(texto)
  if (lineas.length > 1) r.error(lineas[1].linea, 'Solo se admite una cadena de entrada w')
  if (lineas.length === 0) return { w: '', errores: r.errores }
  const m = RE_ENTRADA.exec(lineas[0].texto)
  let valor = (m ? m[1] : lineas[0].texto).replace(/\s+/g, '')
  if (valor === 'ε') valor = ''
  return { w: [...valor].map(normalizarSimbolo).join(''), linea: lineas[0].linea, errores: r.errores }
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
