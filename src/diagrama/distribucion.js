import { esParada } from '../services/maquina.js'

export const SEPARACION_X = 220
export const SEPARACION_Y = 175

export function distribuir(M, aristas) {
  const normales = M.Q.filter((q) => !esParada(M, q))
  const predecesores = (q) => aristas.filter((a) => a.hacia === q && a.desde !== q).map((a) => a.desde)

  const nivel = new Map([[M.q0, 0]])
  const cola = [M.q0]
  while (cola.length) {
    const q = cola.shift()
    for (const a of aristas) {
      if (a.desde === q && !nivel.has(a.hacia) && !esParada(M, a.hacia)) {
        nivel.set(a.hacia, nivel.get(q) + 1)
        cola.push(a.hacia)
      }
    }
  }
  const sueltos = normales.filter((q) => !nivel.has(q))
  const ultimo = Math.max(0, ...nivel.values()) + 1
  for (const q of sueltos) nivel.set(q, ultimo)

  const columnas = []
  for (const q of normales) (columnas[nivel.get(q)] ??= []).push(q)

  const pos = {}
  const promedio = (xs, f) => (xs.length ? xs.reduce((s, x) => s + f(x), 0) / xs.length : 0)
  columnas.forEach((qs, n) => {
    if (!qs) return
    const deseado = new Map(qs.map((q) => [q, promedio(predecesores(q).filter((p) => pos[p]), (p) => pos[p].y)]))
    const orden = [...qs].sort((a, b) => deseado.get(a) - deseado.get(b))
    const ys = []
    orden.forEach((q, i) => ys.push(i === 0 ? deseado.get(q) : Math.max(deseado.get(q), ys[i - 1] + SEPARACION_Y)))
    const ajuste = promedio(orden, (q) => deseado.get(q)) - promedio(ys, (y) => y)
    orden.forEach((q, i) => (pos[q] = { x: n * SEPARACION_X, y: ys[i] + ajuste }))
  })

  const ys = Object.values(pos).map((p) => p.y)
  const fondo = (ys.length ? Math.max(...ys) : 0) + SEPARACION_Y * 1.15
  const centro = ((columnas.length - 1) * SEPARACION_X) / 2
  const parada = [M.qaccept, M.qreject]
    .map((q) => {
      const previos = predecesores(q).filter((p) => pos[p])
      return { q, x: previos.length ? promedio(previos, (p) => pos[p].x) : centro }
    })
    .sort((a, b) => a.x - b.x)
  const [a, b] = parada
  if (b.x - a.x < SEPARACION_X) {
    const medio = (a.x + b.x) / 2
    a.x = medio - SEPARACION_X / 2
    b.x = medio + SEPARACION_X / 2
  }
  for (const { q, x } of parada) pos[q] = { x, y: fondo }
  return pos
}
