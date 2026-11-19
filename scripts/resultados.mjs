import { readdirSync, writeFileSync } from 'node:fs'
import { join, parse } from 'node:path'
import { fileURLToPath } from 'node:url'
import { simularCadenas } from '../src/services/simulador.js'
import { reporteATexto } from '../src/services/exportador.js'
import { leerEspecificacion } from './leer-especificacion.mjs'

const raiz = fileURLToPath(new URL('..', import.meta.url))

for (const archivo of readdirSync(join(raiz, 'ejemplos')).filter((a) => /\.(txt|ya?ml)$/.test(a)).sort()) {
  const verificacion = leerEspecificacion(join(raiz, 'ejemplos', archivo))
  const simulaciones = simularCadenas(verificacion.maquina, verificacion.cadenas)
  const destino = join('resultados', `${parse(archivo).name}.txt`)
  writeFileSync(join(raiz, destino), reporteATexto(verificacion, simulaciones), 'utf8')
  console.log(`${destino}: ${simulaciones.map((s) => `${s.w || 'ε'} → ${s.resultado}`).join(', ')}`)
}
