import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { separarEspecificacion } from '../src/services/parser.js'
import { verificar } from '../src/services/validador.js'
import { simular } from '../src/services/simulador.js'
import { configuracionATexto } from '../src/services/maquina.js'
import { reporteATexto } from '../src/services/exportador.js'
import { aristasDiagrama } from '../src/services/diagrama.js'
import { guardarTransicion } from '../src/services/edicion.js'

const texto = readFileSync(new URL('../ejemplos/dos-cintas-0n1n.txt', import.meta.url), 'utf8')
const conEntrada = (w) => verificar({ ...separarEspecificacion(texto), entrada: `w = ${w}` })
const traza = (sim) => sim.pasos.map((p) => configuracionATexto(p.configuracion, (q) => q))

const dosCintas = (transiciones, { Gamma = '{a, b, ⊔}', entrada = 'w = a' } = {}) =>
  verificar({ definicion: `M = (Q, Σ, Γ, δ, q1, qa, qr)\nQ = {q1, q2, qa, qr}\nΣ = {a}\nΓ = ${Gamma}\ncintas = 2`, transiciones, entrada })

test('Dos cintas: cada configuración es (u₁qv₁, u₂qv₂)', () => {
  const v = conEntrada('0011')
  assert.ok(v.valida, JSON.stringify(v.errores))
  assert.deepEqual(traza(simular(v.maquina, v.w)), [
    '(q10011, q1⊔)',
    '(q20011, $q2⊔)',
    '(0q2011, $xq2⊔)',
    '(00q211, $xxq2⊔)',
    '(00q311, $xq3x⊔)',
    '(001q31, $q3xx⊔)',
    '(0011q3⊔, q3$xx⊔)',
    '(0011⊔qaccept, $qacceptxx⊔)',
  ])
})

test('La máquina de dos cintas decide 0ⁿ1ⁿ', () => {
  const esperado = { '01': 'acepta', '000111': 'acepta', '001': 'rechaza', '011': 'rechaza', '': 'rechaza', '10': 'rechaza', '0101': 'rechaza' }
  for (const [w, resultado] of Object.entries(esperado)) {
    const v = conEntrada(w || 'ε')
    assert.equal(simular(v.maquina, v.w).resultado, resultado, `w = ${w || 'ε'}`)
  }
})

test('La aridad de δ debe coincidir con el número de cintas', () => {
  const unaCinta = verificar({
    definicion: 'M = (Q, Σ, Γ, δ, q1, qa, qr)\nQ = {q1, qa, qr}\nΣ = {a}\nΓ = {a, ⊔}',
    transiciones: 'δ(q1, a, ⊔) = (qa, a, ⊔, R, R)',
    entrada: 'w = a',
  })
  assert.ok(unaCinta.errores.some((e) => /lee 2 símbolo\(s\), pero M tiene 1 cinta\(s\) \(agrega cintas = 2/.test(e.mensaje)))

  const dos = dosCintas('δ(q1, a) = (qa, a, R)')
  assert.ok(dos.errores.some((e) => /lee 1 símbolo\(s\), pero M tiene 2 cinta\(s\)/.test(e.mensaje)))
})

test('S solo se permite con varias cintas y cintas debe ser un entero positivo', () => {
  assert.ok(dosCintas('δ(q1, a, ⊔) = (qa, a, ⊔, S, R)').valida)
  const mal = dosCintas('δ(q1, a, ⊔) = (qa, a, ⊔, X, R)')
  assert.ok(mal.errores.some((e) => /X ∉ \{L, R, S\}/.test(e.mensaje)))
  const cero = verificar({ definicion: 'M = (Q, Σ, Γ, δ, q1, qa, qr)\nQ = {q1, qa, qr}\nΣ = {a}\nΓ = {a, ⊔}\ncintas = 0', transiciones: '', entrada: '' })
  assert.ok(cero.errores.some((e) => /número de cintas válido/.test(e.mensaje)))
})

test('Con varias cintas se detectan los dos tipos de ciclo', () => {
  const repite = dosCintas('δ(q1, a, ⊔) = (q2, a, ⊔, R, S)\nδ(q2, ⊔, ⊔) = (q1, ⊔, ⊔, L, S)')
  const s1 = simular(repite.maquina, repite.w)
  assert.equal(s1.resultado, 'ciclo')
  assert.equal(s1.ciclo.tipo, 'repeticion')

  const avanza = dosCintas('δ(q1, ⊔, ⊔) = (q1, a, b, R, R)', { entrada: 'w = ε' })
  const s2 = simular(avanza.maquina, avanza.w)
  assert.equal(s2.resultado, 'ciclo')
  assert.equal(s2.ciclo.tipo, 'blancos')
  assert.deepEqual(s2.ciclo.desplazamiento, [1, 1])
})

test('El reporte y el diagrama usan la notación de k cintas', () => {
  const v = conEntrada('01')
  const reporte = reporteATexto(v, simular(v.maquina, v.w), new Date(2026, 0, 1))
  assert.match(reporte, /cintas = 2/)
  assert.match(reporte, /C₁ = \(q₁01, q₁⊔\)/)
  assert.match(reporte, /δ\(q₁, 0, ⊔\) = \(q₂, 0, \$, S, R\)/)
  assert.match(reporte, /M ACEPTA w/)

  const etiquetas = aristasDiagrama(v.maquina).flatMap((a) => a.etiquetas)
  assert.ok(etiquetas.includes('0,⊔ → 0,$; S,R'))
  assert.ok(etiquetas.includes('1,x → R,L'))
})

test('Desde el diagrama se agregan transiciones de k cintas', () => {
  const textos = separarEspecificacion(texto)
  const nueva = guardarTransicion(textos, { q: 'q3', qj: 'qreject', leidos: ['0', 'x'], escritos: ['0', 'y'], movs: ['S', 'L'] })
  assert.match(nueva.textos.transiciones, /δ\(q3, 0, x\) = \(qreject, 0, y, S, L\)/)
  assert.match(nueva.textos.definicion, /Γ = \{0, 1, x, \$, ⊔, y\}/)
  assert.ok(verificar(nueva.textos).valida)

  const corta = guardarTransicion(textos, { q: 'q3', qj: 'qreject', a: '0', c: '0', mov: 'R' })
  assert.match(corta.error, /M tiene 2 cinta\(s\)/)
})
