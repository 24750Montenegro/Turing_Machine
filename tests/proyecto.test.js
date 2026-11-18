import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { separarEspecificacion } from '../src/services/parser.js'
import { verificar } from '../src/services/validador.js'
import { simular, simularCadenas } from '../src/services/simulador.js'
import { configuracionATexto, configuracionesAlineadas } from '../src/services/maquina.js'
import { cintaFinal, reporteATexto } from '../src/services/exportador.js'
import { especificacionAYaml, yamlAEspecificacion } from '../src/services/yaml.js'
import { asignarRol, cambiarCache, guardarTransicion, renombrarEstado } from '../src/services/edicion.js'

const plano = (q) => q
const desdeYaml = (archivo) => {
  const { texto, errores } = yamlAEspecificacion(readFileSync(new URL(`../ejemplos/${archivo}`, import.meta.url), 'utf8'), archivo)
  assert.deepEqual(errores, [])
  return separarEspecificacion(texto)
}
const cargarYaml = (archivo) => verificar(desdeYaml(archivo))

function luhn(w) {
  let suma = 0
  ;[...w].reverse().forEach((c, i) => {
    let d = Number(c)
    if (i % 2) d = d * 2 > 9 ? d * 2 - 9 : d * 2
    suma += d
  })
  return suma % 10 === 0
}

test('La MT de Luhn acepta las tarjetas válidas de 13 a 19 dígitos', () => {
  const v = cargarYaml('reconocedora-luhn.yaml')
  assert.equal(v.valida, true)
  assert.equal(v.maquina.cache, true)
  assert.deepEqual(simularCadenas(v.maquina, v.cadenas).map((s) => s.resultado), ['acepta', 'acepta', 'rechaza', 'rechaza'])

  let semilla = 7
  const azar = (n) => (semilla = (semilla * 1103515245 + 12345) % 2 ** 31) % n
  for (let i = 0; i < 400; i++) {
    const w = Array.from({ length: 10 + azar(12) }, () => azar(10)).join('')
    const esperado = luhn(w) && w.length >= 13 && w.length <= 19 ? 'acepta' : 'rechaza'
    assert.equal(simular(v.maquina, w).resultado, esperado, w)
  }
})

test('La reconocedora w#w usa la caché y se detiene sin transición al rechazar', () => {
  const v = cargarYaml('reconocedora-w-numeral-w.yaml')
  assert.equal(v.valida, true)
  const sims = simularCadenas(v.maquina, v.cadenas)
  assert.deepEqual(sims.map((s) => s.resultado), ['acepta', 'acepta', 'rechaza', 'rechaza'])
  assert.equal(sims[2].sinTransicion, true)
  assert.equal(configuracionATexto(sims[0].pasos[1].configuracion, plano), 'X[q1, a]ab#aab')
  for (const [w, r] of [['#', 'acepta'], ['ab#ab', 'acepta'], ['', 'rechaza'], ['a#', 'rechaza'], ['ab#abb', 'rechaza']]) {
    assert.equal(simular(v.maquina, w).resultado, r, w)
  }
})

test('La alteradora invierte la cadena usando la cinta infinita a la izquierda', () => {
  const v = cargarYaml('alteradora-invertir.yaml')
  assert.equal(v.valida, true)
  const sims = simularCadenas(v.maquina, v.cadenas)
  assert.ok(sims.every((s) => s.resultado === 'acepta'))
  assert.deepEqual(sims.map(cintaFinal), v.cadenas.map(({ w }) => [...w].reverse().join('')))
  const s = simular(v.maquina, 'ab')
  const reglas = s.pasos.map((p) => p.regla)
  assert.ok(reglas.includes('extension'))
  const alineadas = configuracionesAlineadas(s)
  const ancho = (C) => C.u.length + C.v.length
  assert.ok(alineadas.every((C, i) => i === 0 || ancho(C) >= ancho(alineadas[i - 1])))
})

test('Convierte el YAML del enunciado: null es blanco y Γ incluye a Σ', () => {
  const yaml = `---
q_states:
  q_list:
  - '0'
  - '1'
  initial: '0'
  final: '1'
alphabet:
- a
- b
tape_alphabet:
- "#"
- X
-
delta:
- params:
    initial_state: '0'
    mem_cache_value:
    tape_input: a
  output:
    final_state: '1'
    mem_cache_value: a
    tape_output:
    tape_displacement: R
simulation_strings:
- aab#aab
- 0011
`
  const { texto, errores } = yamlAEspecificacion(yaml, 'ejemplo.yaml')
  assert.deepEqual(errores, [])
  assert.match(texto, /M = \(Q, Σ, Γ, δ, 0, ⊔, F\)/)
  assert.match(texto, /Γ = \{a, b, #, X, ⊔\}/)
  assert.match(texto, /caché = sí/)
  assert.match(texto, /δ\(\[0, ⊔\], a\) = \(\[1, a\], ⊔, R\)/)
  assert.match(texto, /w = 0011/)
  const v = verificar(separarEspecificacion(texto))
  assert.equal(v.errores.length, 1) // 0011 no está en Γ
  assert.ok(v.advertencias.some((a) => /\{#\} de w = aab#aab no pertenecen a Σ/.test(a.mensaje)))

  assert.match(yamlAEspecificacion('a: [').errores[0], /no es válido/)
  assert.ok(yamlAEspecificacion('q_states: {}\n').errores.length >= 3)
})

test('Guardar en YAML y volver a cargar conserva la máquina', () => {
  const textos = desdeYaml('alteradora-invertir.yaml')
  const { texto } = especificacionAYaml(textos)
  const otra = separarEspecificacion(yamlAEspecificacion(texto, 'x.yaml').texto)
  assert.equal(otra.transiciones, textos.transiciones)
  assert.equal(otra.entrada, textos.entrada)
  assert.match(especificacionAYaml({ definicion: 'M = (Q, Σ, Γ, δ, q1, qa, qr)', transiciones: '', entrada: '' }).error, /⊔, F/)
})

test('El interruptor de caché escribe la línea y las transiciones sin [q, m] usan ⊔', () => {
  const base = {
    definicion: 'M = (Q, Σ, Γ, δ, q1, qa, qr)\nQ = {q1, qa, qr}\nΣ = {a}\nΓ = {a, ⊔}',
    transiciones: 'δ(q1, a) = (q1, a, R)\nδ(q1, ⊔) = (qa, ⊔, R)',
    entrada: 'w = aa',
  }
  const con = cambiarCache(base, true).textos
  assert.equal(con.definicion.split('\n').at(-1), 'caché = sí')
  const v = verificar(con)
  assert.equal(v.valida, true)
  assert.equal(configuracionATexto(simular(v.maquina, 'aa').pasos.at(-1).configuracion, plano), 'aa⊔[qa, ⊔]')
  assert.equal(cambiarCache(con, false).textos.definicion, base.definicion)

  const sinCache = verificar({ ...base, transiciones: 'δ([q1, ⊔], a) = ([q1, a], a, R)' })
  assert.ok(sinCache.errores.some((e) => /caché/.test(e.mensaje)))

  const implicita = verificar({ ...con, transiciones: 'δ([q1, ⊔], a) = ([q1, a], a, R)' })
  const s = simular(implicita.maquina, 'aa')
  assert.equal(s.resultado, 'rechaza')
  assert.equal(s.pasos.at(-1).transicion.implicita, true)
})

test('Modelo (q₀, ⊔, F): movimiento S, cinta infinita y verificación de F', () => {
  const v = verificar({
    definicion: 'M = (Q, Σ, Γ, δ, p, ⊔, F)\nQ = {p, r, f}\nΣ = {a}\nΓ = {a, ⊔}\nF = {f}',
    transiciones: 'δ(p, a) = (r, a, L)\nδ(r, ⊔) = (r, a, S)\nδ(r, a) = (f, a, R)',
    entrada: 'w = a',
  })
  assert.equal(v.valida, true)
  const s = simular(v.maquina, 'a')
  assert.deepEqual(s.pasos.map((p) => configuracionATexto(p.configuracion, plano)), ['pa', 'r⊔a', 'raa', 'afa'])
  assert.equal(s.resultado, 'acepta')

  const mal = verificar({ definicion: 'M = (Q, Σ, Γ, δ, p, ⊔, F)\nQ = {p}\nΣ = {a}\nΓ = {a, ⊔}\nF = {z}\nqaccept = p', transiciones: '', entrada: '' })
  const fallidas = mal.comprobaciones.filter((c) => c.estado === 'error').map((c) => c.regla)
  assert.deepEqual(fallidas, ['F ⊆ Q', 'Los estados finales se definen con F'])
  assert.match(verificar({ definicion: 'cintas = 2', transiciones: '', entrada: '' }).errores[0].mensaje, /una sola cinta/)
})

test('Varias cadenas: una por línea y un reporte con resumen', () => {
  const v = cargarYaml('reconocedora-w-numeral-w.yaml')
  assert.equal(v.cadenas.length, 4)
  const texto = reporteATexto(v, simularCadenas(v.maquina, v.cadenas))
  assert.match(texto, /4\. Resumen/)
  assert.match(texto, /w₁ = aab#aab\s+M ACEPTA w/)
  assert.match(texto, /w₄ = abab#abba\s+M RECHAZA w/)
  assert.match(texto, /8\. Simulación de w₄ = abab#abba/)
  assert.match(texto, /no está definida: M se detiene/)
})

test('Editar el diagrama con caché y con F', () => {
  const textos = desdeYaml('reconocedora-w-numeral-w.yaml')
  const nueva = guardarTransicion(textos, { q: 'q4', m: 'a', a: 'a', qj: 'q4', n: 'b', c: 'a', mov: 'S' })
  assert.match(nueva.textos.transiciones, /δ\(\[q4, a\], a\) = \(\[q4, b\], a, S\)/)
  assert.match(guardarTransicion(textos, { q: 'q0', m: '⊔', a: 'a', qj: 'q0', n: '⊔', c: 'a', mov: 'R' }).error, /ya está definida/)
  assert.match(asignarRol(textos, 'final', 'q4').textos.definicion, /F = \{q6, q4\}/)
  const renombrado = renombrarEstado(textos, 'q6', 'fin').textos
  assert.match(renombrado.definicion, /F = \{fin\}/)
  assert.equal(verificar(renombrado).valida, true)
})
