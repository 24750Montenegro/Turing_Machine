import { useEffect, useRef } from 'react'
import { EscenaTuring } from '../escena/EscenaTuring.js'
import Icono from './Icono.jsx'

const VISTAS = [
  { id: '3d', etiqueta: '3D', icono: 'cubo' },
  { id: 'planta', etiqueta: 'Planta', icono: 'planta' },
  { id: 'frontal', etiqueta: 'Frontal', icono: 'frente' },
]

export default function VisorMaquina({ cuadro, vista, onVista, cintas = 1, cinta = 0, onCinta }) {
  const contenedor = useRef(null)
  const escena = useRef(null)

  useEffect(() => {
    const e = new EscenaTuring(contenedor.current)
    escena.current = e
    return () => {
      e.destruir()
      escena.current = null
    }
  }, [])

  useEffect(() => {
    if (cuadro) escena.current?.mostrar(cuadro)
  }, [cuadro])

  useEffect(() => {
    escena.current?.cambiarVista(vista)
  }, [vista])

  return (
    <div className="visor">
      <div className="visor-lienzo" ref={contenedor} />
      <div className="visor-vistas" role="group" aria-label="Cámara">
        {VISTAS.map((v) => (
          <button key={v.id} className={`segmento ${vista === v.id ? 'activo' : ''}`} onClick={() => onVista(v.id)}>
            <Icono nombre={v.icono} tamano={16} /> {v.etiqueta}
          </button>
        ))}
      </div>
      {cintas > 1 && (
        <div className="visor-cintas" role="group" aria-label="Cinta que muestra la máquina">
          <span>Cinta</span>
          {Array.from({ length: cintas }, (_, i) => (
            <button key={i} className={`segmento ${cinta === i ? 'activo' : ''}`} onClick={() => onCinta(i)} aria-pressed={cinta === i}>
              {i + 1}
            </button>
          ))}
        </div>
      )}
      <p className="visor-ayuda">Arrastra para girar · rueda para acercar · clic derecho para mover</p>
    </div>
  )
}
