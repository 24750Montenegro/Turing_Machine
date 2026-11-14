import { useEffect, useMemo, useRef, useState } from 'react'
import { aristasDiagrama } from '../services/diagrama.js'
import { distribuir } from '../diagrama/distribucion.js'
import { diagramaSVG, limitesDiagrama } from '../diagrama/svg.js'
import { descargarTexto } from '../utils/archivos.js'
import Icono from './Icono.jsx'

export default function DiagramaEstados({ maquina, activo, aristaActiva }) {
  const [ocultarRechazo, setOcultarRechazo] = useState(false)
  const [implicitas, setImplicitas] = useState(false)
  const contenedor = useRef(null)
  const arrastre = useRef(null)
  const [limitesFijos, setLimitesFijos] = useState(null)

  const aristas = useMemo(() => {
    const todas = aristasDiagrama(maquina, { incluirImplicitas: implicitas })
    return ocultarRechazo ? todas.filter((a) => a.hacia !== maquina.qreject) : todas
  }, [maquina, implicitas, ocultarRechazo])

  const firma = `${maquina.Q.join(',')}|${maquina.transiciones.map((t) => `${t.q}>${t.qj}`).join(',')}`
  const [posiciones, setPosiciones] = useState(() => distribuir(maquina, aristas))
  const firmaActual = useRef(firma)
  useEffect(() => {
    if (firmaActual.current === firma) return
    firmaActual.current = firma
    setPosiciones(distribuir(maquina, aristas))
  }, [firma, maquina, aristas])

  const svg = useMemo(
    () => diagramaSVG(maquina, aristas, posiciones, { activo, aristaActiva, limites: limitesFijos }),
    [maquina, aristas, posiciones, activo, aristaActiva, limitesFijos],
  )

  const aCoordenadas = (e) => {
    const el = contenedor.current.querySelector('svg')
    const punto = el.createSVGPoint()
    punto.x = e.clientX
    punto.y = e.clientY
    return punto.matrixTransform(el.getScreenCTM().inverse())
  }

  const alPresionar = (e) => {
    const nodo = e.target.closest('[data-estado]')
    if (!nodo) return
    const q = nodo.getAttribute('data-estado')
    const p = aCoordenadas(e)
    arrastre.current = { q, dx: p.x - posiciones[q].x, dy: p.y - posiciones[q].y }
    setLimitesFijos(limitesDiagrama(posiciones))
    contenedor.current.setPointerCapture(e.pointerId)
  }

  const alMover = (e) => {
    const a = arrastre.current
    if (!a) return
    const p = aCoordenadas(e)
    setPosiciones((actual) => ({ ...actual, [a.q]: { x: p.x - a.dx, y: p.y - a.dy } }))
  }

  const alSoltar = () => {
    arrastre.current = null
    setLimitesFijos(null)
  }

  const exportar = () => {
    descargarTexto(`diagrama-${maquina.nombre}.svg`, diagramaSVG(maquina, aristas, posiciones, { fondo: true }), 'image/svg+xml')
  }

  return (
    <div className="diagrama">
      <div className="diagrama-barra">
        <label className="casilla">
          <input type="checkbox" checked={ocultarRechazo} onChange={(e) => setOcultarRechazo(e.target.checked)} />
          <span>Ocultar transiciones hacia qreject</span>
        </label>
        {maquina.implicitas.length > 0 && (
          <label className="casilla">
            <input type="checkbox" checked={implicitas} onChange={(e) => setImplicitas(e.target.checked)} />
            <span>Mostrar pares no definidos ({maquina.implicitas.length})</span>
          </label>
        )}
        <span className="separador" />
        <button className="boton boton-chico" onClick={() => setPosiciones(distribuir(maquina, aristas))} title="Volver a la distribución automática">
          <Icono nombre="reacomodar" tamano={16} /> Reacomodar
        </button>
        <button className="boton boton-chico" onClick={exportar} title="Descargar el diagrama como SVG">
          <Icono nombre="bajar" tamano={16} /> SVG
        </button>
      </div>
      <div
        className="diagrama-lienzo"
        ref={contenedor}
        onPointerDown={alPresionar}
        onPointerMove={alMover}
        onPointerUp={alSoltar}
        onPointerCancel={alSoltar}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <p className="diagrama-nota">
        {ocultarRechazo || maquina.implicitas.length > 0
          ? 'Las transiciones que no se dibujan van a qreject. '
          : ''}
        Notación de clase: «a → b, D» lee a, escribe b y mueve D; «a → D» deja el símbolo igual. Arrastra los estados para acomodarlos.
      </p>
    </div>
  )
}
