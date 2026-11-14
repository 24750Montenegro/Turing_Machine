import { useCallback, useEffect, useMemo, useState } from 'react'
import { separarEspecificacion } from './services/parser.js'
import { verificar } from './services/validador.js'
import { LIMITE_PREDETERMINADO, simular } from './services/simulador.js'
import { configuracionInicial, delta, esParada, simboloLeido } from './services/maquina.js'
import { especificacionATexto, reporteATexto } from './services/exportador.js'
import { descargarTexto, elegirArchivoTexto } from './utils/archivos.js'
import { EJEMPLOS } from './ejemplos.js'
import Encabezado from './components/Encabezado.jsx'
import EditorSeccion from './components/EditorSeccion.jsx'
import PanelVerificacion from './components/PanelVerificacion.jsx'
import VisorMaquina from './components/VisorMaquina.jsx'
import DiagramaEstados from './components/DiagramaEstados.jsx'
import Controles, { VELOCIDADES } from './components/Controles.jsx'
import Depurador from './components/Depurador.jsx'
import Icono from './components/Icono.jsx'

const ALMACEN = 'maquina-turing:especificacion'

const PANTALLA = { acepta: 'ACEPTA', rechaza: 'RECHAZA', ciclo: 'CICLO ∞', limite: 'SIN PARAR' }

const PLANTILLA_COMPONENTES = 'M = (Q, Σ, Γ, δ, q1, qaccept, qreject)\nQ = {q1, qaccept, qreject}\nΣ = {0, 1}\nΓ = {0, 1, ⊔}'

function textosIniciales() {
  const inicial = separarEspecificacion(EJEMPLOS[0].texto)
  try {
    const guardado = JSON.parse(localStorage.getItem(ALMACEN))
    return typeof guardado?.definicion === 'string' ? guardado : inicial
  } catch {
    return inicial
  }
}

function guardarTextos(textos) {
  try {
    localStorage.setItem(ALMACEN, JSON.stringify(textos))
  } catch {
    return
  }
}

function ritmo(depuracion, velocidad, total) {
  if (depuracion) return { ms: VELOCIDADES[velocidad], salto: 1 }
  return { ms: Math.min(90, Math.max(16, 2400 / Math.max(total, 1))), salto: total > 150 ? Math.ceil(total / 150) : 1 }
}

export default function App() {
  const [textos, setTextos] = useState(textosIniciales)
  const verificacion = useMemo(() => verificar(textos), [textos])
  const [ejecucion, setEjecucion] = useState(null)
  const [indice, setIndice] = useState(0)
  const [reproduciendo, setReproduciendo] = useState(false)
  const [depuracion, setDepuracion] = useState(true)
  const [velocidad, setVelocidad] = useState(2)
  const [limite, setLimite] = useState(LIMITE_PREDETERMINADO)
  const [detenerEnCiclo, setDetenerEnCiclo] = useState(true)
  const [vista, setVista] = useState('3d')
  const [pestana, setPestana] = useState('maquina')
  const [aviso, setAviso] = useState(null)

  useEffect(() => guardarTextos(textos), [textos])

  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(() => setAviso(null), 4200)
    return () => clearTimeout(t)
  }, [aviso])

  const sim = ejecucion?.simulacion
  const total = sim ? sim.pasos.length - 1 : 0
  const desactualizada = Boolean(ejecucion) && ejecucion.textos !== textos
  const { ms, salto } = ritmo(depuracion, velocidad, total)

  const ejecutar = useCallback(() => {
    if (!verificacion.valida) return
    const simulacion = simular(verificacion.maquina, verificacion.w, { limite, detenerEnCiclo })
    setEjecucion({ id: Date.now(), simulacion, verificacion, textos })
    setIndice(0)
    setReproduciendo(!depuracion)
  }, [verificacion, limite, detenerEnCiclo, textos, depuracion])

  const ir = useCallback(
    (i) => {
      setReproduciendo(false)
      setIndice(Math.max(0, Math.min(total, i)))
    },
    [total],
  )

  const alternar = useCallback(() => {
    if (!sim) return
    if (!reproduciendo && indice >= total) setIndice(0)
    setReproduciendo((r) => !r)
  }, [sim, reproduciendo, indice, total])

  useEffect(() => {
    if (!reproduciendo || !sim) return
    if (indice >= total) {
      setReproduciendo(false)
      return
    }
    const t = setTimeout(() => setIndice((i) => Math.min(total, i + salto)), ms)
    return () => clearTimeout(t)
  }, [reproduciendo, indice, sim, total, ms, salto])

  useEffect(() => {
    const teclado = (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        ejecutar()
        return
      }
      if (e.target.closest('textarea, input, select')) return
      if (e.key === ' ' && e.target.closest('button')) return
      const acciones = {
        ArrowRight: () => ir(indice + 1),
        ArrowLeft: () => ir(indice - 1),
        Home: () => ir(0),
        End: () => ir(total),
        ' ': alternar,
      }
      if (acciones[e.key] && sim) {
        e.preventDefault()
        acciones[e.key]()
      }
    }
    window.addEventListener('keydown', teclado)
    return () => window.removeEventListener('keydown', teclado)
  }, [ejecutar, ir, alternar, indice, total, sim])

  const cambiarModo = (enDepuracion) => {
    setDepuracion(enDepuracion)
    if (!enDepuracion && sim && indice < total) setReproduciendo(true)
  }

  const reemplazarTodo = (texto, mensaje) => {
    setTextos(separarEspecificacion(texto))
    setEjecucion(null)
    setReproduciendo(false)
    setIndice(0)
    if (mensaje) setAviso(mensaje)
  }

  const cargarEspecificacion = async () => {
    const archivo = await elegirArchivoTexto()
    if (archivo) reemplazarTodo(archivo.texto, `Se cargó ${archivo.nombre}`)
  }

  const importarSeccion = async (seccion) => {
    const archivo = await elegirArchivoTexto()
    if (!archivo) return
    const partes = separarEspecificacion(archivo.texto)
    if (Object.values(partes).filter((p) => p.trim()).length > 1) {
      reemplazarTodo(archivo.texto, `${archivo.nombre} contiene una especificación completa; se repartió en las tres secciones`)
      return
    }
    setTextos((t) => ({ ...t, [seccion]: archivo.texto.trimEnd() }))
    setAviso(`Se importó ${archivo.nombre}`)
  }

  const exportarResultado = () => {
    if (!ejecucion) return
    descargarTexto(`configuraciones-${ejecucion.verificacion.maquina.nombre}.txt`, reporteATexto(ejecucion.verificacion, ejecucion.simulacion))
  }

  const actualizar = (seccion) => (valor) => setTextos((t) => ({ ...t, [seccion]: valor }))
  const mensajes = (seccion) => ({
    errores: verificacion.errores.filter((e) => e.seccion === seccion),
    advertencias: verificacion.advertencias.filter((e) => e.seccion === seccion),
  })

  const maquinaActual = sim && !desactualizada ? ejecucion.verificacion.maquina : verificacion.maquina
  const previa = verificacion.valida ? configuracionInicial(verificacion.maquina, verificacion.w) : null
  const pasoActual = sim?.pasos[indice]
  const C = pasoActual?.configuracion ?? previa
  const terminado = Boolean(sim) && indice === total
  const situacion = !sim ? 'listo' : terminado ? sim.resultado : 'ejecutando'

  const cuadro = useMemo(() => {
    if (!C) return null
    return {
      id: ejecucion?.id ?? 'previa',
      indice: sim ? indice : 0,
      cinta: C.u + C.v,
      cabeza: C.u.length,
      estado: C.q,
      situacion,
      pantalla: !sim ? 'LISTO' : terminado ? PANTALLA[sim.resultado] : `PASO ${indice}/${total}`,
      escritura: sim && indice > 0 ? sim.pasos[indice - 1].configuracion.u.length : null,
      duracion: !sim ? 0 : depuracion ? Math.min(900, ms * 0.9) : ms * 0.95,
    }
  }, [C, ejecucion, sim, indice, situacion, terminado, total, depuracion, ms])

  const enSimulacion = Boolean(sim) && !desactualizada
  const proxima = enSimulacion && !esParada(maquinaActual, C.q) ? delta(maquinaActual, C.q, simboloLeido(C)) : null

  return (
    <div className="app">
      <Encabezado
        onCargar={cargarEspecificacion}
        onEjemplo={(e) => reemplazarTodo(e.texto, `Ejemplo cargado: ${e.titulo}`)}
        onGuardar={() => descargarTexto('especificacion.txt', especificacionATexto(textos))}
      />

      <main className="principal">
        <div className="columna columna-entradas">
          <EditorSeccion
            titulo="Gramática · componentes"
            formula="M = (Q, Σ, Γ, δ, q₀, qaccept, qreject)"
            valor={textos.definicion}
            onCambio={actualizar('definicion')}
            onImportar={() => importarSeccion('definicion')}
            {...mensajes('definicion')}
            filas={7}
            placeholder={PLANTILLA_COMPONENTES}
            atajos={[
              { etiqueta: 'Σ', texto: 'Σ' },
              { etiqueta: 'Γ', texto: 'Γ' },
              { etiqueta: 'δ', texto: 'δ' },
              { etiqueta: '⊔', texto: '⊔' },
              { etiqueta: 'plantilla', titulo: 'Reemplazar por una plantilla', accion: () => actualizar('definicion')(PLANTILLA_COMPONENTES) },
            ]}
          />
          <EditorSeccion
            titulo="Transiciones"
            formula="δ: Q × Γ → Q × Γ × {L, R}"
            valor={textos.transiciones}
            onCambio={actualizar('transiciones')}
            onImportar={() => importarSeccion('transiciones')}
            {...mensajes('transiciones')}
            filas={11}
            placeholder={'δ(q1, 0) = (q1, 0, R)\nδ(q1, ⊔) = (qaccept, ⊔, R)'}
            atajos={[
              { etiqueta: 'δ', texto: 'δ' },
              { etiqueta: '⊔', texto: '⊔' },
              { etiqueta: '+ δ(q, a) = (q, b, R)', texto: 'δ(q1, 0) = (q1, 0, R)\n', titulo: 'Insertar una transición' },
            ]}
          />
          <EditorSeccion
            titulo="Entrada"
            formula="w ∈ Σ*"
            valor={textos.entrada}
            onCambio={actualizar('entrada')}
            onImportar={() => importarSeccion('entrada')}
            {...mensajes('entrada')}
            filas={2}
            placeholder="w = 0011"
            atajos={[{ etiqueta: 'ε', titulo: 'Cadena vacía', accion: () => actualizar('entrada')('w = ε') }]}
          />
          <PanelVerificacion comprobaciones={verificacion.comprobaciones} valida={verificacion.valida} />
        </div>

        <div className="columna columna-central">
          <section className="panel escenario">
            <div className="pestanas" role="tablist">
              <button role="tab" aria-selected={pestana === 'maquina'} className={pestana === 'maquina' ? 'activa' : ''} onClick={() => setPestana('maquina')}>
                Máquina 3D
              </button>
              <button role="tab" aria-selected={pestana === 'diagrama'} className={pestana === 'diagrama' ? 'activa' : ''} onClick={() => setPestana('diagrama')}>
                Diagrama de estados
              </button>
              <span className={`estado-ejecucion situacion-${situacion}`}>
                <span className="punto" />
                {{ listo: 'Listo', ejecutando: reproduciendo ? 'Ejecutando' : 'En pausa', acepta: 'Acepta', rechaza: 'Rechaza', ciclo: 'Ciclo infinito', limite: 'Límite alcanzado' }[situacion]}
              </span>
            </div>

            <div className="escenario-cuerpo">
              <div className={`capa ${pestana === 'maquina' ? 'visible' : ''}`}>
                <VisorMaquina cuadro={cuadro} vista={vista} onVista={setVista} />
              </div>
              {pestana === 'diagrama' && (
                <div className="capa visible">
                  {maquinaActual ? (
                    <DiagramaEstados
                      maquina={maquinaActual}
                      activo={enSimulacion ? C.q : null}
                      aristaActiva={proxima ? { desde: proxima.q, hacia: proxima.qj } : null}
                    />
                  ) : (
                    <p className="nota centrada">Corrige la especificación para ver el diagrama.</p>
                  )}
                </div>
              )}
            </div>

            <Controles
              puedeSimular={verificacion.valida}
              hayEjecucion={Boolean(sim)}
              desactualizada={desactualizada}
              indice={indice}
              total={total}
              reproduciendo={reproduciendo}
              depuracion={depuracion}
              velocidad={velocidad}
              limite={limite}
              detenerEnCiclo={detenerEnCiclo}
              onSimular={ejecutar}
              onIr={ir}
              onAlternar={alternar}
              onDepuracion={cambiarModo}
              onVelocidad={setVelocidad}
              onLimite={setLimite}
              onDetenerEnCiclo={setDetenerEnCiclo}
            />
          </section>
        </div>

        <div className="columna columna-depurador">
          <Depurador
            ejecucion={ejecucion}
            indice={indice}
            onIr={ir}
            depuracion={depuracion}
            previa={previa}
            desactualizada={desactualizada}
            onExportar={exportarResultado}
          />
        </div>
      </main>

      {aviso && (
        <div className="aviso-flotante" role="status">
          <Icono nombre="ok" tamano={16} /> {aviso}
        </div>
      )}
    </div>
  )
}
