import Icono from './Icono.jsx'

const ICONO = { ok: 'ok', error: 'error', advertencia: 'aviso' }

export default function PanelVerificacion({ comprobaciones, valida }) {
  const aprobadas = comprobaciones.filter((c) => c.estado !== 'error').length
  return (
    <section className="panel verificacion">
      <header className="panel-cabecera">
        <div>
          <h2>Verificación de M</h2>
          <p className="formula">Definición 1 · máquina de Turing determinista</p>
        </div>
        <span className={`insignia ${valida ? 'insignia-ok' : 'insignia-error'}`}>
          {aprobadas}/{comprobaciones.length}
        </span>
      </header>
      <ul className="comprobaciones">
        {comprobaciones.map((c) => (
          <li key={c.regla} className={`comprobacion ${c.estado}`} title={c.detalle.join('\n')}>
            <Icono nombre={ICONO[c.estado]} tamano={15} />
            <span>{c.regla}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
