import { conSubindice as f, conjunto, firmaDelta, subindice, transicionATexto } from './notacion.js'
import { configuracionATexto } from './maquina.js'
import { ENCABEZADOS, analizarEntrada } from './parser.js'
import { RESULTADOS } from './simulador.js'

const MARCAS = { ok: '[✓]', error: '[✗]', advertencia: '[!]' }

export const nombreConfiguracion = (i) => `C${subindice(i + 1)}`

export function especificacionATexto({ definicion, transiciones, entrada }) {
  const { w } = analizarEntrada(entrada)
  return [
    `${ENCABEZADOS.definicion}\n${definicion.trim()}`,
    `${ENCABEZADOS.transiciones}\n${transiciones.trim()}`,
    `${ENCABEZADOS.entrada}\nw = ${w || 'ε'}`,
  ].join('\n\n') + '\n'
}

export function maquinaATexto(M) {
  return [
    `${f(M.nombre)} = (Q, Σ, Γ, δ, ${f(M.q0)}, ${f(M.qaccept)}, ${f(M.qreject)})`,
    `Q = ${conjunto(M.Q, f)}`,
    `Σ = ${conjunto(M.Sigma)}`,
    `Γ = ${conjunto(M.Gamma)}`,
    ...(M.cintas > 1 ? [`cintas = ${M.cintas}   (${firmaDelta(M.cintas)}; w va en la cinta 1)`] : []),
  ]
}

export function explicarResultado(M, sim) {
  const { pasos, resultado, ciclo, limite } = sim
  const n = pasos.length - 1
  const Ck = `${nombreConfiguracion(n)} = ${configuracionATexto(pasos[n].configuracion)}`

  if (resultado === RESULTADOS.acepta) {
    return [`${Ck} es una configuración de aceptación (su estado es qaccept).`, 'M acepta w, por lo tanto w ∈ L(M).']
  }
  if (resultado === RESULTADOS.rechaza) {
    return [`${Ck} es una configuración de rechazo (su estado es qreject).`, 'M rechaza w, por lo tanto w ∉ L(M).']
  }
  if (resultado === RESULTADOS.ciclo && ciclo.tipo === 'repeticion') {
    const [a, b] = [nombreConfiguracion(ciclo.desde), nombreConfiguracion(ciclo.hasta)]
    return [
      `${b} = ${a} = ${configuracionATexto(pasos[ciclo.desde].configuracion)}.`,
      'Como M es determinista, cada configuración produce exactamente una configuración;',
      `por lo tanto la secuencia ${a}, …, ${nombreConfiguracion(ciclo.hasta - 1)} se repite indefinidamente`,
      'y M nunca entra a qaccept ni a qreject: M entra en un ciclo sobre w, así que w ∉ L(M).',
    ]
  }
  if (resultado === RESULTADOS.ciclo) {
    const [a, b] = [nombreConfiguracion(ciclo.desde), nombreConfiguracion(ciclo.hasta)]
    const q = f(pasos[ciclo.desde].configuracion.q)
    if (Array.isArray(ciclo.desplazamiento)) {
      return [
        `En ${a} y en ${b} la máquina está en ${q} y, en cada cinta, todas las celdas desde la cabeza hacia la derecha contienen ⊔;`,
        `entre ambas, ninguna cabeza estuvo a la izquierda de su posición en ${a}.`,
        `Por lo tanto, desde ${b} se repite el mismo cálculo desplazado (${ciclo.desplazamiento.join(', ')}) celdas en las cintas, una y otra vez:`,
        'M nunca se detiene sobre w (ciclo infinito), así que w ∉ L(M).',
      ]
    }
    return [
      `En ${a} y en ${b} la máquina está en ${q}, todas las celdas desde la cabeza hacia la derecha contienen ⊔`,
      `y entre ambas la cabeza nunca estuvo a la izquierda de su posición en ${a}.`,
      `Por lo tanto, desde ${b} se repite el mismo cálculo desplazado ${ciclo.desplazamiento} celda(s) a la derecha, una y otra vez:`,
      'M nunca se detiene sobre w (ciclo infinito), así que w ∉ L(M).',
    ]
  }
  return [
    `M no entró a qaccept ni a qreject en ${limite} pasos (límite de la simulación).`,
    'No existe un algoritmo que decida en general si M se detendrá (problema de la parada),',
    'así que la ejecución queda sin resultado dentro de este límite.',
  ]
}

const TITULO_RESULTADO = {
  acepta: 'M ACEPTA w',
  rechaza: 'M RECHAZA w',
  ciclo: 'M NO SE DETIENE (ciclo infinito)',
  limite: 'SIN RESULTADO (límite de pasos)',
}

export function reporteATexto(verificacion, sim, fecha = new Date()) {
  const M = verificacion.maquina
  const L = []
  const titulo = (t) => L.push('', '', t, '-'.repeat(t.length))

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
  if (M.sinDefinir) {
    L.push('', `Combinaciones no definidas (${M.sinDefinir}): se asume δ(q, a₁, …, aₖ) = (qreject, a₁, …, aₖ, R, …, R)`)
  }

  titulo('2. Verificación de la especificación')
  for (const c of verificacion.comprobaciones) {
    L.push(`${MARCAS[c.estado]} ${c.regla}`)
    for (const d of c.detalle) L.push(`      ${d}`)
  }

  titulo('3. Entrada')
  L.push(`w = ${sim.w || 'ε'}   (|w| = ${[...sim.w].length})${M.cintas > 1 ? '   en la cinta 1; las demás cintas empiezan en blanco' : ''}`)
  L.push(`Configuración inicial: ${nombreConfiguracion(0)} = ${configuracionATexto(sim.pasos[0].configuracion)}`)

  titulo('4. Configuraciones')
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

  titulo('5. Resultado')
  L.push(TITULO_RESULTADO[sim.resultado])
  L.push(`Pasos ejecutados: ${sim.pasos.length - 1}`)
  L.push('')
  L.push(...explicarResultado(M, sim))

  return L.join('\n') + '\n'
}
