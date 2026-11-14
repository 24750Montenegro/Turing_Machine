import { configuracionInicial, esParada, produce } from './maquina.js'
import { crearDetectorCiclos } from './ciclos.js'

export const LIMITE_PREDETERMINADO = 1000
export const LIMITE_MAXIMO = 20000

export const RESULTADOS = {
  acepta: 'acepta',
  rechaza: 'rechaza',
  ciclo: 'ciclo',
  limite: 'limite',
}

export function simular(M, w, { limite = LIMITE_PREDETERMINADO, detenerEnCiclo = true } = {}) {
  const inicial = configuracionInicial(M, w)
  const pasos = [{ configuracion: inicial, transicion: null, regla: null }]
  const observar = crearDetectorCiclos(M, inicial)
  let ciclo = null
  let C = inicial

  while (!esParada(M, C.q) && pasos.length - 1 < limite) {
    const paso = produce(M, C)
    pasos.push(paso)
    if (!ciclo) {
      ciclo = observar(C, paso, pasos.length - 1)
      if (ciclo && detenerEnCiclo) break
    }
    C = paso.configuracion
  }

  const final = pasos.at(-1).configuracion
  const resultado =
    final.q === M.qaccept ? RESULTADOS.acepta
      : final.q === M.qreject ? RESULTADOS.rechaza
        : ciclo ? RESULTADOS.ciclo
          : RESULTADOS.limite

  return { w, pasos, resultado, ciclo, limite }
}
