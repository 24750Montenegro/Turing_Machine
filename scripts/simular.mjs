import { writeFileSync } from 'node:fs'
import { simularCadenas, LIMITE_PREDETERMINADO } from '../src/services/simulador.js'
import { reporteATexto } from '../src/services/exportador.js'
import { leerEspecificacion } from './leer-especificacion.mjs'

const [archivo, salida, limite = LIMITE_PREDETERMINADO] = process.argv.slice(2)

if (!archivo) {
  console.error('Uso: npm run simular -- <especificacion.txt | maquina.yaml> [salida.txt] [limite]')
  process.exit(1)
}

const verificacion = leerEspecificacion(archivo)
const simulaciones = simularCadenas(verificacion.maquina, verificacion.cadenas, { limite: Number(limite) })
const reporte = reporteATexto(verificacion, simulaciones)

if (salida) {
  writeFileSync(salida, reporte, 'utf8')
  console.log(`Configuraciones guardadas en ${salida}`)
  for (const s of simulaciones) console.log(`  w = ${s.w || 'ε'}: ${s.resultado} (${s.pasos.length - 1} pasos)`)
} else {
  process.stdout.write(reporte)
}
