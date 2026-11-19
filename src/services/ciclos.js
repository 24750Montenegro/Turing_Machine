import { BLANCO, IZQUIERDA, QUIETO } from './notacion.js'
import { esParada } from './maquina.js'

const RE_SOLO_BLANCOS = new RegExp(`^${BLANCO}*$`)
const PASO = { [IZQUIERDA]: -1, [QUIETO]: 0 }

export function crearDetectorCiclos(M, inicial) {
  const vistas = new Map([[huella(inicial), 0]])
  const enBlanco = new Map()

  return function observar(anterior, paso, i) {
    const C = paso.configuracion
    if (esParada(M, C.q)) return null

    const h = huella(C)
    if (vistas.has(h)) return { tipo: 'repeticion', desde: vistas.get(h), hasta: i }
    vistas.set(h, i)

    // Si la cinta crece a la izquierda el intento es −1 e invalida los registros previos.
    const intento = anterior.u.length + (PASO[paso.transicion.mov] ?? 1)
    for (const r of enBlanco.values()) r.minimo = Math.min(r.minimo, intento)

    if (RE_SOLO_BLANCOS.test(C.v)) {
      const estado = `${C.q}\u0000${C.m ?? ''}`
      const cabeza = C.u.length
      const r = enBlanco.get(estado)
      if (r && r.minimo >= r.cabeza) return { tipo: 'blancos', desde: r.paso, hasta: i, desplazamiento: cabeza - r.cabeza }
      enBlanco.set(estado, { paso: i, cabeza, minimo: cabeza })
    }
    return null
  }
}

const huella = (C) => [C.q, C.m ?? '', C.u, C.v].join('\u0000')
