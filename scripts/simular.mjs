import { readFileSync, writeFileSync } from 'node:fs'
import { separarEspecificacion } from '../src/services/parser.js'
import { verificar } from '../src/services/validador.js'
import { simular, LIMITE_PREDETERMINADO } from '../src/services/simulador.js'
import { reporteATexto } from '../src/services/exportador.js'

const [archivo, salida, limite = LIMITE_PREDETERMINADO] = process.argv.slice(2)

if (!archivo) {
  console.error('Uso: npm run simular -- <especificacion.txt> [salida.txt] [limite]')
  process.exit(1)
}

const verificacion = verificar(separarEspecificacion(readFileSync(archivo, 'utf8')))

if (!verificacion.valida) {
  console.error('La especificación no es válida:')
  for (const e of verificacion.errores) console.error(`  [${e.seccion}${e.linea ? `:${e.linea}` : ''}] ${e.mensaje}`)
  process.exit(1)
}

const reporte = reporteATexto(verificacion, simular(verificacion.maquina, verificacion.w, { limite: Number(limite) }))

if (salida) {
  writeFileSync(salida, reporte, 'utf8')
  console.log(`Configuraciones guardadas en ${salida}`)
} else {
  process.stdout.write(reporte)
}
