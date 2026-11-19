import { parse } from 'yaml'
import { BLANCO, MODELOS, conjunto, transicionATexto } from './notacion.js'
import { ENCABEZADOS, analizarDefinicion, analizarEntrada, analizarTransiciones } from './parser.js'

// Esquema failsafe: '0', 0011 o yes se quedan como texto.

export const esYaml = (nombre = '') => /\.ya?ml$/i.test(nombre)

const NULOS = new Set(['', '~', 'null', 'Null', 'NULL', 'None', 'none'])
const esNulo = (x) => x === undefined || x === null || NULOS.has(String(x).trim())
const simbolo = (x) => (esNulo(x) ? BLANCO : String(x).trim())
const lista = (x) => (Array.isArray(x) ? x : esNulo(x) ? [] : [x])
const unicos = (xs) => [...new Set(xs)]

export function yamlAEspecificacion(contenido, nombre = 'archivo.yaml') {
  let doc
  try {
    doc = parse(contenido, { schema: 'failsafe' })
  } catch (e) {
    return { errores: [`El YAML no es válido: ${e.message.split('\n')[0]}`] }
  }
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return { errores: ['El YAML debe ser un objeto con q_states, alphabet, tape_alphabet, delta y simulation_strings'] }

  const errores = []
  const estados = doc.q_states ?? {}
  const Q = lista(estados.q_list).filter((q) => !esNulo(q)).map((q) => String(q).trim())
  const q0 = esNulo(estados.initial) ? null : String(estados.initial).trim()
  const F = lista(estados.final).filter((q) => !esNulo(q)).map((q) => String(q).trim())
  if (!Q.length) errores.push('Falta q_states.q_list con la lista de estados')
  if (!q0) errores.push('Falta q_states.initial con el estado inicial')
  if (!F.length) errores.push('Falta q_states.final con el estado (o la lista de estados) de aceptación')

  const Sigma = unicos(lista(doc.alphabet).filter((s) => !esNulo(s)).map(simbolo))
  const Gamma = unicos([...Sigma, ...lista(doc.tape_alphabet).map(simbolo), BLANCO])
  if (!Sigma.length) errores.push('Falta alphabet con los símbolos de entrada')

  const transiciones = []
  lista(doc.delta).forEach((d, i) => {
    const p = d?.params ?? {}
    const o = d?.output ?? {}
    const donde = `delta[${i + 1}]`
    if (esNulo(p.initial_state) || esNulo(o.final_state)) {
      errores.push(`${donde}: faltan params.initial_state u output.final_state`)
      return
    }
    if (esNulo(o.tape_displacement)) {
      errores.push(`${donde}: falta output.tape_displacement (L, R o S)`)
      return
    }
    transiciones.push({
      q: String(p.initial_state).trim(),
      m: simbolo(p.mem_cache_value),
      a: simbolo(p.tape_input),
      qj: String(o.final_state).trim(),
      n: simbolo(o.mem_cache_value),
      c: simbolo(o.tape_output),
      mov: String(o.tape_displacement).trim().toUpperCase(),
      conCache: !esNulo(p.mem_cache_value) || !esNulo(o.mem_cache_value),
    })
  })
  if (!transiciones.length && !errores.length) errores.push('Falta delta con la lista de transiciones')

  const cadenas = lista(doc.simulation_strings).map((w) => (esNulo(w) ? '' : String(w).replace(/\s+/g, '')))
  if (errores.length) return { errores }

  const cache = transiciones.some((t) => t.conCache)
  const texto = [
    `// Convertido desde ${nombre}`,
    ENCABEZADOS.definicion,
    `M = (Q, Σ, Γ, δ, ${q0}, ${BLANCO}, F)`,
    `Q = ${conjunto(Q)}`,
    `Σ = ${conjunto(Sigma)}`,
    `Γ = ${conjunto(Gamma)}`,
    `F = ${conjunto(F)}`,
    ...(cache ? ['caché = sí'] : []),
    '',
    ENCABEZADOS.transiciones,
    ...transiciones.map((t) => transicionATexto(cache ? t : { ...t, m: undefined, n: undefined })),
    '',
    ENCABEZADOS.entrada,
    ...(cadenas.length ? cadenas : ['']).map((w) => `w = ${w || 'ε'}`),
  ].join('\n')
  return { texto: `${texto}\n`, errores: [], cache, cadenas: cadenas.length }
}

const comillas = (s) => `'${String(s).replace(/'/g, "''")}'`
const valor = (s) => (s === undefined || s === BLANCO ? '' : ` ${comillas(s)}`)

export function especificacionAYaml({ definicion, transiciones, entrada }) {
  const def = analizarDefinicion(definicion)
  if (def.modelo !== MODELOS.hopcroft) return { error: 'Para guardar en YAML la 7-tupla debe ser M = (Q, Σ, Γ, δ, q₀, ⊔, F)' }
  const { transiciones: ts } = analizarTransiciones(transiciones)
  const { cadenas } = analizarEntrada(entrada)
  const F = def.F ?? []
  const Sigma = def.Sigma ?? []
  const extra = (def.Gamma ?? []).filter((s) => !Sigma.includes(s))
  if (!extra.includes(BLANCO)) extra.push(BLANCO)
  const L = ['---', '# Lista de estados', 'q_states:', '  q_list:', ...(def.Q ?? []).map((q) => `  - ${comillas(q)}`)]
  L.push(`  initial: ${comillas(def.q0 ?? '')}`)
  L.push(F.length === 1 ? `  final: ${comillas(F[0])}` : ['  final:', ...F.map((q) => `  - ${comillas(q)}`)].join('\n'))
  L.push('# Alfabetos de la MT', 'alphabet:', ...Sigma.map((s) => `- ${comillas(s)}`))
  L.push('tape_alphabet:', ...extra.map((s) => (s === BLANCO ? '-' : `- ${comillas(s)}`)))
  L.push('# Función de transición', 'delta:')
  for (const t of ts) {
    L.push(
      '- params:',
      `    initial_state: ${comillas(t.q)}`,
      `    mem_cache_value:${def.cache ? valor(t.m) : ''}`,
      `    tape_input:${valor(t.a)}`,
      '  output:',
      `    final_state: ${comillas(t.qj)}`,
      `    mem_cache_value:${def.cache ? valor(t.n) : ''}`,
      `    tape_output:${valor(t.c)}`,
      `    tape_displacement: ${t.mov}`,
    )
  }
  L.push('# Cadenas a simular', 'simulation_strings:', ...cadenas.map(({ w }) => `- ${comillas(w)}`))
  return { texto: `${L.join('\n')}\n` }
}
