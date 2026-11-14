import { normalizarEstado, normalizarSimbolo } from './notacion.js'

const RE_CONJUNTO = /^(Q|Σ|Sigma|Γ|Gamma)\s*=\s*\{(.*)\}$/
const RE_DISTINGUIDO = /^(q0|q₀|qaccept|qreject)\s*=\s*(\S+)$/
const RE_TUPLA = /^([^\s=]+)\s*=\s*\((.*)\)$/
const RE_TRANSICION = /^(?:δ|delta)\s*\(([^()]*)\)\s*(?:=|→|->)\s*\(([^()]*)\)$/i
const RE_ES_TRANSICION = /^(?:δ|delta)\s*\(/i
const RE_ENTRADA = /^w\s*=\s*(.*)$/
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
    .filter((l) => l.texto !== '')
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
  const def = { nombre: 'M', Q: null, Sigma: null, Gamma: null, q0: null, qaccept: null, qreject: null }
  const lineas = {}

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
    } else if ((m = RE_TUPLA.exec(l))) {
      const partes = m[2].split(',').map((s) => s.trim())
      const forma = partes.length === 7 && partes[0] === 'Q' &&
        ['Σ', 'Sigma'].includes(partes[1]) && ['Γ', 'Gamma'].includes(partes[2]) && ['δ', 'delta'].includes(partes[3])
      if (!forma) {
        r.error(linea, 'La 7-tupla debe tener la forma M = (Q, Σ, Γ, δ, q₀, qaccept, qreject)')
        continue
      }
      def.nombre = normalizarEstado(m[1])
      asignar('q0', normalizarEstado(partes[4]), linea)
      asignar('qaccept', normalizarEstado(partes[5]), linea)
      asignar('qreject', normalizarEstado(partes[6]), linea)
    } else if (RE_ES_TRANSICION.test(l)) {
      r.error(linea, 'Las transiciones δ van en la sección de transiciones')
    } else {
      r.error(linea, `Línea no reconocida: "${l}". Se esperaba la 7-tupla, Q = {…}, Σ = {…} o Γ = {…}`)
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
    if (!m || izq.length !== 2 || der.length !== 3 || [...izq, ...der].includes('')) {
      r.error(linea, `"${l}" no es una transición válida. Formato: δ(qᵢ, b) = (qⱼ, c, L) o δ(qᵢ, b) = (qⱼ, c, R)`)
      continue
    }
    transiciones.push({
      q: normalizarEstado(izq[0]),
      a: normalizarSimbolo(izq[1]),
      qj: normalizarEstado(der[0]),
      c: normalizarSimbolo(der[1]),
      mov: der[2].toUpperCase(),
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

export function separarEspecificacion(texto) {
  const secciones = { definicion: [], transiciones: [], entrada: [] }
  let pendientes = []
  let ultima = 'definicion'
  for (const linea of texto.split(/\r?\n/)) {
    const util = quitarComentario(linea)
    if (util === '') {
      pendientes.push(linea)
      continue
    }
    ultima = RE_ES_TRANSICION.test(util) ? 'transiciones' : RE_ENTRADA.test(util) ? 'entrada' : 'definicion'
    secciones[ultima].push(...pendientes, linea)
    pendientes = []
  }
  secciones[ultima].push(...pendientes)
  const limpiar = (ls) => ls.join('\n').replace(/^\s*\n/, '').trimEnd()
  return {
    definicion: limpiar(secciones.definicion),
    transiciones: limpiar(secciones.transiciones),
    entrada: limpiar(secciones.entrada),
  }
}
