import { useEffect, useMemo, useRef } from 'react'
import { ENCABEZADOS, SECCIONES, clasificarLineas } from '../services/parser.js'
import Icono from './Icono.jsx'

const NOMBRES = { definicion: 'Componentes', transiciones: 'Transiciones', entrada: 'Entrada' }

export default function VistaPreviaCarga({ nombre, texto, origen, onConfirmar, onCancelar }) {
  const lineas = useMemo(() => clasificarLineas(texto), [texto])
  const usaEncabezados = lineas.some((l) => l.tipo === 'encabezado')
  const confirmar = useRef(null)
  const cancelar = useRef(onCancelar)
  cancelar.current = onCancelar

  useEffect(() => {
    confirmar.current?.focus()
    const teclado = (e) => e.key === 'Escape' && cancelar.current()
    window.addEventListener('keydown', teclado)
    return () => window.removeEventListener('keydown', teclado)
  }, [])

  return (
    <div className="modal-fondo" onPointerDown={(e) => e.target === e.currentTarget && onCancelar()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="titulo-carga">
        <header className="modal-cabecera">
          <div>
            <h2 id="titulo-carga">Cargar especificación</h2>
            <p className="formula">{nombre}</p>
          </div>
          <button className="boton-mini" onClick={onCancelar} aria-label="Cancelar" title="Cancelar">
            <Icono nombre="error" tamano={15} />
          </button>
        </header>

        {origen === 'yaml' && (
          <p className="modal-explicacion">
            El archivo YAML se convirtió a la notación del simulador: <code>q_states</code> da Q, q₀ y F; <code>alphabet</code> da Σ;
            Γ = Σ ∪ <code>tape_alphabet</code> ∪ {'{⊔}'}; cada elemento de <code>delta</code> es una transición (con caché,{' '}
            δ([q, m], a) = ([p, n], b, D)) y cada elemento de <code>simulation_strings</code> es una cadena de entrada.
          </p>
        )}
        <p className="modal-explicacion">
          {usaEncabezados ? (
            <>
              El archivo usa encabezados: todo lo que está debajo de <code>{ENCABEZADOS.definicion}</code>,{' '}
              <code>{ENCABEZADOS.transiciones}</code> o <code>{ENCABEZADOS.entrada}</code> va a esa sección, incluidos los comentarios.
            </>
          ) : (
            <>
              Cada línea va a la sección de lo que define: la 7-tupla y los conjuntos a <b>Componentes</b>, cada δ(…) a{' '}
              <b>Transiciones</b> y <code>w = …</code> a <b>Entrada</b>. Los comentarios y las líneas en blanco se van con la siguiente
              línea que tenga contenido. Para decidirlo tú, escribe <code>{ENCABEZADOS.definicion}</code>, <code>{ENCABEZADOS.transiciones}</code> y{' '}
              <code>{ENCABEZADOS.entrada}</code> antes de cada parte.
            </>
          )}
        </p>

        <div className="leyenda-secciones">
          {SECCIONES.map((s) => (
            <span key={s} className={`chip-seccion seccion-${s}`}>
              {NOMBRES[s]} · {lineas.filter((l) => l.seccion === s && (l.tipo === 'contenido' || l.tipo === 'comentario')).length} líneas
            </span>
          ))}
        </div>

        <ol className="lineas-carga">
          {lineas.map((l, i) => {
            const inicioDeBloque = i === 0 || lineas[i - 1].seccion !== l.seccion
            return (
              <li key={l.numero} className={`linea-carga seccion-${l.seccion} tipo-${l.tipo}`}>
                <span className="numero">{l.numero}</span>
                <span className="destino">{l.tipo === 'encabezado' ? 'encabezado' : inicioDeBloque ? NOMBRES[l.seccion] : ''}</span>
                <code>{l.texto || ' '}</code>
              </li>
            )
          })}
        </ol>

        <footer className="modal-acciones">
          <button className="boton" onClick={onCancelar}>
            Cancelar
          </button>
          <button className="boton boton-primario" onClick={onConfirmar} ref={confirmar}>
            <Icono nombre="subir" /> Cargar en las tres secciones
          </button>
        </footer>
      </div>
    </div>
  )
}
