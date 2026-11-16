import { useEffect, useRef, useState } from 'react'
import { REGLAS, cintasDe, esParada, produce } from '../services/maquina.js'
import { piezas, transicionATexto } from '../services/notacion.js'
import { explicarResultado } from '../services/exportador.js'
import CintaPlana, { inicioVentana } from './CintaPlana.jsx'
import { Configuracion, Estado, NombreConfiguracion, Simbolo, Transicion } from './Notacion.jsx'
import Icono from './Icono.jsx'

const RESULTADO = {
  acepta: { titulo: 'M acepta w', icono: 'ok' },
  rechaza: { titulo: 'M rechaza w', icono: 'error' },
  ciclo: { titulo: 'M no se detiene', icono: 'ciclo' },
  limite: { titulo: 'Sin resultado', icono: 'aviso' },
}

const MOVIMIENTO = { L: 'a la izquierda', R: 'a la derecha', S: 'no se mueve' }

export default function Depurador({ ejecucion, indice, onIr, depuracion, previa, desactualizada, onExportar }) {
  if (!ejecucion) {
    return (
      <aside className="panel depurador">
        <header className="panel-cabecera">
          <div>
            <h2>Depurador</h2>
            <p className="formula">C₁, C₂, …, Cₖ (Definición 7)</p>
          </div>
        </header>
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
        <p className="nota centrada">Presiona <b>Simular</b> para generar la secuencia de configuraciones.</p>
      </aside>
    )
  }

  const { simulacion: sim, verificacion } = ejecucion
  const M = verificacion.maquina
  const total = sim.pasos.length - 1
  const C = sim.pasos[indice].configuracion
  const terminado = indice === total
  const siguiente = esParada(M, C.q) ? null : produce(M, C)
  const proxima = siguiente?.transicion ?? null
  const reglas = siguiente ? [].concat(siguiente.regla) : []
  const cintas = cintasDe(C)
  const anteriores = indice > 0 ? cintasDe(sim.pasos[indice - 1].configuracion) : null
  const varias = cintas.length > 1
  const info = RESULTADO[sim.resultado]

  return (
    <aside className="panel depurador">
      <header className="panel-cabecera">
        <div>
          <h2>Depurador</h2>
          <p className="formula">
            {total} paso{total === 1 ? '' : 's'} · w = {sim.w || 'ε'}
          </p>
        </div>
        <button className="boton boton-chico" onClick={onExportar} title="Exportar las configuraciones a .txt">
          <Icono nombre="bajar" tamano={16} /> Exportar .txt
        </button>
      </header>

      {desactualizada && <p className="aviso-linea">La especificación cambió después de simular. Vuelve a presionar Simular.</p>}

      <div className="tarjeta">
        <p className="tarjeta-titulo">Configuración actual</p>
        <p className="config-grande">
          <NombreConfiguracion i={indice} /> = <Configuracion c={C} />
        </p>
        {depuracion && !varias && (
          <dl className="desglose">
            <div><dt>u</dt><dd><Cadena s={C.u} /></dd></div>
            <div><dt>q</dt><dd><Estado q={C.q} /></dd></div>
            <div><dt>v</dt><dd><Cadena s={C.v} /></dd></div>
            <div><dt>cabeza</dt><dd>celda {C.u.length}</dd></div>
          </dl>
        )}
        {depuracion && varias && (
          <dl className="desglose desglose-cintas">
            <div><dt>q</dt><dd><Estado q={C.q} /></dd></div>
            {cintas.map(({ u, v }, i) => (
              <div key={i}>
                <dt>cinta {i + 1}</dt>
                <dd>u = <Cadena s={u} /> · v = <Cadena s={v} /> · celda {u.length}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      {depuracion && cintas.map((cinta, i) => (
        <TarjetaCinta
          key={i}
          titulo={varias ? `Cinta ${i + 1}` : 'Cinta'}
          C={cinta}
          anterior={anteriores?.[i] ?? null}
          escrita={anteriores ? anteriores[i].u.length : null}
        />
      ))}

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
              {varias ? (
                <ul className="explicacion explicacion-cintas">
                  {piezas(proxima).leidos.map((a, i) => (
                    <li key={i}>
                      Cinta {i + 1}: lee <Simbolo s={a} />, escribe <Simbolo s={proxima.escritos[i]} /> y la cabeza {MOVIMIENTO[proxima.movs[i]]} ({REGLAS[reglas[i]].nombre.toLowerCase()}).
                    </li>
                  ))}
                  <li>M pasa a <Estado q={proxima.qj} />.</li>
                </ul>
              ) : (
                <p className="explicacion">
                  Lee <Simbolo s={proxima.a} />, escribe <Simbolo s={proxima.c} />, mueve la cabeza {MOVIMIENTO[proxima.mov]} y pasa a <Estado q={proxima.qj} />.
                </p>
              )}
              {[...new Set(reglas)].map((r) => (
                <p key={r} className="regla">
                  <b>{REGLAS[r].nombre}:</b> {REGLAS[r].forma}
                </p>
              ))}
              {terminado && <p className="nota">La simulación se detuvo antes de aplicar esta transición.</p>}
            </>
          ) : (
            <p className="explicacion">
              El estado es <Estado q={C.q} />: las configuraciones de {C.q === M.qaccept ? 'aceptación' : 'rechazo'} no producen más configuraciones (Definición 6).
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

function TarjetaCinta({ titulo, ...props }) {
  const desde = inicioVentana(props.C)
  return (
    <div className="tarjeta">
      <p className="tarjeta-titulo">{titulo} {desde > 0 && <span className="nota">(desde la celda {desde})</span>}</p>
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
