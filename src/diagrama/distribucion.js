import { esParada } from '../services/maquina.js'

export const SEPARACION_X = 220
export const SEPARACION_Y = 175
const MAX_COLUMNAS = 10
const POR_FILA = 7

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

  let anchoColumnas = columnas.length
  if (columnas.length > MAX_COLUMNAS) {
    const yS = Object.values(pos).map((p) => p.y)
    const altoFila = Math.max(...yS) - Math.min(...yS) + SEPARACION_Y * 1.4
    anchoColumnas = POR_FILA
    columnas.forEach((qs, n) => {
      const fila = Math.floor(n / POR_FILA)
      const lugar = fila % 2 ? POR_FILA - 1 - (n % POR_FILA) : n % POR_FILA
      for (const q of qs ?? []) pos[q] = { x: lugar * SEPARACION_X, y: pos[q].y + fila * altoFila }
    })
  }

  const ys = Object.values(pos).map((p) => p.y)
  const fondo = (ys.length ? Math.max(...ys) : 0) + SEPARACION_Y * 1.15
  const centro = ((anchoColumnas - 1) * SEPARACION_X) / 2
  const parada = M.Q.filter((q) => esParada(M, q))
    .map((q) => {
      const previos = predecesores(q).filter((p) => pos[p])
      return { q, x: previos.length ? promedio(previos, (p) => pos[p].x) : centro }
    })
    .sort((a, b) => a.x - b.x)
  for (let i = 1; i < parada.length; i++) parada[i].x = Math.max(parada[i].x, parada[i - 1].x + SEPARACION_X)
  if (parada.length) {
    const corrimiento = promedio(parada, (p) => p.x) - (parada[0].x + parada.at(-1).x) / 2
    for (const p of parada) p.x += corrimiento
  }
  for (const { q, x } of parada) pos[q] = { x, y: fondo }
  return pos
}
