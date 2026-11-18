import { useEffect, useMemo, useRef, useState } from 'react'
import { REGLAS, configuracionesAlineadas, esAceptacion, esHopcroft, esParada, produce, simboloLeido } from '../services/maquina.js'
import { transicionATexto } from '../services/notacion.js'
import { explicarResultado } from '../services/exportador.js'
import CintaPlana, { inicioVentana } from './CintaPlana.jsx'
import { Configuracion, Estado, NombreConfiguracion, Simbolo, Transicion } from './Notacion.jsx'
import Icono from './Icono.jsx'

const RESULTADO = {
  acepta: { titulo: 'M acepta w', icono: 'ok', corto: 'acepta' },
  rechaza: { titulo: 'M rechaza w', icono: 'error', corto: 'rechaza' },
  ciclo: { titulo: 'M no se detiene', icono: 'ciclo', corto: 'ciclo ∞' },
  limite: { titulo: 'Sin resultado', icono: 'aviso', corto: 'límite' },
}

const MOVIMIENTO = { L: 'a la izquierda', R: 'a la derecha', S: 'no se mueve' }

function ListaCadenas({ cadenas, simulaciones, actual, onCadena }) {
  if (cadenas.length < 2) return null
  return (
    <div className="tarjeta">
      <p className="tarjeta-titulo">Cadenas de entrada ({cadenas.length})</p>
      <ul className="lista-cadenas">
        {cadenas.map(({ w }, i) => {
          const s = simulaciones?.[i]
          return (
            <li key={i}>
              <button className={`cadena ${i === actual ? 'actual' : ''}`} onClick={() => onCadena(i)} aria-pressed={i === actual}>
                <span>w<sub>{i + 1}</sub></span>
                <span className="w">{w || 'ε'}</span>
                {s && <span className={`veredicto resultado-${s.resultado}`}>{RESULTADO[s.resultado].corto}</span>}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default function Depurador({ ejecucion, cadenas, cadena, onCadena, indice, onIr, depuracion, previa, desactualizada, onExportar }) {
  const sim = ejecucion?.simulaciones[cadena]
  const alineadas = useMemo(() => (sim ? configuracionesAlineadas(sim) : null), [sim])

  if (!ejecucion) {
    return (
      <aside className="panel depurador">
        <header className="panel-cabecera">
          <div>
            <h2>Depurador</h2>
            <p className="formula">C₁, C₂, …, Cₖ (Definición 7)</p>
          </div>
        </header>
        <ListaCadenas cadenas={cadenas} actual={cadena} onCadena={onCadena} />
        <div className="tarjeta">
          <p className="tarjeta-titulo">Configuración inicial</p>
          {previa ? (
            <p className="config-grande">
              <NombreConfiguracion i={0} /> = <Configuracion c={previa} />
            </p>
          ) : (
            <p className="nota">La especificación todavía tiene errores.</p>
          )}
        </div>
        <p className="nota centrada">Presiona <b>Simular</b> para generar la secuencia de configuraciones{cadenas.length > 1 ? ' de cada cadena' : ''}.</p>
      </aside>
    )
  }

  const { verificacion, simulaciones } = ejecucion
  const M = verificacion.maquina
  const total = sim.pasos.length - 1
  const C = sim.pasos[indice].configuracion
  const terminado = indice === total
  const siguiente = produce(M, C)
  const proxima = siguiente?.transicion ?? null
  const info = RESULTADO[sim.resultado]
  const vista = alineadas[indice]
  const anterior = indice > 0 ? alineadas[indice - 1] : null

  return (
    <aside className="panel depurador">
      <header className="panel-cabecera">
        <div>
          <h2>Depurador</h2>
          <p className="formula">
            {total} paso{total === 1 ? '' : 's'} · w = {sim.w || 'ε'}
          </p>
        </div>
        <button className="boton boton-chico" onClick={onExportar} title="Exportar las configuraciones de todas las cadenas a .txt">
          <Icono nombre="bajar" tamano={16} /> Exportar .txt
        </button>
      </header>

      {desactualizada && <p className="aviso-linea">La especificación cambió después de simular. Vuelve a presionar Simular.</p>}

      <ListaCadenas cadenas={simulaciones.map((s) => ({ w: s.w }))} simulaciones={simulaciones} actual={cadena} onCadena={onCadena} />

      <div className="tarjeta">
        <p className="tarjeta-titulo">Configuración actual</p>
        <p className="config-grande">
          <NombreConfiguracion i={indice} /> = <Configuracion c={C} />
        </p>
        {depuracion && (
          <dl className="desglose">
            <div><dt>u</dt><dd><Cadena s={C.u} /></dd></div>
            <div><dt>q</dt><dd><Estado q={C.q} /></dd></div>
            <div><dt>v</dt><dd><Cadena s={C.v} /></dd></div>
            <div><dt>cabeza</dt><dd>celda {vista.u.length}</dd></div>
            {C.m !== undefined && <div><dt>caché</dt><dd><Simbolo s={C.m} /></dd></div>}
          </dl>
        )}
      </div>

      {depuracion && <TarjetaCinta C={vista} anterior={anterior} escrita={anterior ? anterior.u.length : null} />}

      {depuracion && (
        <div className="tarjeta">
          <p className="tarjeta-titulo">
            {proxima ? (
              <>Siguiente paso: <NombreConfiguracion i={indice} /> produce <NombreConfiguracion i={indice + 1} /></>
            ) : (
              'Configuración de parada'
            )}
          </p>
          {proxima ? (
            <>
              <p className="transicion-grande">
                <Transicion t={proxima} />
                {proxima.implicita && <span className="etiqueta-implicita">implícita</span>}
              </p>
              <p className="explicacion">
                {proxima.m !== undefined ? (
                  <>
                    Con <Simbolo s={proxima.m} /> en la caché lee <Simbolo s={proxima.a} />, escribe <Simbolo s={proxima.c} />, guarda{' '}
                    <Simbolo s={proxima.n} /> en la caché, la cabeza {MOVIMIENTO[proxima.mov]} y pasa a <Estado q={proxima.qj} />.
                  </>
                ) : (
                  <>
                    Lee <Simbolo s={proxima.a} />, escribe <Simbolo s={proxima.c} />, la cabeza {MOVIMIENTO[proxima.mov]} y pasa a <Estado q={proxima.qj} />.
                  </>
                )}
              </p>
              <p className="regla">
                <b>{REGLAS[siguiente.regla].nombre}:</b> {REGLAS[siguiente.regla].forma}
                {proxima.m !== undefined && ' (con caché, qᵢ y qⱼ son los pares [qᵢ, m] y [qⱼ, n])'}
              </p>
              {terminado && <p className="nota">La simulación se detuvo antes de aplicar esta transición.</p>}
            </>
          ) : (
            <p className="explicacion">
              {esParada(M, C.q) ? (
                esAceptacion(M, C.q) ? (
                  <>El estado es <Estado q={C.q} />{esHopcroft(M) ? ' ∈ F' : ''}: las configuraciones de aceptación no producen más configuraciones.</>
                ) : (
                  <>El estado es <Estado q={C.q} />: las configuraciones de rechazo no producen más configuraciones (Definición 6).</>
                )
              ) : (
                <>
                  δ(<Estado q={C.q} m={C.m} />, <Simbolo s={simboloLeido(C)} />) no está definida: M se detiene y, como <Estado q={C.q} /> ∉ F, rechaza.
                </>
              )}
            </p>
          )}
        </div>
      )}

      {terminado && (
        <div className={`tarjeta resultado resultado-${sim.resultado}`}>
          <p className="resultado-titulo">
            <Icono nombre={info.icono} /> {info.titulo}
          </p>
          {explicarResultado(M, sim).map((l, i) => (
            <p key={i}>{l}</p>
          ))}
          <button className="boton boton-chico exportar-resultado" onClick={onExportar}>
            <Icono nombre="bajar" tamano={16} /> Exportar configuraciones (.txt)
          </button>
        </div>
      )}

      <ListaConfiguraciones sim={sim} indice={indice} onIr={onIr} />
    </aside>
  )
}

const Cadena = ({ s }) => (s ? [...s].map((x, i) => <Simbolo key={i} s={x} />) : 'ε')

function TarjetaCinta(props) {
  const desde = inicioVentana(props.C)
  return (
    <div className="tarjeta">
      <p className="tarjeta-titulo">Cinta {desde > 0 && <span className="nota">(desde la celda {desde})</span>}</p>
      <CintaPlana {...props} />
    </div>
  )
}

const ALTO_FILA = 30

function ListaConfiguraciones({ sim, indice, onIr }) {
  const caja = useRef(null)
  const [desplazamiento, setDesplazamiento] = useState(0)
  const [alto, setAlto] = useState(260)
  const { pasos, ciclo } = sim

  useEffect(() => {
    const el = caja.current
    const observador = new ResizeObserver(() => setAlto(el.clientHeight))
    observador.observe(el)
    return () => observador.disconnect()
  }, [])

  useEffect(() => {
    const el = caja.current
    const y = indice * ALTO_FILA
    if (y < el.scrollTop || y > el.scrollTop + el.clientHeight - ALTO_FILA) {
      el.scrollTop = Math.max(0, y - el.clientHeight / 2)
    }
  }, [indice])

  const desde = Math.max(0, Math.floor(desplazamiento / ALTO_FILA) - 6)
  const hasta = Math.min(pasos.length, Math.ceil((desplazamiento + alto) / ALTO_FILA) + 6)
  const filas = []
  for (let i = desde; i < hasta; i++) {
    const p = pasos[i]
    const enCiclo = ciclo && (i === ciclo.desde || i === ciclo.hasta)
    filas.push(
      <button
        key={i}
        className={`fila-config ${i === indice ? 'actual' : ''} ${i > indice ? 'futura' : ''} ${enCiclo ? 'en-ciclo' : ''}`}
        style={{ top: i * ALTO_FILA }}
        onClick={() => onIr(i)}
        title={p.transicion ? `Producida por ${transicionATexto(p.transicion)}` : 'Configuración inicial'}
      >
        <NombreConfiguracion i={i} />
        <Configuracion c={p.configuracion} resaltar={false} />
        {enCiclo && <Icono nombre="ciclo" tamano={14} />}
      </button>,
    )
  }

  return (
    <div className="tarjeta lista">
      <p className="tarjeta-titulo">Secuencia de configuraciones</p>
      <div className="lista-configs" ref={caja} onScroll={(e) => setDesplazamiento(e.currentTarget.scrollTop)}>
        <div style={{ height: pasos.length * ALTO_FILA, position: 'relative' }}>{filas}</div>
      </div>
    </div>
  )
}
