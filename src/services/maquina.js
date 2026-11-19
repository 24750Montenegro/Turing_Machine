import { BLANCO, DERECHA, IZQUIERDA, MODELOS, QUIETO, conSubindice, estadoATexto } from './notacion.js'

export const clave = (q, a, m) => (m === undefined ? `${q}\u0000${a}` : `${q}\u0000${m}\u0000${a}`)

export const esHopcroft = (M) => M.modelo === MODELOS.hopcroft

export const esAceptacion = (M, q) => M.F.includes(q)

export const esRechazo = (M, q) => M.qreject != null && q === M.qreject

export const esParada = (M, q) => esAceptacion(M, q) || esRechazo(M, q)

// Sipser con caché: lo no definido va a qreject. Hopcroft: sin transición M se detiene.
export function delta(M, q, a, m) {
  const t = M.delta.get(clave(q, a, M.cache ? m ?? BLANCO : undefined))
  if (t || esHopcroft(M) || !M.cache) return t
  return { q, m, a, qj: M.qreject, n: m, c: a, mov: DERECHA, implicita: true }
}

export const simboloLeido = ({ v }) => v[0] ?? BLANCO

export const cinta = ({ u, v }) => u + v

export const posicionCabeza = ({ u }) => u.length

export const contenidoCinta = (C) => cinta(C).replace(new RegExp(`^${BLANCO}+|${BLANCO}+$`, 'g'), '')

export function configuracionInicial(M, w) {
  const v = w === '' && !esParada(M, M.q0) ? BLANCO : w
  return M.cache ? { u: '', q: M.q0, m: BLANCO, v } : { u: '', q: M.q0, v }
}

function moverCinta({ u, v }, c, mov, haciaParada, infinita) {
  const resto = v.slice(1)
  if (mov === IZQUIERDA) {
    if (u === '') return infinita ? { u: '', v: BLANCO + c + resto, regla: 'extension' } : { u: '', v: c + resto, regla: 'borde' }
    return { u: u.slice(0, -1), v: u.slice(-1) + c + resto, regla: 'izquierda' }
  }
  if (mov === QUIETO) return { u, v: c + resto, regla: 'quieta' }
  const alFinal = resto === '' && !haciaParada
  return { u: u + c, v: alFinal ? BLANCO : resto, regla: alFinal ? 'final' : 'derecha' }
}

// null si C es de parada o no hay transición.
export function produce(M, C) {
  if (esParada(M, C.q)) return null
  const t = delta(M, C.q, simboloLeido(C), C.m)
  if (!t) return null
  const { u, v, regla } = moverCinta(C, t.c, t.mov, esParada(M, t.qj), esHopcroft(M))
  const configuracion = M.cache ? { u, q: t.qj, m: t.n ?? BLANCO, v } : { u, q: t.qj, v }
  return { configuracion, transicion: t, regla }
}

export const REGLAS = {
  izquierda: {
    nombre: 'Movimiento hacia la izquierda',
    forma: 'uaqᵢbv produce uqⱼacv si δ(qᵢ, b) = (qⱼ, c, L)',
  },
  borde: {
    nombre: 'Extremo izquierdo de la cinta',
    forma: 'qᵢbv produce qⱼcv si δ(qᵢ, b) = (qⱼ, c, L)',
  },
  extension: {
    nombre: 'Movimiento a la izquierda del inicio (cinta infinita a ambos lados)',
    forma: 'qᵢbv produce qⱼ⊔cv si δ(qᵢ, b) = (qⱼ, c, L)',
  },
  derecha: {
    nombre: 'Movimiento hacia la derecha',
    forma: 'uaqᵢbv produce uacqⱼv si δ(qᵢ, b) = (qⱼ, c, R)',
  },
  final: {
    nombre: 'Movimiento hacia la derecha al final de la cinta',
    forma: 'uaqᵢb produce uacqⱼ⊔ si δ(qᵢ, b) = (qⱼ, c, R), pues uacqⱼ equivale a uacqⱼ⊔',
  },
  quieta: {
    nombre: 'La cabeza no se mueve',
    forma: 'uqᵢbv produce uqⱼcv si δ(qᵢ, b) = (qⱼ, c, S)',
  },
}

// Rellena con ⊔ a la izquierda para que cada celda conserve su índice aunque la cinta crezca.
export function configuracionesAlineadas(sim) {
  const extensiones = []
  let n = 0
  for (const p of sim.pasos) extensiones.push((n += p.regla === 'extension' ? 1 : 0))
  return sim.pasos.map((p, i) => {
    const relleno = BLANCO.repeat(n - extensiones[i])
    return relleno ? { ...p.configuracion, u: relleno + p.configuracion.u } : p.configuracion
  })
}

export function configuracionATexto(C, f = conSubindice) {
  return C.u + estadoATexto(C.q, C.m, f) + C.v
}
