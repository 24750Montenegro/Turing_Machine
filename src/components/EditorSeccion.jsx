import { useRef } from 'react'
import Icono from './Icono.jsx'

export default function EditorSeccion({
  titulo,
  formula,
  valor,
  onCambio,
  onImportar,
  errores,
  advertencias,
  atajos = [],
  filas = 8,
  placeholder,
}) {
  const area = useRef(null)
  const canal = useRef(null)
  const lineas = Math.max(filas, valor.split('\n').length)
  const lineasError = new Set(errores.map((e) => e.linea).filter(Boolean))
  const lineasAviso = new Set(advertencias.map((e) => e.linea).filter(Boolean))
  const estado = errores.length ? 'error' : advertencias.length ? 'aviso' : valor.trim() ? 'ok' : 'vacio'

  const insertar = (texto) => {
    const el = area.current
    const [a, b] = [el.selectionStart, el.selectionEnd]
    onCambio(valor.slice(0, a) + texto + valor.slice(b))
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(a + texto.length, a + texto.length)
    })
  }

  const irALinea = (linea) => {
    if (!linea) return
    const el = area.current
    const inicio = valor.split('\n').slice(0, linea - 1).reduce((s, l) => s + l.length + 1, 0)
    const fin = inicio + (valor.split('\n')[linea - 1]?.length ?? 0)
    el.focus()
    el.setSelectionRange(inicio, fin)
  }

  return (
    <section className={`panel editor estado-${estado}`}>
      <header className="panel-cabecera">
        <div>
          <h2>{titulo}</h2>
          <p className="formula">{formula}</p>
        </div>
        <button className="boton boton-chico" onClick={onImportar} title="Importar desde un archivo .txt">
          <Icono nombre="subir" tamano={16} /> .txt
        </button>
      </header>

      <div className="codigo" style={{ '--filas': filas }}>
        <div className="canal" aria-hidden="true">
          <div ref={canal}>
            {Array.from({ length: lineas }, (_, i) => (
              <span key={i} className={lineasError.has(i + 1) ? 'con-error' : lineasAviso.has(i + 1) ? 'con-aviso' : ''}>
                {i + 1}
              </span>
            ))}
          </div>
        </div>
        <textarea
          ref={area}
          value={valor}
          wrap="off"
          spellCheck={false}
          placeholder={placeholder}
          onChange={(e) => onCambio(e.target.value)}
          onScroll={(e) => {
            canal.current.style.transform = `translateY(${-e.target.scrollTop}px)`
          }}
        />
      </div>

      {atajos.length > 0 && (
        <div className="atajos">
          {atajos.map(({ etiqueta, texto, accion, titulo: ayuda }) => (
            <button
              key={etiqueta}
              className="atajo"
              title={ayuda ?? `Insertar ${texto}`}
              onClick={() => (accion ? accion() : insertar(texto))}
            >
              {etiqueta}
            </button>
          ))}
        </div>
      )}

      {(errores.length > 0 || advertencias.length > 0) && (
        <ul className="mensajes">
          {errores.map((e, i) => (
            <li key={`e${i}`} className="mensaje error" onClick={() => irALinea(e.linea)}>
              <Icono nombre="error" tamano={14} />
              {e.linea && <b>L{e.linea}</b>}
              <span>{e.mensaje}</span>
            </li>
          ))}
          {advertencias.map((e, i) => (
            <li key={`a${i}`} className="mensaje aviso" onClick={() => irALinea(e.linea)}>
              <Icono nombre="aviso" tamano={14} />
              {e.linea && <b>L{e.linea}</b>}
              <span>{e.mensaje}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
