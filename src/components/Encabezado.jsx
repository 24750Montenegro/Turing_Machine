import { useEffect, useRef, useState } from 'react'
import { EJEMPLOS } from '../ejemplos.js'
import Icono from './Icono.jsx'

export default function Encabezado({ onCargar, onEjemplo, onGuardar }) {
  const [abierto, setAbierto] = useState(false)
  const menu = useRef(null)

  useEffect(() => {
    if (!abierto) return
    const cerrar = (e) => !menu.current?.contains(e.target) && setAbierto(false)
    document.addEventListener('pointerdown', cerrar)
    return () => document.removeEventListener('pointerdown', cerrar)
  }, [abierto])

  return (
    <header className="encabezado">
      <div className="marca">
        <img src="./favicon.svg" alt="" width="40" height="40" />
        <div>
          <h1>Máquina de Turing</h1>
          <p>Simulador determinista · M = (Q, Σ, Γ, δ, q₀, qaccept, qreject)</p>
        </div>
      </div>
      <nav className="acciones">
        <button className="boton" onClick={onCargar} title="Cargar un .txt con componentes, transiciones y w">
          <Icono nombre="subir" /> Cargar especificación
        </button>
        <div className="menu" ref={menu}>
          <button className="boton" onClick={() => setAbierto((a) => !a)} aria-expanded={abierto}>
            <Icono nombre="libro" /> Ejemplos <Icono nombre="flecha" tamano={16} />
          </button>
          {abierto && (
            <ul className="menu-lista">
              {EJEMPLOS.map((e) => (
                <li key={e.id}>
                  <button
                    onClick={() => {
                      onEjemplo(e)
                      setAbierto(false)
                    }}
                  >
                    <b>{e.titulo}</b>
                    <span>{e.detalle}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button className="boton" onClick={onGuardar} title="Descargar la especificación actual como .txt">
          <Icono nombre="bajar" /> Guardar especificación
        </button>
      </nav>
    </header>
  )
}
