import { useEffect, useState } from 'react'
import {
  asignarRol,
  eliminarEstado,
  eliminarTransicion,
  guardarTransicion,
  renombrarEstado,
} from '../services/edicion.js'
import { esHopcroft, esParada } from '../services/maquina.js'
import { BLANCO, conSubindice, movimientosDe, normalizarEstado } from '../services/notacion.js'
import { Estado, Transicion } from './Notacion.jsx'
import Icono from './Icono.jsx'

const ROLES_SIPSER = [
  { campo: 'q0', etiqueta: 'Inicial' },
  { campo: 'qaccept', etiqueta: 'Aceptación' },
  { campo: 'qreject', etiqueta: 'Rechazo' },
]
const OTRO = '\u0000otro'

function lecturaLibre(M, q) {
  const usadas = new Set(M.transiciones.filter((t) => t.q === q).map((t) => `${t.m ?? ''}\u0000${t.a}`))
  const caches = M.cache ? [BLANCO, ...M.Gamma.filter((s) => s !== BLANCO)] : [undefined]
  for (const m of caches) for (const a of M.Gamma) if (!usadas.has(`${m ?? ''}\u0000${a}`)) return { m, a }
  return { m: caches[0], a: M.Gamma[0] }
}

function valoresIniciales(M, desde, hacia) {
  const origenes = M.Q.filter((q) => !esParada(M, q))
  const q = origenes.includes(desde) ? desde : origenes[0]
  const { m, a } = lecturaLibre(M, q)
  return { q, qj: hacia ?? q, a, c: a, mov: 'R', ...(M.cache ? { m, n: m } : {}) }
}

function SelectorSimbolo({ valor, Gamma, onCambio, etiqueta }) {
  const enGamma = Gamma.includes(valor)
  return (
    <span className="selector-simbolo">
      <select value={enGamma ? valor : OTRO} onChange={(e) => onCambio(e.target.value === OTRO ? '' : e.target.value)} aria-label={etiqueta}>
        {Gamma.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
        <option value={OTRO}>nuevo…</option>
      </select>
      {!enGamma && (
        <input
          value={valor}
          maxLength={1}
          autoFocus
          placeholder="?"
          aria-label={`${etiqueta}: símbolo nuevo para Γ`}
          onChange={(e) => onCambio(e.target.value)}
        />
      )}
    </span>
  )
}

function SelectorEstado({ valor, estados, onCambio, etiqueta }) {
  return (
    <select value={valor} onChange={(e) => onCambio(e.target.value)} aria-label={etiqueta}>
      {estados.map((q) => (
        <option key={q} value={q}>{conSubindice(q)}</option>
      ))}
    </select>
  )
}

function FormularioTransicion({ M, inicial, editando, onGuardar, onCancelar }) {
  const [t, setT] = useState(inicial)
  useEffect(() => setT(inicial), [inicial])
  const cambiar = (campo) => (valor) =>
    setT((x) => ({ ...x, [campo]: valor, ...(campo === 'a' && x.c === x.a ? { c: valor } : {}) }))
  const origenes = M.Q.filter((q) => !esParada(M, q))
  const simbolo = (campo, etiqueta) => <SelectorSimbolo valor={t[campo]} Gamma={M.Gamma} onCambio={cambiar(campo)} etiqueta={etiqueta} />

  return (
    <form
      className="formulario-transicion"
      onSubmit={(e) => {
        e.preventDefault()
        onGuardar(t)
      }}
    >
      <p className="tarjeta-titulo">{editando ? 'Editar transición' : 'Nueva transición'}</p>
      <div className="delta-campos">
        <span>δ({M.cache && '['}</span>
        <SelectorEstado valor={t.q} estados={origenes} onCambio={cambiar('q')} etiqueta="Estado de origen" />
        {M.cache && (
          <>
            <span>,</span>
            {simbolo('m', 'Caché leída')}
            <span>]</span>
          </>
        )}
        <span>,</span>
        {simbolo('a', 'Símbolo leído')}
        <span>) = ({M.cache && '['}</span>
        <SelectorEstado valor={t.qj} estados={M.Q} onCambio={cambiar('qj')} etiqueta="Estado destino" />
        {M.cache && (
          <>
            <span>,</span>
            {simbolo('n', 'Caché guardada')}
            <span>]</span>
          </>
        )}
        <span>,</span>
        {simbolo('c', 'Símbolo escrito')}
        <span>,</span>
        <span className="mini-segmentos" role="group" aria-label="Movimiento">
          {movimientosDe(M.modelo).map((d) => (
            <button type="button" key={d} className={t.mov === d ? 'activo' : ''} onClick={() => cambiar('mov')(d)}>
              {d}
            </button>
          ))}
        </span>
        <span>)</span>
      </div>
      <div className="formulario-acciones">
        <button type="submit" className="boton boton-chico boton-primario">
          <Icono nombre="ok" tamano={15} /> {editando ? 'Guardar' : 'Agregar'}
        </button>
        {editando && (
          <button type="button" className="boton boton-chico" onClick={onCancelar}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  )
}

function ListaTransiciones({ titulo, transiciones, onEditar, onEliminar, vacio }) {
  return (
    <div className="lista-transiciones">
      <p className="tarjeta-titulo">{titulo}</p>
      {transiciones.length === 0 && <p className="nota">{vacio}</p>}
      {transiciones.map((t) => (
        <div key={t.linea} className="fila-transicion">
          <Transicion t={t} />
          <button className="boton-mini" onClick={() => onEditar(t)} title="Editar" aria-label={`Editar línea ${t.linea}`}>
            <Icono nombre="lapiz" tamano={14} />
          </button>
          <button className="boton-mini peligro" onClick={() => onEliminar(t)} title="Eliminar" aria-label={`Eliminar línea ${t.linea}`}>
            <Icono nombre="error" tamano={14} />
          </button>
        </div>
      ))}
    </div>
  )
}

export default function InspectorDiagrama({ maquina: M, textos, seleccion, onAplicar, onSeleccionar, onRenombrado }) {
  const [error, setError] = useState(null)
  const [edicion, setEdicion] = useState(null)
  const [nombre, setNombre] = useState(seleccion.q ?? '')
  const clave = seleccion.tipo === 'estado' ? seleccion.q : `${seleccion.desde}>${seleccion.hacia}`

  useEffect(() => {
    setEdicion(null)
    setError(null)
    setNombre(seleccion.q ?? '')
  }, [clave, seleccion.q])

  const aplicar = (resultado, despues) => {
    if (resultado.error) {
      setError(resultado.error)
      return
    }
    setError(null)
    onAplicar(resultado.textos)
    despues?.()
  }

  const desde = seleccion.tipo === 'estado' ? seleccion.q : seleccion.desde
  const hacia = seleccion.tipo === 'estado' ? null : seleccion.hacia
  const [inicial, setInicial] = useState(() => valoresIniciales(M, desde, hacia))
  useEffect(() => setInicial(valoresIniciales(M, desde, hacia)), [clave])

  const editar = (t) => {
    setEdicion(t.linea)
    setInicial({ q: t.q, qj: t.qj, a: t.a, c: t.c, mov: t.mov, ...(M.cache ? { m: t.m ?? BLANCO, n: t.n ?? BLANCO } : {}) })
  }
  const eliminar = (t) => aplicar(eliminarTransicion(textos, t.linea), () => edicion === t.linea && setEdicion(null))
  const guardar = (t) =>
    aplicar(guardarTransicion(textos, t, edicion), () => {
      setEdicion(null)
      setInicial(valoresIniciales(M, desde, hacia))
    })

  const hopcroft = esHopcroft(M)
  const roles = hopcroft
    ? [
        { campo: 'q0', etiqueta: 'Inicial', activo: (q) => M.q0 === q },
        { campo: 'final', etiqueta: 'Final (∈ F)', activo: (q) => M.F.includes(q), alterna: true },
      ]
    : ROLES_SIPSER.map((r) => ({ ...r, activo: (q) => M[r.campo] === q }))
  const protegido = (q) => (hopcroft ? M.q0 === q : ROLES_SIPSER.some(({ campo }) => M[campo] === q))
  const formulario = (
    <FormularioTransicion
      M={M}
      inicial={inicial}
      editando={edicion !== null}
      onGuardar={guardar}
      onCancelar={() => {
        setEdicion(null)
        setInicial(valoresIniciales(M, desde, hacia))
      }}
    />
  )

  return (
    <aside className="inspector" aria-label="Edición del diagrama">
      <header className="inspector-cabecera">
        <h3>
          {seleccion.tipo === 'estado' ? (
            <>Estado <Estado q={seleccion.q} /></>
          ) : (
            <><Estado q={seleccion.desde} /> → <Estado q={seleccion.hacia} /></>
          )}
        </h3>
        <button className="boton-mini" onClick={() => onSeleccionar(null)} aria-label="Cerrar" title="Cerrar">
          <Icono nombre="error" tamano={15} />
        </button>
      </header>

      {error && <p className="mensaje error inspector-error">{error}</p>}

      {seleccion.tipo === 'estado' && (
        <>
          <form
            className="fila-nombre"
            onSubmit={(e) => {
              e.preventDefault()
              const nuevo = normalizarEstado(nombre.trim())
              aplicar(renombrarEstado(textos, seleccion.q, nombre), () => onRenombrado(seleccion.q, nuevo))
            }}
          >
            <label>
              <span className="tarjeta-titulo">Nombre</span>
              <input value={nombre} onChange={(e) => setNombre(e.target.value)} spellCheck={false} />
            </label>
            <button type="submit" className="boton boton-chico" disabled={!nombre.trim() || nombre.trim() === seleccion.q}>
              Renombrar
            </button>
          </form>

          <div>
            <p className="tarjeta-titulo">Papel en M</p>
            <div className="mini-segmentos roles" role="group" aria-label="Papel del estado">
              {roles.map(({ campo, etiqueta, activo, alterna }) => (
                <button
                  key={campo}
                  className={activo(seleccion.q) ? 'activo' : ''}
                  aria-pressed={activo(seleccion.q)}
                  onClick={() => (alterna || !activo(seleccion.q)) && aplicar(asignarRol(textos, campo, seleccion.q))}
                >
                  {etiqueta}
                </button>
              ))}
            </div>
          </div>

          <ListaTransiciones
            titulo="Transiciones que salen"
            transiciones={M.transiciones.filter((t) => t.q === seleccion.q)}
            vacio={esParada(M, seleccion.q) ? 'Los estados de parada no producen más configuraciones.' : 'Ninguna todavía.'}
            onEditar={editar}
            onEliminar={eliminar}
          />
          <ListaTransiciones
            titulo="Transiciones que llegan"
            transiciones={M.transiciones.filter((t) => t.qj === seleccion.q && t.q !== seleccion.q)}
            vacio="Ninguna."
            onEditar={editar}
            onEliminar={eliminar}
          />
        </>
      )}

      {seleccion.tipo === 'arista' && (
        <ListaTransiciones
          titulo="Transiciones de esta arista"
          transiciones={M.transiciones.filter((t) => t.q === seleccion.desde && t.qj === seleccion.hacia)}
          vacio="Ya no hay transiciones entre estos estados."
          onEditar={editar}
          onEliminar={eliminar}
        />
      )}

      {formulario}

      {seleccion.tipo === 'estado' && (
        <button
          className="boton boton-chico peligro eliminar-estado"
          disabled={protegido(seleccion.q)}
          title={protegido(seleccion.q) ? 'Asigna su papel a otro estado antes de eliminarlo' : 'Eliminar el estado y sus transiciones'}
          onClick={() => aplicar(eliminarEstado(textos, seleccion.q), () => onSeleccionar(null))}
        >
          <Icono nombre="error" tamano={15} /> Eliminar estado
        </button>
      )}
    </aside>
  )
}
