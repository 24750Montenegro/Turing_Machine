import { BLANCO } from '../services/notacion.js'
import { Simbolo } from './Notacion.jsx'

export const inicioVentana = (C) => Math.max(0, C.u.length - 6)

export default function CintaPlana({ C, anterior, escrita, celdasVisibles = 14 }) {
  const cinta = [...C.u, ...C.v]
  const cabeza = C.u.length
  const desde = inicioVentana(C)
  const hasta = Math.min(Math.max(cabeza + 6, cinta.length), desde + celdasVisibles - 1)
  const previa = anterior ? [...anterior.u, ...anterior.v] : null
  const celdas = []
  for (let i = desde; i <= hasta; i++) {
    const s = cinta[i] ?? BLANCO
    const antes = previa ? previa[i] ?? BLANCO : s
    const cambio = i === escrita && antes !== s
    celdas.push(
      <div key={i} className={`celda ${i === cabeza ? 'bajo-cabeza' : ''} ${i === escrita ? 'escrita' : ''} ${cambio ? 'cambio' : ''}`}>
        {i === cabeza && <span className="marca-cabeza" aria-hidden="true" />}
        {cambio && <span className="antes"><Simbolo s={antes} /></span>}
        <Simbolo s={s} />
        <span className="posicion">{i}</span>
      </div>,
    )
  }
  return <div className="cinta-plana">{celdas}</div>
}
