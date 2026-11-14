import { useEffect, useRef, useState } from 'react'
import { REGLAS, delta, esParada, simboloLeido } from '../services/maquina.js'
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

const MOVIMIENTO = { L: 'a la izquierda', R: 'a la derecha' }

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
  const proxima = esParada(M, C.q) ? null : delta(M, C.q, simboloLeido(C))
  const reglaProxima = !proxima ? null : proxima.mov === 'L' ? (C.u === '' ? 'borde' : 'izquierda') : C.v.length <= 1 && !esParada(M, proxima.qj) ? 'final' : 'derecha'
  const escrita = indice > 0 ? sim.pasos[indice - 1].configuracion.u.length : null
  const anterior = indice > 0 ? sim.pasos[indice - 1].configuracion : null
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
        {depuracion && (
          <dl className="desglose">
            <div><dt>u</dt><dd>{C.u ? [...C.u].map((s, i) => <Simbolo key={i} s={s} />) : 'ε'}</dd></div>
            <div><dt>q</dt><dd><Estado q={C.q} /></dd></div>
            <div><dt>v</dt><dd>{C.v ? [...C.v].map((s, i) => <Simbolo key={i} s={s} />) : 'ε'}</dd></div>
            <div><dt>cabeza</dt><dd>celda {C.u.length}</dd></div>
          </dl>
        )}
      </div>

      {depuracion && <TarjetaCinta C={C} anterior={anterior} escrita={escrita} />}

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
                Lee <Simbolo s={proxima.a} />, escribe <Simbolo s={proxima.c} />, mueve la cabeza {MOVIMIENTO[proxima.mov]} y pasa a <Estado q={proxima.qj} />.
              </p>
              <p className="regla">
                <b>{REGLAS[reglaProxima].nombre}:</b> {REGLAS[reglaProxima].forma}
              </p>
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
        title={p.transicion ? `Producida por δ(${p.transicion.q}, ${p.transicion.a}) = (${p.transicion.qj}, ${p.transicion.c}, ${p.transicion.mov})` : 'Configuración inicial'}
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
