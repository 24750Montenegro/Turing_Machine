import { BLANCO, partesEstado, piezas } from '../services/notacion.js'

export function Estado({ q }) {
  const { base, sub } = partesEstado(q)
  return (
    <span className="estado">
      {base}
      {sub && <sub>{sub}</sub>}
    </span>
  )
}

export function Simbolo({ s, clase = '' }) {
  return <span className={`simbolo ${s === BLANCO ? 'blanco' : ''} ${clase}`}>{s}</span>
}

function UnaCinta({ u, q, v, resaltar }) {
  return (
    <>
      {[...u].map((s, i) => <Simbolo key={`u${i}`} s={s} />)}
      <Estado q={q} />
      {[...v].map((s, i) => <Simbolo key={`v${i}`} s={s} clase={resaltar && i === 0 ? 'leido' : ''} />)}
    </>
  )
}

export function Configuracion({ c, resaltar = true }) {
  if (!c.cintas) {
    return (
      <span className="configuracion">
        <UnaCinta u={c.u} q={c.q} v={c.v} resaltar={resaltar} />
      </span>
    )
  }
  return (
    <span className="configuracion">
      (
      {c.cintas.map(({ u, v }, i) => (
        <span key={i} className="config-cinta">
          {i > 0 && ', '}
          <UnaCinta u={u} q={c.q} v={v} resaltar={resaltar} />
        </span>
      ))}
      )
    </span>
  )
}

export function Transicion({ t }) {
  const { leidos, escritos, movs } = piezas(t)
  return (
    <span className="transicion">
      δ(<Estado q={t.q} />{leidos.map((s, i) => <span key={i}>, <Simbolo s={s} /></span>)}) = (<Estado q={t.qj} />
      {escritos.map((s, i) => <span key={i}>, <Simbolo s={s} /></span>)}, {movs.join(', ')})
    </span>
  )
}

export function NombreConfiguracion({ i }) {
  return (
    <span className="nombre-config">
      C<sub>{i + 1}</sub>
    </span>
  )
}
