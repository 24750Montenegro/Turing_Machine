import Icono from './Icono.jsx'
import { LIMITE_MAXIMO } from '../services/simulador.js'

export const VELOCIDADES = [1600, 1050, 700, 420, 220]

export default function Controles({
  puedeSimular,
  hayEjecucion,
  desactualizada,
  indice,
  total,
  reproduciendo,
  depuracion,
  velocidad,
  limite,
  detenerEnCiclo,
  onSimular,
  onIr,
  onAlternar,
  onDepuracion,
  onVelocidad,
  onLimite,
  onDetenerEnCiclo,
}) {
  const sinPasos = !hayEjecucion
  return (
    <div className="controles">
      <div className="controles-fila">
        <button
          className={`boton boton-primario ${desactualizada ? 'pulso' : ''}`}
          onClick={onSimular}
          disabled={!puedeSimular}
          title="Simular (Ctrl + Enter)"
        >
          <Icono nombre="ejecutar" /> Simular
        </button>

        <div className="transporte" role="group" aria-label="Reproducción">
          <button className="boton-icono" onClick={() => onIr(0)} disabled={sinPasos || indice === 0} title="Configuración inicial (Inicio)">
            <Icono nombre="inicio" />
          </button>
          <button className="boton-icono" onClick={() => onIr(indice - 1)} disabled={sinPasos || indice === 0} title="Paso anterior (←)">
            <Icono nombre="anterior" />
          </button>
          <button className="boton-icono destacado" onClick={onAlternar} disabled={sinPasos} title="Reproducir / pausar (espacio)">
            <Icono nombre={reproduciendo ? 'pausa' : 'play'} />
          </button>
          <button className="boton-icono" onClick={() => onIr(indice + 1)} disabled={sinPasos || indice >= total} title="Paso siguiente (→)">
            <Icono nombre="siguiente" />
          </button>
          <button className="boton-icono" onClick={() => onIr(total)} disabled={sinPasos || indice >= total} title="Última configuración (Fin)">
            <Icono nombre="final" />
          </button>
        </div>

        <label className="progreso">
          <span className="contador">
            {hayEjecucion ? `paso ${indice} / ${total}` : 'sin simular'}
          </span>
          <input
            type="range"
            min={0}
            max={Math.max(total, 1)}
            value={indice}
            disabled={sinPasos}
            onChange={(e) => onIr(Number(e.target.value))}
            aria-label="Ir a la configuración"
          />
        </label>
      </div>

      <div className="controles-fila secundaria">
        <div className="modo" role="group" aria-label="Modo">
          <button className={`segmento ${depuracion ? 'activo' : ''}`} onClick={() => onDepuracion(true)} title="Paso a paso con detalle de cada transición">
            <Icono nombre="lupa" tamano={16} /> Depuración
          </button>
          <button className={`segmento ${!depuracion ? 'activo' : ''}`} onClick={() => onDepuracion(false)} title="Ejecuta todo rápidamente">
            <Icono nombre="rayo" tamano={16} /> Rápido
          </button>
        </div>

        {depuracion && (
          <label className="campo">
            <span>Velocidad</span>
            <input
              type="range"
              min={0}
              max={VELOCIDADES.length - 1}
              value={velocidad}
              onChange={(e) => onVelocidad(Number(e.target.value))}
            />
          </label>
        )}

        <label className="campo">
          <span>Límite de pasos</span>
          <input
            type="number"
            min={1}
            max={LIMITE_MAXIMO}
            value={limite}
            onChange={(e) => onLimite(Math.min(LIMITE_MAXIMO, Math.max(1, Number(e.target.value) || 1)))}
          />
        </label>

        <label className="casilla">
          <input type="checkbox" checked={detenerEnCiclo} onChange={(e) => onDetenerEnCiclo(e.target.checked)} />
          <span>Detener al detectar un ciclo</span>
        </label>
      </div>
    </div>
  )
}
