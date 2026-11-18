import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { analizarDefinicion, separarEspecificacion } from './services/parser.js'
import { verificar } from './services/validador.js'
import { LIMITE_PREDETERMINADO, simularCadenas } from './services/simulador.js'
import { configuracionATexto, configuracionInicial, configuracionesAlineadas } from './services/maquina.js'
import { MODELOS, conSubindice, firmaDelta, transicionATexto } from './services/notacion.js'
import { especificacionATexto, maquinaATexto, nombreConfiguracion, reporteATexto } from './services/exportador.js'
import { cambiarCache } from './services/edicion.js'
import { esYaml, especificacionAYaml, yamlAEspecificacion } from './services/yaml.js'
import { descargarTexto, elegirArchivoTexto } from './utils/archivos.js'
import { useHistorial } from './utils/historial.js'
import { EJEMPLOS } from './ejemplos.js'
import Encabezado from './components/Encabezado.jsx'
import EditorSeccion from './components/EditorSeccion.jsx'
import PanelVerificacion from './components/PanelVerificacion.jsx'
import VisorMaquina from './components/VisorMaquina.jsx'
import DiagramaEstados from './components/DiagramaEstados.jsx'
import Controles, { VELOCIDADES } from './components/Controles.jsx'
import Depurador from './components/Depurador.jsx'
import Icono from './components/Icono.jsx'
import VistaPreviaCarga from './components/VistaPreviaCarga.jsx'

const ALMACEN = 'maquina-turing:especificacion'
const ALMACEN_PANEL = 'maquina-turing:entradas-visibles'

const PANTALLA = { acepta: 'ACEPTA', rechaza: 'RECHAZA', ciclo: 'CICLO ∞', limite: 'SIN PARAR' }
const PIZARRA = { acepta: 'M acepta w ✓', rechaza: 'M rechaza w ✗', ciclo: 'M no se detiene: ciclo ∞', limite: 'Sin resultado (límite de pasos)' }

const TUPLA = {
  [MODELOS.sipser]: 'M = (Q, Σ, Γ, δ, q₀, qaccept, qreject)',
  [MODELOS.hopcroft]: 'M = (Q, Σ, Γ, δ, q₀, ⊔, F) · cinta infinita a ambos lados',
}
const PLANTILLA_COMPONENTES = 'M = (Q, Σ, Γ, δ, q1, qaccept, qreject)\nQ = {q1, qaccept, qreject}\nΣ = {0, 1}\nΓ = {0, 1, ⊔}'
const PLANTILLA_HOPCROFT = 'M = (Q, Σ, Γ, δ, q0, ⊔, F)\nQ = {q0, q1}\nΣ = {a, b}\nΓ = {a, b, ⊔}\nF = {q1}'
const ACEPTA_ARCHIVO = '.txt,.yaml,.yml,text/plain,application/yaml,text/yaml'

function textosIniciales() {
  const guardado = leer(ALMACEN, null)
  return typeof guardado?.definicion === 'string' ? guardado : separarEspecificacion(EJEMPLOS[0].texto)
}

function leer(clave, predeterminado) {
  try {
    return JSON.parse(localStorage.getItem(clave)) ?? predeterminado
  } catch {
    return predeterminado
  }
}

function guardar(clave, valor) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor))
  } catch {
    return
  }
}

function ritmo(depuracion, velocidad, total) {
  if (depuracion) return { ms: VELOCIDADES[velocidad], salto: 1 }
  return { ms: Math.min(90, Math.max(16, 2400 / Math.max(total, 1))), salto: total > 150 ? Math.ceil(total / 150) : 1 }
}

const estadoMostrado = (C) => (C.m === undefined ? C.q : `[${conSubindice(C.q)}, ${C.m}]`)

export default function App() {
  const { valor: textos, cambiar: cambiarTextos, deshacer, rehacer, puedeDeshacer, puedeRehacer } = useHistorial(textosIniciales)
  const verificacion = useMemo(() => verificar(textos), [textos])
  const definicion = useMemo(() => analizarDefinicion(textos.definicion), [textos.definicion])
  const [ejecucion, setEjecucion] = useState(null)
  const [indice, setIndice] = useState(0)
  const [cadenaElegida, setCadena] = useState(0)
  const [reproduciendo, setReproduciendo] = useState(false)
  const [depuracion, setDepuracion] = useState(true)
  const [velocidad, setVelocidad] = useState(2)
  const [limite, setLimite] = useState(LIMITE_PREDETERMINADO)
  const [detenerEnCiclo, setDetenerEnCiclo] = useState(true)
  const [vista, setVista] = useState('3d')
  const [pestana, setPestana] = useState('maquina')
  const [aviso, setAviso] = useState(null)
  const [entradasVisibles, setEntradasVisibles] = useState(() => leer(ALMACEN_PANEL, true) !== false)
  const [cargaPendiente, setCargaPendiente] = useState(null)
  const [versionDiagrama, setVersionDiagrama] = useState(0)
  const [movimiento, setMovimiento] = useState(null)
  const previo = useRef({ id: null, indice: -1 })

  useEffect(() => guardar(ALMACEN, textos), [textos])
  useEffect(() => guardar(ALMACEN_PANEL, entradasVisibles), [entradasVisibles])

  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(() => setAviso(null), aviso.error ? 7000 : 4200)
    return () => clearTimeout(t)
  }, [aviso])

  const numeroCadenas = ejecucion ? ejecucion.simulaciones.length : verificacion.cadenas.length
  const cadena = Math.max(0, Math.min(cadenaElegida, numeroCadenas - 1))
  const sim = ejecucion?.simulaciones[cadena]
  const total = sim ? sim.pasos.length - 1 : 0
  const desactualizada = Boolean(ejecucion) && ejecucion.textos !== textos
  const { ms, salto } = ritmo(depuracion, velocidad, total)
  const alineadas = useMemo(() => (sim ? configuracionesAlineadas(sim) : null), [sim])

  const ejecutar = useCallback(() => {
    if (!verificacion.valida) return
    const simulaciones = simularCadenas(verificacion.maquina, verificacion.cadenas, { limite, detenerEnCiclo })
    setEjecucion({ id: Date.now(), simulaciones, verificacion, textos })
    setIndice(0)
    setReproduciendo(!depuracion)
  }, [verificacion, limite, detenerEnCiclo, textos, depuracion])

  const elegirCadena = (i) => {
    setCadena(i)
    setIndice(0)
    setReproduciendo(Boolean(ejecucion) && !depuracion)
  }

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
      const tecla = e.key.toLowerCase()
      if ((e.ctrlKey || e.metaKey) && !e.altKey && (tecla === 'z' || tecla === 'y')) {
        if (e.target.closest('input, select') || (e.target.closest('textarea') && !e.target.closest('.codigo'))) return
        e.preventDefault()
        if (tecla === 'y' || e.shiftKey) rehacer()
        else deshacer()
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
  }, [ejecutar, ir, alternar, indice, total, sim, deshacer, rehacer])

  const cambiarModo = (enDepuracion) => {
    setDepuracion(enDepuracion)
    if (!enDepuracion && sim && indice < total) setReproduciendo(true)
  }

  const reemplazarTodo = (texto, mensaje) => {
    cambiarTextos(separarEspecificacion(texto))
    setVersionDiagrama((v) => v + 1)
    setEjecucion(null)
    setReproduciendo(false)
    setIndice(0)
    setCadena(0)
    if (mensaje) setAviso({ texto: mensaje })
  }

  const cargarEspecificacion = async () => {
    const archivo = await elegirArchivoTexto(ACEPTA_ARCHIVO)
    if (!archivo) return
    if (!esYaml(archivo.nombre)) {
      setCargaPendiente(archivo)
      return
    }
    const { texto, errores } = yamlAEspecificacion(archivo.texto, archivo.nombre)
    if (errores.length) setAviso({ error: true, texto: `${archivo.nombre}: ${errores.join(' · ')}` })
    else setCargaPendiente({ nombre: archivo.nombre, texto, origen: 'yaml' })
  }

  const importarSeccion = async (seccion) => {
    const archivo = await elegirArchivoTexto()
    if (!archivo) return
    const partes = separarEspecificacion(archivo.texto)
    if (Object.values(partes).filter((p) => p.trim()).length > 1) {
      setCargaPendiente(archivo)
      return
    }
    cambiarTextos((t) => ({ ...t, [seccion]: archivo.texto.trimEnd() }))
    setAviso({ texto: `Se importó ${archivo.nombre}` })
  }

  const exportarResultado = () => {
    if (!ejecucion) return
    descargarTexto(`configuraciones-${ejecucion.verificacion.maquina.nombre}.txt`, reporteATexto(ejecucion.verificacion, ejecucion.simulaciones))
  }

  const guardarYaml = () => {
    const { texto, error } = especificacionAYaml(textos)
    if (error) setAviso({ error: true, texto: error })
    else descargarTexto('especificacion.yaml', texto, 'application/yaml;charset=utf-8')
  }

  const alternarCache = (activa) => {
    const { textos: nuevos } = cambiarCache(textos, activa)
    cambiarTextos(nuevos)
  }

  const actualizar = (seccion) => (valor) => cambiarTextos((t) => ({ ...t, [seccion]: valor }), seccion)
  const mensajes = (seccion) => ({
    errores: verificacion.errores.filter((e) => e.seccion === seccion),
    advertencias: verificacion.advertencias.filter((e) => e.seccion === seccion),
  })

  const maquinaActual = sim && !desactualizada ? ejecucion.verificacion.maquina : verificacion.maquina
  const wPrevia = verificacion.cadenas[Math.min(cadena, verificacion.cadenas.length - 1)].w
  const previa = verificacion.valida ? configuracionInicial(verificacion.maquina, wPrevia) : null
  const pasoActual = sim?.pasos[indice]
  const C = pasoActual?.configuracion ?? previa
  const vistaCinta = alineadas?.[indice] ?? previa
  const terminado = Boolean(sim) && indice === total
  const situacion = !sim ? 'listo' : terminado ? sim.resultado : 'ejecutando'

  const cuadro = useMemo(() => {
    if (!C) return null
    const M = ejecucion?.verificacion.maquina ?? verificacion.maquina
    const aplicadaEnPizarra = sim && indice > 0 ? sim.pasos[indice].transicion : null
    return {
      id: ejecucion ? `${ejecucion.id}-${cadena}` : 'previa',
      indice: sim ? indice : 0,
      cinta: vistaCinta.u + vistaCinta.v,
      cabeza: vistaCinta.u.length,
      estado: estadoMostrado(C),
      situacion,
      pantalla: !sim ? 'LISTO' : terminado ? PANTALLA[sim.resultado] : `PASO ${indice}/${total}`,
      escritura: sim && indice > 0 ? alineadas[indice - 1].u.length : null,
      duracion: !sim ? 0 : depuracion ? Math.min(1500, ms * 0.9) : ms * 0.95,
      pizarra: {
        maquina: M ? maquinaATexto(M)[0] : '',
        firma: firmaDelta(M ?? undefined),
        configuracion: `${nombreConfiguracion(sim ? indice : 0)} = ${configuracionATexto(C)}`,
        transicion: aplicadaEnPizarra ? transicionATexto(aplicadaEnPizarra, conSubindice) : '',
        resultado: terminado ? PIZARRA[sim.resultado] : '',
      },
    }
  }, [C, vistaCinta, alineadas, ejecucion, cadena, sim, indice, situacion, terminado, total, depuracion, ms, verificacion.maquina])

  const enSimulacion = Boolean(sim) && !desactualizada
  const aplicada = enSimulacion && indice > 0 ? pasoActual.transicion : null
  const paso = enSimulacion
    ? { indice, C, transicion: aplicada, vista: alineadas[indice], vistaAnterior: indice > 0 ? alineadas[indice - 1] : null }
    : null

  useEffect(() => {
    const p = previo.current
    const id = ejecucion ? `${ejecucion.id}-${cadena}` : null
    previo.current = { id, indice }
    const consecutivo = Boolean(sim) && p.id === id && p.indice === indice - 1
    setMovimiento(
      consecutivo && cuadro?.duracion > 0
        ? { desde: sim.pasos[indice].transicion.q, hacia: sim.pasos[indice].transicion.qj, duracion: cuadro.duracion, clave: `${id}-${indice}`, t0: performance.now() }
        : null,
    )
  }, [ejecucion?.id, cadena, indice])

  const hopcroft = definicion.modelo === MODELOS.hopcroft
  const interruptorCache = (
    <label className={`interruptor ${definicion.cache ? 'activo' : ''}`} title="Estados [q, m]: la máquina guarda un símbolo de Γ en su control finito">
      <input type="checkbox" checked={definicion.cache} onChange={(e) => alternarCache(e.target.checked)} />
      Caché [q, m]
    </label>
  )

  return (
    <div className="app">
      <Encabezado
        onCargar={cargarEspecificacion}
        onEjemplo={(e) => reemplazarTodo(e.texto, `Ejemplo cargado: ${e.titulo}`)}
        onGuardar={() => descargarTexto('especificacion.txt', especificacionATexto(textos))}
        onGuardarYaml={guardarYaml}
        puedeYaml={hopcroft}
      />

      <main className={`principal ${entradasVisibles ? '' : 'sin-entradas'}`}>
        <div className="lateral">
          <div className="columna columna-entradas" id="panel-configuracion" hidden={!entradasVisibles}>
            <EditorSeccion
              titulo="Gramática · componentes"
              formula={TUPLA[definicion.modelo]}
              valor={textos.definicion}
              onCambio={actualizar('definicion')}
              onImportar={() => importarSeccion('definicion')}
              {...mensajes('definicion')}
              filas={7}
              placeholder={PLANTILLA_COMPONENTES}
              extra={interruptorCache}
              atajos={[
                { etiqueta: 'Σ', texto: 'Σ' },
                { etiqueta: 'Γ', texto: 'Γ' },
                { etiqueta: 'δ', texto: 'δ' },
                { etiqueta: '⊔', texto: '⊔' },
                { etiqueta: 'plantilla', titulo: 'Reemplazar por la plantilla (q₀, qaccept, qreject)', accion: () => actualizar('definicion')(PLANTILLA_COMPONENTES) },
                { etiqueta: 'plantilla F', titulo: 'Reemplazar por la plantilla (q₀, ⊔, F) del formato YAML', accion: () => actualizar('definicion')(PLANTILLA_HOPCROFT) },
              ]}
            />
            <EditorSeccion
              titulo="Transiciones"
              formula={firmaDelta(definicion)}
              valor={textos.transiciones}
              onCambio={actualizar('transiciones')}
              onImportar={() => importarSeccion('transiciones')}
              {...mensajes('transiciones')}
              filas={11}
              placeholder={definicion.cache ? 'δ([q0, ⊔], a) = ([q1, a], ⊔, R)\nδ([q1, a], ⊔) = ([q2, ⊔], a, S)' : 'δ(q1, 0) = (q1, 0, R)\nδ(q1, ⊔) = (qaccept, ⊔, R)'}
              atajos={[
                { etiqueta: 'δ', texto: 'δ' },
                { etiqueta: '⊔', texto: '⊔' },
                definicion.cache
                  ? { etiqueta: '+ δ([q, m], a) = ([p, n], b, R)', texto: 'δ([q1, ⊔], 0) = ([q1, 0], 0, R)\n', titulo: 'Insertar una transición con caché' }
                  : { etiqueta: '+ δ(q, a) = (q, b, R)', texto: 'δ(q1, 0) = (q1, 0, R)\n', titulo: 'Insertar una transición' },
              ]}
            />
            <EditorSeccion
              titulo="Entrada"
              formula="una cadena por línea · w ∈ Σ*"
              valor={textos.entrada}
              onCambio={actualizar('entrada')}
              onImportar={() => importarSeccion('entrada')}
              {...mensajes('entrada')}
              filas={3}
              placeholder={'w = 0011\nw = 0101'}
              atajos={[{ etiqueta: 'ε', titulo: 'Agregar la cadena vacía', accion: () => actualizar('entrada')(textos.entrada.trim() ? `${textos.entrada.trimEnd()}\nw = ε` : 'w = ε') }]}
            />
            <PanelVerificacion comprobaciones={verificacion.comprobaciones} valida={verificacion.valida} modelo={definicion.modelo} />
          </div>
          <button
            className="riel"
            onClick={() => setEntradasVisibles((v) => !v)}
            aria-expanded={entradasVisibles}
            aria-controls="panel-configuracion"
            aria-label={entradasVisibles ? 'Ocultar configuración' : 'Mostrar configuración'}
            title={entradasVisibles ? 'Ocultar configuración' : 'Mostrar configuración'}
          >
            <Icono nombre={entradasVisibles ? 'izquierda' : 'derecha'} tamano={16} />
            {!entradasVisibles && verificacion.errores.length > 0 && (
              <span className="riel-errores" title={`${verificacion.errores.length} errores en la especificación`}>
                {verificacion.errores.length}
              </span>
            )}
          </button>
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
                      key={versionDiagrama}
                      maquina={maquinaActual}
                      textos={textos}
                      onEditar={cambiarTextos}
                      puedeDeshacer={puedeDeshacer}
                      onDeshacer={deshacer}
                      puedeRehacer={puedeRehacer}
                      onRehacer={rehacer}
                      activo={enSimulacion ? C.q : null}
                      transicionActiva={aplicada}
                      movimiento={enSimulacion ? movimiento : null}
                      paso={paso}
                    />
                  ) : (
                    <div className="nota centrada">
                      <p>Corrige la especificación para ver el diagrama.</p>
                      {puedeDeshacer && (
                        <button className="boton boton-chico" onClick={deshacer}>
                          <Icono nombre="deshacer" tamano={16} /> Deshacer el último cambio (Ctrl + Z)
                        </button>
                      )}
                    </div>
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
            cadenas={verificacion.cadenas}
            cadena={cadena}
            onCadena={elegirCadena}
            indice={indice}
            onIr={ir}
            depuracion={depuracion}
            previa={previa}
            desactualizada={desactualizada}
            onExportar={exportarResultado}
          />
        </div>
      </main>

      {cargaPendiente && (
        <VistaPreviaCarga
          nombre={cargaPendiente.nombre}
          texto={cargaPendiente.texto}
          origen={cargaPendiente.origen}
          onCancelar={() => setCargaPendiente(null)}
          onConfirmar={() => {
            reemplazarTodo(cargaPendiente.texto, `Se cargó ${cargaPendiente.nombre}`)
            setCargaPendiente(null)
          }}
        />
      )}

      {aviso && (
        <div className={`aviso-flotante ${aviso.error ? 'aviso-error' : ''}`} role={aviso.error ? 'alert' : 'status'}>
          <Icono nombre={aviso.error ? 'error' : 'ok'} tamano={16} /> {aviso.texto}
        </div>
      )}
    </div>
  )
}
