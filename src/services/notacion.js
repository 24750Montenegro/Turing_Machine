export const BLANCO = '⊔'
export const IZQUIERDA = 'L'
export const DERECHA = 'R'
export const QUIETO = 'S'

// sipser: (q₀, qaccept, qreject), cinta con extremo izquierdo, L/R.
// hopcroft: (q₀, ⊔, F), cinta infinita, L/R/S; acepta en F y rechaza si no hay transición.
export const MODELOS = { sipser: 'sipser', hopcroft: 'hopcroft' }

export const movimientosDe = (modelo) => (modelo === MODELOS.hopcroft ? [IZQUIERDA, DERECHA, QUIETO] : [IZQUIERDA, DERECHA])

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

export const conCache = (t) => t.m !== undefined

export const estadoATexto = (q, m, f = String) => (m === undefined ? f(q) : `[${f(q)}, ${m}]`)

export function transicionATexto(t, f = String) {
  return `δ(${estadoATexto(t.q, t.m, f)}, ${t.a}) = (${estadoATexto(t.qj, t.n, f)}, ${t.c}, ${t.mov})`
}

export function firmaDelta({ modelo = MODELOS.sipser, cache = false } = {}) {
  const estados = cache ? '(Q × Γ)' : 'Q'
  return `δ: ${estados} × Γ → ${estados} × Γ × {${movimientosDe(modelo).join(', ')}}`
}

export function tuplaATexto(M, f = String) {
  return M.modelo === MODELOS.hopcroft
    ? `${f(M.nombre)} = (Q, Σ, Γ, δ, ${f(M.q0)}, ${BLANCO}, F)`
    : `${f(M.nombre)} = (Q, Σ, Γ, δ, ${f(M.q0)}, ${f(M.qaccept)}, ${f(M.qreject)})`
}
