import { BLANCO, MODELOS, conSubindice as f, conjunto, estadoATexto, subindice, transicionATexto, tuplaATexto } from './notacion.js'
import { configuracionATexto, contenidoCinta, simboloLeido } from './maquina.js'
import { ENCABEZADOS, analizarEntrada } from './parser.js'
import { RESULTADOS } from './simulador.js'

const MARCAS = { ok: '[✓]', error: '[✗]', advertencia: '[!]' }

export const nombreConfiguracion = (i) => `C${subindice(i + 1)}`

export function especificacionATexto({ definicion, transiciones, entrada }) {
  const { cadenas } = analizarEntrada(entrada)
  return [
    `${ENCABEZADOS.definicion}\n${definicion.trim()}`,
    `${ENCABEZADOS.transiciones}\n${transiciones.trim()}`,
    `${ENCABEZADOS.entrada}\n${cadenas.map(({ w }) => `w = ${w || 'ε'}`).join('\n')}`,
  ].join('\n\n') + '\n'
}

export function maquinaATexto(M) {
  return [
    tuplaATexto(M, f),
    `Q = ${conjunto(M.Q, f)}`,
    `Σ = ${conjunto(M.Sigma)}`,
    `Γ = ${conjunto(M.Gamma)}`,
    ...(M.modelo === MODELOS.hopcroft ? [`F = ${conjunto(M.F, f)}`] : []),
    ...(M.cache ? [`caché = sí   (estados [q, m] con q ∈ Q y m ∈ Γ; la caché empieza en ${BLANCO})`] : []),
  ]
}

export const cintaFinal = (sim) => contenidoCinta(sim.pasos.at(-1).configuracion)

export function explicarResultado(M, sim) {
  const { pasos, resultado, ciclo, limite } = sim
  const n = pasos.length - 1
  const C = pasos[n].configuracion
  const Ck = `${nombreConfiguracion(n)} = ${configuracionATexto(C)}`
  const hopcroft = M.modelo === MODELOS.hopcroft
  const contenido = cintaFinal(sim)
  const cinta = `Contenido de la cinta al terminar: ${contenido || `solo ${BLANCO}`}`
  const nunca = hopcroft ? 'M nunca llega a un estado de F ni se detiene' : 'M nunca entra a qaccept ni a qreject'

  if (resultado === RESULTADOS.acepta) {
    return [
      hopcroft ? `${Ck} es una configuración de aceptación (${f(C.q)} ∈ F).` : `${Ck} es una configuración de aceptación (su estado es qaccept).`,
      'M acepta w, por lo tanto w ∈ L(M).',
      cinta,
      ...(contenido ? [] : ['Advertencia: la cinta quedó solo con blancos.']),
    ]
  }
  if (resultado === RESULTADOS.rechaza && sim.sinTransicion) {
    return [
      `δ(${estadoATexto(C.q, C.m, f)}, ${simboloLeido(C)}) no está definida: M se detiene en ${Ck}.`,
      `${f(C.q)} ∉ F, así que M rechaza w y w ∉ L(M).`,
      cinta,
    ]
  }
  if (resultado === RESULTADOS.rechaza) {
    return [`${Ck} es una configuración de rechazo (su estado es qreject).`, 'M rechaza w, por lo tanto w ∉ L(M).', cinta]
  }
  if (resultado === RESULTADOS.ciclo && ciclo.tipo === 'repeticion') {
    const [a, b] = [nombreConfiguracion(ciclo.desde), nombreConfiguracion(ciclo.hasta)]
    return [
      `${b} = ${a} = ${configuracionATexto(pasos[ciclo.desde].configuracion)}.`,
      'Como M es determinista, cada configuración produce exactamente una configuración;',
      `por lo tanto la secuencia ${a}, …, ${nombreConfiguracion(ciclo.hasta - 1)} se repite indefinidamente`,
      `y ${nunca}: M entra en un ciclo sobre w, así que w ∉ L(M).`,
    ]
  }
  if (resultado === RESULTADOS.ciclo) {
    const [a, b] = [nombreConfiguracion(ciclo.desde), nombreConfiguracion(ciclo.hasta)]
    const C0 = pasos[ciclo.desde].configuracion
    return [
      `En ${a} y en ${b} la máquina está en ${estadoATexto(C0.q, C0.m, f)}, todas las celdas desde la cabeza hacia la derecha contienen ⊔`,
      `y entre ambas la cabeza nunca estuvo a la izquierda de su posición en ${a}.`,
      `Por lo tanto, desde ${b} se repite el mismo cálculo desplazado ${ciclo.desplazamiento} celda(s) a la derecha, una y otra vez:`,
      'M nunca se detiene sobre w (ciclo infinito), así que w ∉ L(M).',
    ]
  }
  return [
    hopcroft ? `M no se detuvo en ${limite} pasos (límite de la simulación).` : `M no entró a qaccept ni a qreject en ${limite} pasos (límite de la simulación).`,
    'No existe un algoritmo que decida en general si M se detendrá (problema de la parada),',
    'así que la ejecución queda sin resultado dentro de este límite.',
  ]
}

export const TITULO_RESULTADO = {
  acepta: 'M ACEPTA w',
  rechaza: 'M RECHAZA w',
  ciclo: 'M NO SE DETIENE (ciclo infinito)',
  limite: 'SIN RESULTADO (límite de pasos)',
}

function tablaConfiguraciones(sim) {
  const L = []
  const nombres = sim.pasos.map((_, i) => nombreConfiguracion(i))
  const configuraciones = sim.pasos.map((p) => configuracionATexto(p.configuracion))
  const anchoNombre = Math.max(...nombres.map((s) => s.length))
  const anchoConfig = Math.min(40, Math.max('configuración'.length, ...configuraciones.map((s) => s.length)))
  const columna = anchoNombre + 3 + anchoConfig + 3
  L.push(`${'Cᵢ'.padEnd(anchoNombre)} = ${'configuración'.padEnd(anchoConfig)}   transición aplicada`)
  sim.pasos.forEach((p, i) => {
    let linea = `${nombres[i].padEnd(anchoNombre)} = ${configuraciones[i]}`
    if (p.transicion) {
      linea = `${linea.padEnd(columna)}${transicionATexto(p.transicion, f)}${p.transicion.implicita ? ' (implícita)' : ''}`
    }
    if (sim.ciclo?.tipo === 'repeticion' && i === sim.ciclo.hasta) linea += `   ← igual a ${nombres[sim.ciclo.desde]}`
    L.push(linea)
  })
  return L
}

const nombreCadena = (i, total) => (total > 1 ? `w${subindice(i + 1)}` : 'w')

export function reporteATexto(verificacion, simulaciones, fecha = new Date()) {
  const sims = Array.isArray(simulaciones) ? simulaciones : [simulaciones]
  const M = verificacion.maquina
  const L = []
  const titulo = (t) => L.push('', '', t, '-'.repeat(t.length))
  const longitud = (w) => `(|w| = ${[...w].length})`

  L.push('SIMULACIÓN DE UNA MÁQUINA DE TURING DETERMINISTA')
  L.push('='.repeat(48))
  L.push(`Generado: ${fecha.toLocaleString('es-GT')}`)

  titulo('1. Especificación')
  L.push(...maquinaATexto(M), '')
  L.push(...M.transiciones.map((t) => transicionATexto(t, f)))
  if (M.implicitas.length) {
    L.push('', 'Pares no definidos (se asumen hacia qreject):')
    L.push(...M.implicitas.map((t) => transicionATexto(t, f)))
  }

  titulo('2. Verificación de la especificación')
  for (const c of verificacion.comprobaciones) {
    L.push(`${MARCAS[c.estado]} ${c.regla}`)
    for (const d of c.detalle) L.push(`      ${d}`)
  }

  if (sims.length === 1) {
    const [sim] = sims
    titulo('3. Entrada')
    L.push(`w = ${sim.w || 'ε'}   ${longitud(sim.w)}`)
    L.push(`Configuración inicial: ${nombreConfiguracion(0)} = ${configuracionATexto(sim.pasos[0].configuracion)}`)
    titulo('4. Configuraciones')
    L.push(...tablaConfiguraciones(sim))
    titulo('5. Resultado')
    L.push(TITULO_RESULTADO[sim.resultado])
    L.push(`Pasos ejecutados: ${sim.pasos.length - 1}`)
    L.push('')
    L.push(...explicarResultado(M, sim))
    return L.join('\n') + '\n'
  }

  titulo('3. Cadenas de entrada')
  const etiquetas = sims.map((s, i) => `${nombreCadena(i, sims.length)} = ${s.w || 'ε'}`)
  const ancho = Math.max(...etiquetas.map((e) => e.length))
  sims.forEach((s, i) => L.push(`${etiquetas[i].padEnd(ancho)}   ${longitud(s.w)}`))

  titulo('4. Resumen')
  const veredictos = sims.map((s) => TITULO_RESULTADO[s.resultado])
  const anchoVeredicto = Math.max(...veredictos.map((v) => v.length))
  sims.forEach((s, i) => {
    const pasos = `${s.pasos.length - 1} pasos`.padEnd(11)
    L.push(`${etiquetas[i].padEnd(ancho)}   ${veredictos[i].padEnd(anchoVeredicto)}   ${pasos}   cinta final: ${cintaFinal(s) || BLANCO}`)
  })

  sims.forEach((sim, i) => {
    titulo(`${5 + i}. Simulación de ${etiquetas[i]}`)
    L.push(`Configuración inicial: ${nombreConfiguracion(0)} = ${configuracionATexto(sim.pasos[0].configuracion)}`, '')
    L.push(...tablaConfiguraciones(sim))
    L.push('', `Resultado: ${TITULO_RESULTADO[sim.resultado]} (${sim.pasos.length - 1} pasos)`)
    L.push(...explicarResultado(M, sim))
  })
  return L.join('\n') + '\n'
}
