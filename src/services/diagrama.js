export function aristasDiagrama(M, { incluirImplicitas = false } = {}) {
  const fuente = incluirImplicitas ? [...M.transiciones, ...M.implicitas] : M.transiciones
  const porArista = new Map()
  for (const t of fuente) {
    const k = `${t.q}\u0000${t.qj}`
    if (!porArista.has(k)) porArista.set(k, { desde: t.q, hacia: t.qj, transiciones: [] })
    porArista.get(k).transiciones.push(t)
  }
  const orden = (a, b) => M.Gamma.indexOf(a) - M.Gamma.indexOf(b)
  return [...porArista.values()].map((a) => {
    const grupos = agrupar(a.transiciones, orden)
    return {
      ...a,
      etiquetas: grupos.map((g) => g.texto),
      simbolos: grupos.map((g) => g.simbolos),
      implicita: a.transiciones.every((t) => t.implicita),
    }
  })
}

// Notación de los diagramas de clase: "0 → x, R" escribe x; "0, 1 → R" deja el símbolo igual.
function agrupar(transiciones, orden) {
  const grupos = new Map()
  for (const t of transiciones) {
    const escrito = t.c === t.a ? null : t.c
    const k = `${escrito ?? ''}\u0000${t.mov}`
    if (!grupos.has(k)) grupos.set(k, { escrito, mov: t.mov, simbolos: [] })
    grupos.get(k).simbolos.push(t.a)
  }
  return [...grupos.values()].map((g) => {
    g.simbolos.sort(orden)
    return { simbolos: g.simbolos, texto: `${g.simbolos.join(', ')} → ${g.escrito ? `${g.escrito}, ` : ''}${g.mov}` }
  })
}
