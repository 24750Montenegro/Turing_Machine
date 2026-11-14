import { BLANCO, IZQUIERDA, conSubindice } from './notacion.js'

export const clave = (q, a) => `${q}\u0000${a}`

export const esParada = (M, q) => q === M.qaccept || q === M.qreject

export const delta = (M, q, a) => M.delta.get(clave(q, a))

export const simboloLeido = ({ v }) => v[0] ?? BLANCO

export const cinta = ({ u, v }) => u + v

export const posicionCabeza = ({ u }) => u.length

export function configuracionInicial(M, w) {
  return { u: '', q: M.q0, v: w === '' && !esParada(M, M.q0) ? BLANCO : w }
}

// Relación "C1 produce C2" tal como se definió en clase.
export function produce(M, C) {
  if (esParada(M, C.q)) return null
  const t = delta(M, C.q, simboloLeido(C))
  const { u, v } = C
  const resto = v.slice(1)

  if (t.mov === IZQUIERDA) {
    if (u === '') {
      return { configuracion: { u: '', q: t.qj, v: t.c + resto }, transicion: t, regla: 'borde' }
    }
    return { configuracion: { u: u.slice(0, -1), q: t.qj, v: u.slice(-1) + t.c + resto }, transicion: t, regla: 'izquierda' }
  }

  const alFinal = resto === '' && !esParada(M, t.qj)
  return {
    configuracion: { u: u + t.c, q: t.qj, v: alFinal ? BLANCO : resto },
    transicion: t,
    regla: alFinal ? 'final' : 'derecha',
  }
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
}

export const configuracionATexto = ({ u, q, v }, f = conSubindice) => u + f(q) + v
