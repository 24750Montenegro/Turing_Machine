export const BLANCO = '⊔'
export const IZQUIERDA = 'L'
export const DERECHA = 'R'
export const MOVIMIENTOS = [IZQUIERDA, DERECHA]

const SUBINDICES = '₀₁₂₃₄₅₆₇₈₉'

export const normalizarSimbolo = (s) => (s === '_' ? BLANCO : s)

export const normalizarEstado = (q) => q.replace(/[₀-₉]/g, (d) => String(SUBINDICES.indexOf(d)))

export const subindice = (n) => [...String(n)].map((d) => SUBINDICES[d] ?? d).join('')

export function conSubindice(nombre) {
  const m = /^(\D+)(\d+)$/.exec(nombre)
  return m ? m[1] + subindice(m[2]) : nombre
}

export function partesEstado(q) {
  const m = /^(q)(.+)$/.exec(q) ?? /^(\D+)(\d+)$/.exec(q)
  return m ? { base: m[1], sub: m[2] } : { base: q, sub: '' }
}

export const conjunto = (elementos, f = String) => `{${elementos.map(f).join(', ')}}`

export const transicionATexto = (t, f = String) =>
  `δ(${f(t.q)}, ${t.a}) = (${f(t.qj)}, ${t.c}, ${t.mov})`
