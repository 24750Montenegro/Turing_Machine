export const BLANCO = '⊔'
export const IZQUIERDA = 'L'
export const DERECHA = 'R'
export const QUIETO = 'S'
export const MOVIMIENTOS = [IZQUIERDA, DERECHA]
export const MOVIMIENTOS_CINTAS = [IZQUIERDA, DERECHA, QUIETO]

const SUBINDICES = '₀₁₂₃₄₅₆₇₈₉'
const SUPERINDICES = '⁰¹²³⁴⁵⁶⁷⁸⁹'

export const normalizarSimbolo = (s) => (s === '_' ? BLANCO : s)

export const normalizarEstado = (q) => q.replace(/[₀-₉]/g, (d) => String(SUBINDICES.indexOf(d)))

export const subindice = (n) => [...String(n)].map((d) => SUBINDICES[d] ?? d).join('')

export const superindice = (n) => [...String(n)].map((d) => SUPERINDICES[d] ?? d).join('')

export function conSubindice(nombre) {
  const m = /^(\D+)(\d+)$/.exec(nombre)
  return m ? m[1] + subindice(m[2]) : nombre
}

export function partesEstado(q) {
  const m = /^(q)(.+)$/.exec(q) ?? /^(\D+)(\d+)$/.exec(q)
  return m ? { base: m[1], sub: m[2] } : { base: q, sub: '' }
}

export const conjunto = (elementos, f = String) => `{${elementos.map(f).join(', ')}}`

// Con una cinta, a, c y mov son un símbolo cada uno; con k cintas, leidos, escritos y movs tienen k elementos.
export const piezas = (t) => ({ leidos: t.leidos ?? [t.a], escritos: t.escritos ?? [t.c], movs: t.movs ?? [t.mov] })

export function transicionATexto(t, f = String) {
  const { leidos, escritos, movs } = piezas(t)
  return `δ(${[f(t.q), ...leidos].join(', ')}) = (${[f(t.qj), ...escritos, ...movs].join(', ')})`
}

export function firmaDelta(k = 1) {
  const p = k === 1 ? '' : superindice(k)
  return `δ: Q × Γ${p} → Q × Γ${p} × {${k === 1 ? 'L, R' : 'L, R, S'}}${p}`
}
