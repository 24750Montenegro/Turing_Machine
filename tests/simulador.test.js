import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { separarEspecificacion } from '../src/services/parser.js'
import { verificar } from '../src/services/validador.js'
import { simular } from '../src/services/simulador.js'
import { configuracionATexto } from '../src/services/maquina.js'
import { reporteATexto } from '../src/services/exportador.js'

const cargar = (archivo) => verificar(separarEspecificacion(readFileSync(new URL(`../ejemplos/${archivo}`, import.meta.url), 'utf8')))
const plano = (q) => q
const traza = (sim) => sim.pasos.map((p) => configuracionATexto(p.configuracion, plano))

test('M2 sobre 0000 reproduce la traza de clase', () => {
  const v = cargar('m2-potencias-de-dos.txt')
  assert.equal(v.valida, true)
  const sim = simular(v.maquina, v.w)
  assert.deepEqual(traza(sim), [
    'q10000', '⊔q2000', '⊔xq300', '⊔x0q40', '⊔x0xq3⊔', '⊔x0q5x⊔', '⊔xq50x⊔',
    '⊔q5x0x⊔', 'q5⊔x0x⊔', '⊔q2x0x⊔', '⊔xq20x⊔', '⊔xxq3x⊔', '⊔xxxq3⊔', '⊔xxq5x⊔',
    '⊔xq5xx⊔', '⊔q5xxx⊔', 'q5⊔xxx⊔', '⊔q2xxx⊔', '⊔xq2xx⊔', '⊔xxq2x⊔', '⊔xxxq2⊔',
    '⊔xxx⊔qaccept',
  ])
  assert.equal(sim.resultado, 'acepta')
})

test('M2 decide potencias de dos', () => {
  const { maquina } = cargar('m2-potencias-de-dos.txt')
  for (let n = 1; n <= 17; n++) {
    const esperado = (n & (n - 1)) === 0 ? 'acepta' : 'rechaza'
    assert.equal(simular(maquina, '0'.repeat(n)).resultado, esperado, `n = ${n}`)
  }
})

test('M1 decide w#w', () => {
  const v = cargar('m1-w-numeral-w.txt')
  assert.equal(v.valida, true)
  const casos = { '01#01': 'acepta', '#': 'acepta', '1#1': 'acepta', '01#10': 'rechaza', '0#': 'rechaza', '#0': 'rechaza', '011#01': 'rechaza', '0': 'rechaza' }
  for (const [w, esperado] of Object.entries(casos)) assert.equal(simular(v.maquina, w).resultado, esperado, w)
})

test('Inciso b: aceptación, rechazo y ciclo infinito', () => {
  const acepta = cargar('inciso-b-acepta.txt')
  const rechaza = cargar('inciso-b-rechaza.txt')
  const ciclo = cargar('inciso-b-ciclo.txt')
  for (const v of [acepta, rechaza, ciclo]) {
    assert.equal(v.valida, true)
    assert.equal(v.advertencias.length, 0)
  }
  assert.equal(simular(acepta.maquina, acepta.w).resultado, 'acepta')
  assert.equal(simular(rechaza.maquina, rechaza.w).resultado, 'rechaza')
  const s = simular(ciclo.maquina, ciclo.w)
  assert.equal(s.resultado, 'ciclo')
  assert.deepEqual(s.ciclo, { tipo: 'repeticion', desde: 4, hasta: 12 })

  const M = acepta.maquina
  for (const [w, r] of [['01', 'acepta'], ['0011', 'acepta'], ['', 'rechaza'], ['0', 'rechaza'], ['011', 'rechaza'], ['0101', 'rechaza'], ['1', 'ciclo'], ['10', 'ciclo']]) {
    assert.equal(simular(M, w).resultado, r, w)
  }
})

test('Mover a la izquierda en el extremo deja la cabeza en su lugar', () => {
  const v = verificar({
    definicion: 'M = (Q, Σ, Γ, δ, q1, qa, qr)\nQ = {q1, q2, qa, qr}\nΣ = {a}\nΓ = {a, b, ⊔}',
    transiciones: 'δ(q1, a) = (q2, b, L)\nδ(q2, b) = (qa, b, R)',
    entrada: 'w = a',
  })
  assert.deepEqual(traza(simular(v.maquina, v.w)), ['q1a', 'q2b', 'bqa'])
})

test('Detecta un ciclo que avanza sobre blancos sin repetir configuraciones', () => {
  const v = verificar({
    definicion: 'M = (Q, Σ, Γ, δ, q1, qa, qr)\nQ = {q1, q2, qa, qr}\nΣ = {a}\nΓ = {a, ⊔}',
    transiciones: 'δ(q1, a) = (q1, a, R)\nδ(q1, ⊔) = (q2, a, R)\nδ(q2, ⊔) = (q1, ⊔, R)\nδ(q2, a) = (qr, a, R)',
    entrada: 'aa',
  })
  const s = simular(v.maquina, v.w)
  assert.equal(s.resultado, 'ciclo')
  assert.equal(s.ciclo.tipo, 'blancos')
  assert.equal(s.ciclo.desplazamiento, 2)
})

test('Sin detección de ciclos se llega al límite', () => {
  const v = cargar('inciso-b-ciclo.txt')
  const s = simular(v.maquina, v.w, { limite: 50, detenerEnCiclo: false })
  assert.equal(s.pasos.length, 51)
  assert.equal(s.resultado, 'ciclo')
})

test('Verifica las restricciones de la 7-tupla', () => {
  const v = verificar({
    definicion: 'M = (Q, Σ, Γ, δ, q1, q9, q9)\nQ = {q1, q2}\nΣ = {a, ⊔}\nΓ = {b}',
    transiciones: 'δ(q1, b) = (q2, b, R)\nδ(q1, b) = (q1, b, L)\nδ(q1, z) = (q2, b, S)',
    entrada: 'w = ac',
  })
  assert.equal(v.valida, false)
  const fallidas = v.comprobaciones.filter((c) => c.estado === 'error').map((c) => c.regla)
  assert.deepEqual(fallidas, ['⊔ ∉ Σ', '⊔ ∈ Γ', 'Σ ⊆ Γ', 'qaccept ∈ Q', 'qreject ∈ Q', 'qreject ≠ qaccept', 'w ∈ Σ*'])
})

test('Verifica δ: dominio, codominio y determinismo', () => {
  const v = verificar({
    definicion: 'M = (Q, Σ, Γ, δ, q1, qa, qr)\nQ = {q1, qa, qr}\nΣ = {a}\nΓ = {a, ⊔}',
    transiciones: 'δ(q1, a) = (qa, a, R)\nδ(q1, a) = (qr, a, R)\nδ(q1, z) = (q7, a, S)',
    entrada: 'a',
  })
  const fallidas = v.comprobaciones.filter((c) => c.estado === 'error').map((c) => c.regla)
  assert.deepEqual(fallidas, ['δ: Q × Γ → Q × Γ × {L, R}', 'δ es una función: a lo sumo una imagen por cada par (q, a)'])
  assert.ok(v.errores.some((e) => e.linea === 3 && /z ∉ Γ, q7 ∉ Q, S ∉ \{L, R\}/.test(e.mensaje)))
})

test('Pares sin definir se completan hacia qreject con advertencia', () => {
  const v = verificar({
    definicion: 'M = (Q, Σ, Γ, δ, q1, qa, qr)\nQ = {q1, qa, qr}\nΣ = {a}\nΓ = {a, ⊔}',
    transiciones: 'δ(q1, a) = (qa, a, R)',
    entrada: '',
  })
  assert.equal(v.valida, true)
  assert.equal(v.maquina.implicitas.length, 1)
  const s = simular(v.maquina, v.w)
  assert.equal(s.resultado, 'rechaza')
  assert.equal(s.pasos[1].transicion.implicita, true)
})

test('Separa un archivo completo en sus tres secciones', () => {
  const partes = separarEspecificacion('// encabezado\nQ = {q1}\n\n// delta\nδ(q1, a) = (q1, a, R)\nw = aa')
  assert.equal(partes.definicion, '// encabezado\nQ = {q1}')
  assert.equal(partes.transiciones, '// delta\nδ(q1, a) = (q1, a, R)')
  assert.equal(partes.entrada, 'w = aa')
})

test('El reporte incluye las configuraciones en notación de clase', () => {
  const v = cargar('m2-potencias-de-dos.txt')
  const texto = reporteATexto(v, simular(v.maquina, v.w))
  assert.match(texto, /C₁\s+= q₁0000/)
  assert.match(texto, /C₂₂ = ⊔xxx⊔qaccept/)
  assert.match(texto, /M ACEPTA w/)
})
