import { BLANCO, partesEstado } from '../services/notacion.js'

export function Estado({ q, m }) {
  const { base, sub } = partesEstado(q)
  const nombre = (
    <>
      {base}
      {sub && <sub>{sub}</sub>}
    </>
  )
  if (m === undefined) return <span className="estado">{nombre}</span>
  return (
    <span className="estado estado-cache">
      [{nombre}, <Simbolo s={m} />]
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
      <Estado q={c.q} m={c.m} />
      {[...c.v].map((s, i) => <Simbolo key={`v${i}`} s={s} clase={resaltar && i === 0 ? 'leido' : ''} />)}
    </span>
  )
}

export function Transicion({ t }) {
  return (
    <span className="transicion">
      δ(<Estado q={t.q} m={t.m} />, <Simbolo s={t.a} />) = (<Estado q={t.qj} m={t.n} />, <Simbolo s={t.c} />, {t.mov})
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
