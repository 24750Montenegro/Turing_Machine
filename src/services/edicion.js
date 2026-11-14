import { analizarDefinicion, analizarTransiciones, esEstadoValido, esSimboloValido } from './parser.js'
import { MOVIMIENTOS, normalizarEstado, normalizarSimbolo, transicionATexto } from './notacion.js'

const ETIQUETAS = { Q: 'Q', Sigma: 'Σ', Gamma: 'Γ' }
const RE_ETIQUETA = /^\s*(Q|Σ|Sigma|Γ|Gamma)\s*=/
const ROLES = { q0: 'inicial', qaccept: 'de aceptación', qreject: 'de rechazo' }

const exito = (textos) => ({ textos })
const fallo = (error) => ({ error })
const dividir = (texto) => (texto ?? '').split(/\r?\n/)

function reescribir(texto, numero, contenido) {
  const lineas = dividir(texto)
  const original = lineas[numero - 1] ?? ''
  const i = original.indexOf('//')
  const [codigo, comentario] = i < 0 ? [original, ''] : [original.slice(0, i), original.slice(i)]
  const separacion = comentario ? codigo.match(/\s*$/)[0] || ' ' : ''
  lineas[numero - 1] = codigo.match(/^\s*/)[0] + contenido + separacion + comentario
  return lineas.join('\n')
}

const quitarLineas = (texto, numeros) => dividir(texto).filter((_, i) => !numeros.includes(i + 1)).join('\n')

function insertar(texto, despuesDe, contenido) {
  if (!texto.trim()) return contenido
  const lineas = dividir(texto)
  lineas.splice(despuesDe, 0, contenido)
  return lineas.join('\n')
}

const agregarAlFinal = (texto, contenido) => (texto.trim() ? `${texto.trimEnd()}\n${contenido}` : contenido)

function leer(textos) {
  return {
    def: analizarDefinicion(textos.definicion),
    transiciones: analizarTransiciones(textos.transiciones).transiciones,
  }
}

const rolesDe = (def) => ({ q0: def.q0, qaccept: def.qaccept, qreject: def.qreject })

function escribirConjunto(textos, def, campo, elementos) {
  const contenido = (etiqueta) => `${etiqueta} = {${elementos.join(', ')}}`
  const numero = def.lineas[campo]
  if (!numero) return { ...textos, definicion: agregarAlFinal(textos.definicion, contenido(ETIQUETAS[campo])) }
  const etiqueta = RE_ETIQUETA.exec(dividir(textos.definicion)[numero - 1])?.[1] ?? ETIQUETAS[campo]
  return { ...textos, definicion: reescribir(textos.definicion, numero, contenido(etiqueta)) }
}

function escribirRoles(textos, def, roles) {
  let definicion = textos.definicion
  if (def.lineas.tupla) {
    definicion = reescribir(definicion, def.lineas.tupla, `${def.nombre} = (Q, Σ, Γ, δ, ${roles.q0}, ${roles.qaccept}, ${roles.qreject})`)
  }
  for (const campo of Object.keys(ROLES)) {
    const numero = def.lineas.claves[campo]
    if (numero) definicion = reescribir(definicion, numero, `${campo} = ${roles[campo]}`)
    else if (!def.lineas.tupla && roles[campo]) definicion = agregarAlFinal(definicion, `${campo} = ${roles[campo]}`)
  }
  return { ...textos, definicion }
}

export function siguienteEstado(Q) {
  const numeros = Q.map((q) => /^q(\d+)$/.exec(q)?.[1]).filter(Boolean).map(Number)
  let n = Math.max(0, ...numeros) + 1
  while (Q.includes(`q${n}`)) n++
  return `q${n}`
}

function validarNombre(def, nombre) {
  const q = normalizarEstado(nombre.trim())
  if (!def.Q) return { error: 'Primero define Q = {…} en la configuración' }
  if (!esEstadoValido(q)) return { error: `"${nombre}" no es un nombre de estado válido` }
  if (def.Q.includes(q)) return { error: `${q} ya pertenece a Q` }
  return { q }
}

export function agregarEstado(textos, nombre) {
  const { def } = leer(textos)
  const { q, error } = validarNombre(def, nombre)
  return error ? fallo(error) : exito(escribirConjunto(textos, def, 'Q', [...def.Q, q]))
}

export function renombrarEstado(textos, viejo, nombre) {
  const { def, transiciones } = leer(textos)
  if (normalizarEstado(nombre.trim()) === viejo) return exito(textos)
  const { q, error } = validarNombre(def, nombre)
  if (error) return fallo(error)

  let resultado = escribirConjunto(textos, def, 'Q', def.Q.map((x) => (x === viejo ? q : x)))
  const roles = rolesDe(def)
  if (Object.values(roles).includes(viejo)) {
    for (const campo of Object.keys(roles)) if (roles[campo] === viejo) roles[campo] = q
    resultado = escribirRoles(resultado, def, roles)
  }
  let texto = resultado.transiciones
  for (const t of transiciones) {
    if (t.q !== viejo && t.qj !== viejo) continue
    texto = reescribir(texto, t.linea, transicionATexto({ ...t, q: t.q === viejo ? q : t.q, qj: t.qj === viejo ? q : t.qj }))
  }
  return exito({ ...resultado, transiciones: texto })
}

export function eliminarEstado(textos, q) {
  const { def, transiciones } = leer(textos)
  const rol = Object.entries(rolesDe(def)).find(([, valor]) => valor === q)?.[0]
  if (rol) return fallo(`${q} es el estado ${ROLES[rol]}; asigna ese papel a otro estado antes de eliminarlo`)
  const resultado = escribirConjunto(textos, def, 'Q', def.Q.filter((x) => x !== q))
  const lineas = transiciones.filter((t) => t.q === q || t.qj === q).map((t) => t.linea)
  return exito({ ...resultado, transiciones: quitarLineas(resultado.transiciones, lineas) })
}

export function asignarRol(textos, rol, q) {
  const { def } = leer(textos)
  if (!def.Q?.includes(q)) return fallo(`${q} no pertenece a Q`)
  const roles = rolesDe(def)
  if (rol === 'qaccept' && roles.qreject === q) return fallo(`${q} ya es el estado de rechazo y qreject ≠ qaccept`)
  if (rol === 'qreject' && roles.qaccept === q) return fallo(`${q} ya es el estado de aceptación y qreject ≠ qaccept`)
  roles[rol] = q
  return exito(escribirRoles(textos, def, roles))
}

export function guardarTransicion(textos, datos, lineaOriginal = null) {
  const { def, transiciones } = leer(textos)
  if (!def.Q || !def.Gamma) return fallo('Primero define Q y Γ en la configuración')
  const t = {
    q: normalizarEstado(datos.q),
    a: normalizarSimbolo(datos.a.trim()),
    qj: normalizarEstado(datos.qj),
    c: normalizarSimbolo(datos.c.trim()),
    mov: datos.mov,
  }
  if (!def.Q.includes(t.q) || !def.Q.includes(t.qj)) return fallo('Los estados de la transición deben pertenecer a Q')
  if (t.q === def.qaccept || t.q === def.qreject) return fallo('Los estados de parada no producen más configuraciones: no pueden tener transiciones de salida')
  if (!MOVIMIENTOS.includes(t.mov)) return fallo('El movimiento debe ser L o R')
  for (const s of [t.a, t.c]) if (!esSimboloValido(s)) return fallo(`"${s}" no es un símbolo válido: debe ser un solo carácter`)

  const choque = transiciones.find((x) => x.q === t.q && x.a === t.a && x.linea !== lineaOriginal)
  if (choque) return fallo(`δ(${t.q}, ${t.a}) ya está definida en la línea ${choque.linea}: δ debe ser una función`)

  const nuevos = [...new Set([t.a, t.c])].filter((s) => !def.Gamma.includes(s))
  const resultado = nuevos.length ? escribirConjunto(textos, def, 'Gamma', [...def.Gamma, ...nuevos]) : textos
  const texto = transicionATexto(t)
  if (lineaOriginal) return exito({ ...resultado, transiciones: reescribir(resultado.transiciones, lineaOriginal, texto) })

  const mismas = transiciones.filter((x) => x.q === t.q).map((x) => x.linea)
  const despuesDe = mismas.length ? Math.max(...mismas) : dividir(resultado.transiciones).length
  return exito({ ...resultado, transiciones: insertar(resultado.transiciones, despuesDe, texto) })
}

export function eliminarTransicion(textos, linea) {
  return exito({ ...textos, transiciones: quitarLineas(textos.transiciones, [linea]) })
}
