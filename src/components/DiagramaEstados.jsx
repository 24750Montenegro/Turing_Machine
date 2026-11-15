import { useEffect, useMemo, useRef, useState } from 'react'
import { aristasDiagrama } from '../services/diagrama.js'
import { agregarEstado, siguienteEstado } from '../services/edicion.js'
import { distribuir } from '../diagrama/distribucion.js'
import { diagramaSVG, limitesDiagrama } from '../diagrama/svg.js'
import { descargarTexto } from '../utils/archivos.js'
import { Configuracion, NombreConfiguracion, Transicion } from './Notacion.jsx'
import CintaPlana from './CintaPlana.jsx'
import InspectorDiagrama from './InspectorDiagrama.jsx'
import Icono from './Icono.jsx'

const UMBRAL_ARRASTRE = 4

export default function DiagramaEstados({
  maquina,
  textos,
  onEditar,
  puedeDeshacer,
  onDeshacer,
  puedeRehacer,
  onRehacer,
  activo,
  transicionActiva,
  movimiento,
  paso,
}) {
  const [ocultarRechazo, setOcultarRechazo] = useState(false)
  const [implicitas, setImplicitas] = useState(false)
  const [editando, setEditando] = useState(false)
  const [seleccion, setSeleccion] = useState(null)
  const [aviso, setAviso] = useState(null)
  const [limitesFijos, setLimitesFijos] = useState(null)
  const contenedor = useRef(null)
  const interaccion = useRef(null)
  const pendientes = useRef({})

  const aristas = useMemo(() => {
    const todas = aristasDiagrama(maquina, { incluirImplicitas: implicitas })
    return ocultarRechazo ? todas.filter((a) => a.hacia !== maquina.qreject) : todas
  }, [maquina, implicitas, ocultarRechazo])

  const firma = `${maquina.Q.join(',')}|${maquina.transiciones.map((t) => `${t.q}>${t.qj}`).join(',')}`
  const automaticas = useMemo(() => distribuir(maquina, aristas), [firma])
  const [posiciones, setPosiciones] = useState(automaticas)
  const completas = useMemo(
    () => Object.fromEntries(maquina.Q.map((q) => [q, posiciones[q] ?? pendientes.current[q] ?? automaticas[q]])),
    [maquina, posiciones, automaticas],
  )
  useEffect(() => {
    setPosiciones(completas)
    pendientes.current = {}
  }, [firma])

  const seleccionValida =
    seleccion?.tipo === 'estado' ? maquina.Q.includes(seleccion.q)
      : seleccion?.tipo === 'arista' ? maquina.Q.includes(seleccion.desde) && maquina.Q.includes(seleccion.hacia)
        : false
  const seleccionActual = editando && seleccionValida ? seleccion : null

  const svg = useMemo(() => {
    const vigente = movimiento && performance.now() - movimiento.t0 < movimiento.duracion
    return diagramaSVG(maquina, aristas, completas, {
      activo,
      transicionActiva,
      seleccion: seleccionActual,
      movimiento: vigente ? movimiento : null,
      limites: limitesFijos,
    })
  }, [maquina, aristas, completas, activo, transicionActiva, seleccionActual, movimiento, limitesFijos])

  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(() => setAviso(null), 4000)
    return () => clearTimeout(t)
  }, [aviso])

  const aCoordenadas = (e) => {
    const el = contenedor.current.querySelector('svg')
    const punto = el.createSVGPoint()
    punto.x = e.clientX
    punto.y = e.clientY
    return punto.matrixTransform(el.getScreenCTM().inverse())
  }

  const alPresionar = (e) => {
    const nodo = e.target.closest('[data-estado]')
    const arista = e.target.closest('[data-desde]')
    const base = { x0: e.clientX, y0: e.clientY, movio: false }
    if (nodo) {
      const q = nodo.getAttribute('data-estado')
      const p = aCoordenadas(e)
      interaccion.current = { ...base, tipo: 'estado', q, dx: p.x - completas[q].x, dy: p.y - completas[q].y }
      contenedor.current.setPointerCapture(e.pointerId)
    } else {
      interaccion.current = {
        ...base,
        tipo: arista ? 'arista' : 'fondo',
        desde: arista?.getAttribute('data-desde'),
        hacia: arista?.getAttribute('data-hacia'),
      }
    }
  }

  const alMover = (e) => {
    const i = interaccion.current
    if (!i || i.tipo !== 'estado') return
    if (!i.movio) {
      if (Math.hypot(e.clientX - i.x0, e.clientY - i.y0) < UMBRAL_ARRASTRE) return
      i.movio = true
      setLimitesFijos(limitesDiagrama(completas))
    }
    const p = aCoordenadas(e)
    setPosiciones((actual) => ({ ...actual, [i.q]: { x: p.x - i.dx, y: p.y - i.dy } }))
  }

  const alSoltar = () => {
    const i = interaccion.current
    interaccion.current = null
    setLimitesFijos(null)
    if (!i || i.movio || !editando) return
    if (i.tipo === 'estado') setSeleccion({ tipo: 'estado', q: i.q })
    else if (i.tipo === 'arista') setSeleccion({ tipo: 'arista', desde: i.desde, hacia: i.hacia })
    else setSeleccion(null)
  }

  const nuevoEstado = () => {
    const q = siguienteEstado(maquina.Q)
    const resultado = agregarEstado(textos, q)
    if (resultado.error) {
      setAviso(resultado.error)
      return
    }
    const puntos = Object.values(completas)
    pendientes.current[q] = {
      x: Math.max(...puntos.map((p) => p.x)) + 170,
      y: puntos.reduce((s, p) => s + p.y, 0) / puntos.length,
    }
    onEditar(resultado.textos)
    setSeleccion({ tipo: 'estado', q })
  }

  const renombrado = (viejo, nuevo) => {
    pendientes.current[nuevo] = completas[viejo]
    setSeleccion({ tipo: 'estado', q: nuevo })
  }

  const exportar = () => {
    descargarTexto(`diagrama-${maquina.nombre}.svg`, diagramaSVG(maquina, aristas, completas, { fondo: true }), 'image/svg+xml')
  }

  return (
    <div className="diagrama">
      <div className="diagrama-barra">
        <button
          className={`boton boton-chico ${editando ? 'boton-primario' : ''}`}
          aria-pressed={editando}
          onClick={() => {
            setEditando((v) => !v)
            setSeleccion(null)
          }}
          title="Agregar, modificar o eliminar estados y transiciones"
        >
          <Icono nombre="lapiz" tamano={16} /> {editando ? 'Terminar edición' : 'Editar'}
        </button>
        {editando && (
          <>
            <button className="boton boton-chico" onClick={nuevoEstado} title="Agregar un estado nuevo a Q">
              <Icono nombre="mas" tamano={16} /> Estado
            </button>
            <button className="boton boton-chico" onClick={onDeshacer} disabled={!puedeDeshacer} title="Deshacer (Ctrl + Z)">
              <Icono nombre="deshacer" tamano={16} /> Deshacer
            </button>
            <button className="boton boton-chico" onClick={onRehacer} disabled={!puedeRehacer} title="Rehacer (Ctrl + Y)">
              <Icono nombre="rehacer" tamano={16} /> Rehacer
            </button>
          </>
        )}
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

      <div className={`diagrama-cuerpo ${seleccionActual ? 'con-inspector' : ''}`}>
        <div
          className={`diagrama-lienzo ${editando ? 'editando' : ''}`}
          ref={contenedor}
          onPointerDown={alPresionar}
          onPointerMove={alMover}
          onPointerUp={alSoltar}
          onPointerCancel={alSoltar}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        {aviso && <p className="mensaje error aviso-diagrama">{aviso}</p>}
        {seleccionActual && (
          <InspectorDiagrama
            maquina={maquina}
            textos={textos}
            seleccion={seleccionActual}
            onAplicar={onEditar}
            onSeleccionar={setSeleccion}
            onRenombrado={renombrado}
          />
        )}
      </div>

      {editando ? (
        <p className="diagrama-nota">
          Modo edición: haz clic en un estado o en una arista para modificarlos. Cada cambio se escribe en la configuración y se deshace con Ctrl + Z.
        </p>
      ) : paso ? (
        <div className="diagrama-movimiento">
          <p className="movimiento-texto">
            <span>
              <NombreConfiguracion i={paso.indice} /> = <Configuracion c={paso.C} />
            </span>
            {paso.transicion ? (
              <span>
                <Transicion t={paso.transicion} />
                <span className={`direccion direccion-${paso.transicion.mov}`}>
                  {paso.transicion.mov === 'L' ? '← la cabeza va a la izquierda' : 'la cabeza va a la derecha →'}
                </span>
              </span>
            ) : (
              <span className="nota">Configuración inicial</span>
            )}
          </p>
          <CintaPlana C={paso.C} anterior={paso.anterior} escrita={paso.escrita} celdasVisibles={18} />
        </div>
      ) : (
        <p className="diagrama-nota">
          {ocultarRechazo || maquina.implicitas.length > 0 ? 'Las transiciones que no se dibujan van a qreject. ' : ''}
          Notación de clase: «a → b, D» lee a, escribe b y mueve D; «a → D» deja el símbolo igual. Arrastra los estados para acomodarlos.
        </p>
      )}
    </div>
  )
}
