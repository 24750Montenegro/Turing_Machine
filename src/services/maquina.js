import { BLANCO, DERECHA, IZQUIERDA, QUIETO, conSubindice } from './notacion.js'

export const clave = (q, a) => `${q}\u0000${a}`

export const esParada = (M, q) => q === M.qaccept || q === M.qreject

export const numeroCintas = (M) => M.cintas ?? 1

export const delta = (M, q, a) => M.delta.get(clave(q, a)) ?? (numeroCintas(M) > 1 ? haciaRechazo(M, q, a) : undefined)

export const simboloLeido = ({ v }) => v[0] ?? BLANCO

export const cinta = ({ u, v }) => u + v

export const posicionCabeza = ({ u }) => u.length

// Una cinta: C = uqv. Con k cintas: C = (u₁qv₁, …, uₖqvₖ), un mismo estado y una cabeza por cinta.
export const cintasDe = (C) => C.cintas ?? [{ u: C.u, v: C.v }]

export function configuracionInicial(M, w) {
  const v = w === '' && !esParada(M, M.q0) ? BLANCO : w
  if (numeroCintas(M) === 1) return { u: '', q: M.q0, v }
  const vacia = esParada(M, M.q0) ? '' : BLANCO
  return { q: M.q0, cintas: [{ u: '', v }, ...Array.from({ length: numeroCintas(M) - 1 }, () => ({ u: '', v: vacia }))] }
}

// Reglas de "produce" sobre una cinta uaqᵢbv, donde b = v[0] y δ escribe c y mueve en la dirección mov.
function moverCinta({ u, v }, c, mov, haciaParada) {
  const resto = v.slice(1)
  if (mov === IZQUIERDA) {
    if (u === '') return { cinta: { u: '', v: c + resto }, regla: 'borde' }
    return { cinta: { u: u.slice(0, -1), v: u.slice(-1) + c + resto }, regla: 'izquierda' }
  }
  if (mov === QUIETO) return { cinta: { u, v: c + resto }, regla: 'quieta' }
  const alFinal = resto === '' && !haciaParada
  return { cinta: { u: u + c, v: alFinal ? BLANCO : resto }, regla: alFinal ? 'final' : 'derecha' }
}

// Relación "C1 produce C2" tal como se definió en clase.
export function produce(M, C) {
  if (esParada(M, C.q)) return null
  if (C.cintas) return produceEnCintas(M, C)
  const t = delta(M, C.q, simboloLeido(C))
  const { cinta: nueva, regla } = moverCinta(C, t.c, t.mov, esParada(M, t.qj))
  return { configuracion: { u: nueva.u, q: t.qj, v: nueva.v }, transicion: t, regla }
}

function produceEnCintas(M, C) {
  const t = delta(M, C.q, C.cintas.map(simboloLeido).join(''))
  const movidas = C.cintas.map((c, i) => moverCinta(c, t.escritos[i], t.movs[i], esParada(M, t.qj)))
  return { configuracion: { q: t.qj, cintas: movidas.map((m) => m.cinta) }, transicion: t, regla: movidas.map((m) => m.regla) }
}

// Con k cintas no se enumeran las |Γ|ᵏ combinaciones: una sin definir va a qreject sin cambiar nada.
function haciaRechazo(M, q, a) {
  const leidos = [...a]
  return { q, a, qj: M.qreject, c: a, mov: DERECHA.repeat(leidos.length), leidos, escritos: leidos, movs: leidos.map(() => DERECHA), implicita: true }
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
  derecha: {
    nombre: 'Movimiento hacia la derecha',
    forma: 'uaqᵢbv produce uacqⱼv si δ(qᵢ, b) = (qⱼ, c, R)',
  },
  final: {
    nombre: 'Movimiento hacia la derecha al final de la cinta',
    forma: 'uaqᵢb produce uacqⱼ⊔ si δ(qᵢ, b) = (qⱼ, c, R), pues uacqⱼ equivale a uacqⱼ⊔',
  },
  quieta: {
    nombre: 'La cabeza no se mueve (S, solo con varias cintas)',
    forma: 'uqᵢbv produce uqⱼcv en la cinta cuyo movimiento es S',
  },
}

export function configuracionATexto(C, f = conSubindice) {
  if (!C.cintas) return C.u + f(C.q) + C.v
  return `(${C.cintas.map(({ u, v }) => u + f(C.q) + v).join(', ')})`
}
