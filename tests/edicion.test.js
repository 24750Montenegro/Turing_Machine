import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  agregarEstado,
  asignarRol,
  eliminarEstado,
  eliminarTransicion,
  guardarTransicion,
  renombrarEstado,
  siguienteEstado,
} from '../src/services/edicion.js'
import { verificar } from '../src/services/validador.js'

const base = () => ({
  definicion: '// máquina de prueba\nM = (Q, Σ, Γ, δ, q1, qa, qr)\nQ = {q1, q2, qa, qr}\nΣ = {0}\nΓ = {0, ⊔}',
  transiciones: '// q1 avanza\nδ(q1, 0) = (q2, 0, R)   // primer paso\nδ(q2, ⊔) = (qa, ⊔, R)',
  entrada: 'w = 0',
})

test('Agrega un estado a Q conservando el resto del texto', () => {
  const { textos } = agregarEstado(base(), 'q3')
  assert.equal(textos.definicion.split('\n')[2], 'Q = {q1, q2, qa, qr, q3}')
  assert.equal(textos.definicion.split('\n')[0], '// máquina de prueba')
  assert.match(agregarEstado(base(), 'q2').error, /ya pertenece/)
  assert.match(agregarEstado(base(), 'q 9').error, /no es un nombre/)
  assert.equal(siguienteEstado(['q1', 'q2', 'qa']), 'q3')
})

test('Renombrar actualiza Q, la 7-tupla y las transiciones sin perder comentarios', () => {
  const { textos } = renombrarEstado(base(), 'q1', 'inicio')
  assert.equal(textos.definicion.split('\n')[1], 'M = (Q, Σ, Γ, δ, inicio, qa, qr)')
  assert.equal(textos.definicion.split('\n')[2], 'Q = {inicio, q2, qa, qr}')
  assert.equal(textos.transiciones.split('\n')[1], 'δ(inicio, 0) = (q2, 0, R)   // primer paso')
  assert.equal(verificar(textos).valida, true)
})

test('Eliminar un estado quita sus transiciones y protege los estados con rol', () => {
  const { textos } = eliminarEstado(base(), 'q2')
  assert.equal(textos.definicion.split('\n')[2], 'Q = {q1, qa, qr}')
  assert.equal(textos.transiciones, '// q1 avanza')
  assert.match(eliminarEstado(base(), 'qa').error, /aceptación/)
})

test('Asignar roles reescribe la 7-tupla y respeta qreject ≠ qaccept', () => {
  const { textos } = asignarRol(base(), 'q0', 'q2')
  assert.equal(textos.definicion.split('\n')[1], 'M = (Q, Σ, Γ, δ, q2, qa, qr)')
  assert.match(asignarRol(base(), 'qaccept', 'qr').error, /qreject ≠ qaccept/)
})

test('Agregar una transición la ubica junto a las de su estado y amplía Γ si hace falta', () => {
  const { textos } = guardarTransicion(base(), { q: 'q1', a: 'x', qj: 'q1', c: '_', mov: 'L' })
  assert.deepEqual(textos.transiciones.split('\n'), [
    '// q1 avanza',
    'δ(q1, 0) = (q2, 0, R)   // primer paso',
    'δ(q1, x) = (q1, ⊔, L)',
    'δ(q2, ⊔) = (qa, ⊔, R)',
  ])
  assert.equal(textos.definicion.split('\n')[4], 'Γ = {0, ⊔, x}')
  assert.equal(verificar(textos).valida, true)
})

test('Editar y eliminar transiciones mantiene δ como función', () => {
  const editada = guardarTransicion(base(), { q: 'q1', a: '0', qj: 'qr', c: '0', mov: 'R' }, 2)
  assert.equal(editada.textos.transiciones.split('\n')[1], 'δ(q1, 0) = (qr, 0, R)   // primer paso')
  assert.match(guardarTransicion(base(), { q: 'q1', a: '0', qj: 'q1', c: '0', mov: 'R' }).error, /ya está definida/)
  assert.match(guardarTransicion(base(), { q: 'qa', a: '0', qj: 'q1', c: '0', mov: 'R' }).error, /parada/)
  assert.equal(eliminarTransicion(base(), 3).textos.transiciones, '// q1 avanza\nδ(q1, 0) = (q2, 0, R)   // primer paso')
})
