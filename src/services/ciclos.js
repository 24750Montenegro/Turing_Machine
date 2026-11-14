import { BLANCO, IZQUIERDA } from './notacion.js'
import { esParada } from './maquina.js'

const RE_SOLO_BLANCOS = new RegExp(`^${BLANCO}*$`)

// Observa la secuencia de configuraciones ya producida; no forma parte de M ni de su cinta.
export function crearDetectorCiclos(M, inicial) {
  const vistas = new Map([[huella(inicial), 0]])
  const enBlanco = new Map()

  return function observar(anterior, paso, i) {
    const C = paso.configuracion
    if (esParada(M, C.q)) return null

    const h = huella(C)
    if (vistas.has(h)) return { tipo: 'repeticion', desde: vistas.get(h), hasta: i }
    vistas.set(h, i)

    const intento = anterior.u.length + (paso.transicion.mov === IZQUIERDA ? -1 : 1)
    for (const r of enBlanco.values()) r.minimo = Math.min(r.minimo, intento)

    if (RE_SOLO_BLANCOS.test(C.v)) {
      const cabeza = C.u.length
      const r = enBlanco.get(C.q)
      if (r && r.minimo >= r.cabeza) {
        return { tipo: 'blancos', desde: r.paso, hasta: i, desplazamiento: cabeza - r.cabeza }
      }
      enBlanco.set(C.q, { paso: i, cabeza, minimo: cabeza })
    }
    return null
  }
}

const huella = ({ u, q, v }) => `${u}\u0000${q}\u0000${v}`
