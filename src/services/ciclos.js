import { BLANCO, IZQUIERDA, QUIETO, piezas } from './notacion.js'
import { cintasDe, esParada } from './maquina.js'

const RE_SOLO_BLANCOS = new RegExp(`^${BLANCO}*$`)
const PASO = { [IZQUIERDA]: -1, [QUIETO]: 0 }

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

    const { movs } = piezas(paso.transicion)
    const intentos = cintasDe(anterior).map(({ u }, k) => u.length + (PASO[movs[k]] ?? 1))
    for (const r of enBlanco.values()) r.minimos = r.minimos.map((m, k) => Math.min(m, intentos[k]))

    const cintas = cintasDe(C)
    if (cintas.every(({ v }) => RE_SOLO_BLANCOS.test(v))) {
      const cabezas = cintas.map(({ u }) => u.length)
      const r = enBlanco.get(C.q)
      if (r && r.minimos.every((m, k) => m >= r.cabezas[k])) {
        const desplazamientos = cabezas.map((c, k) => c - r.cabezas[k])
        return { tipo: 'blancos', desde: r.paso, hasta: i, desplazamiento: C.cintas ? desplazamientos : desplazamientos[0] }
      }
      enBlanco.set(C.q, { paso: i, cabezas, minimos: cabezas })
    }
    return null
  }
}

const huella = (C) => [C.q, ...cintasDe(C).flatMap(({ u, v }) => [u, v])].join('\u0000')
