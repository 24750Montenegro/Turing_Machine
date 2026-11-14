import { BLANCO, partesEstado } from '../services/notacion.js'

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

export function Configuracion({ c, resaltar = true }) {
  return (
    <span className="configuracion">
      {[...c.u].map((s, i) => <Simbolo key={`u${i}`} s={s} />)}
      <Estado q={c.q} />
      {[...c.v].map((s, i) => <Simbolo key={`v${i}`} s={s} clase={resaltar && i === 0 ? 'leido' : ''} />)}
    </span>
  )
}

export function Transicion({ t }) {
  return (
    <span className="transicion">
      δ(<Estado q={t.q} />, <Simbolo s={t.a} />) = (<Estado q={t.qj} />, <Simbolo s={t.c} />, {t.mov})
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
