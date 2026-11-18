import { useEffect, useRef, useState } from 'react'
import { EJEMPLOS } from '../ejemplos.js'
import Icono from './Icono.jsx'

const GRUPOS = [...new Set(EJEMPLOS.map((e) => e.grupo))]

export default function Encabezado({ onCargar, onEjemplo, onGuardar, onGuardarYaml, puedeYaml }) {
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
          <p>Simulador determinista de una cinta · (q₀, qaccept, qreject) o (q₀, ⊔, F) con caché opcional</p>
        </div>
      </div>
      <nav className="acciones">
        <button className="boton" onClick={onCargar} title="Cargar un .txt o un .yaml con la máquina y las cadenas">
          <Icono nombre="subir" /> Cargar especificación
        </button>
        <div className="menu" ref={menu}>
          <button className="boton" onClick={() => setAbierto((a) => !a)} aria-expanded={abierto}>
            <Icono nombre="libro" /> Ejemplos <Icono nombre="flecha" tamano={16} />
          </button>
          {abierto && (
            <ul className="menu-lista">
              {GRUPOS.map((grupo) => (
                <li key={grupo}>
                  <p className="menu-grupo">{grupo}</p>
                  <ul>
                    {EJEMPLOS.filter((e) => e.grupo === grupo).map((e) => (
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
                </li>
              ))}
            </ul>
          )}
        </div>
        <button className="boton" onClick={onGuardar} title="Descargar la especificación actual como .txt">
          <Icono nombre="bajar" /> Guardar .txt
        </button>
        <button
          className="boton"
          onClick={onGuardarYaml}
          disabled={!puedeYaml}
          title={puedeYaml ? 'Descargar la especificación en el formato YAML del proyecto' : 'Disponible con la 7-tupla M = (Q, Σ, Γ, δ, q₀, ⊔, F)'}
        >
          <Icono nombre="bajar" /> Guardar .yaml
        </button>
      </nav>
    </header>
  )
}
