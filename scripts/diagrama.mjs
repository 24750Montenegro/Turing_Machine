import { readFileSync, writeFileSync } from 'node:fs'
import { aristasDiagrama } from '../src/services/diagrama.js'
import { distribuir } from '../src/diagrama/distribucion.js'
import { diagramaSVG } from '../src/diagrama/svg.js'
import { leerEspecificacion } from './leer-especificacion.mjs'

const [archivo, salida, ...opciones] = process.argv.slice(2)

if (!archivo || !salida) {
  console.error('Uso: npm run diagrama -- <especificacion.txt | maquina.yaml> <salida.svg> [--sin-rechazo] [--posiciones archivo.json]')
  process.exit(1)
}

const { maquina } = leerEspecificacion(archivo)
let aristas = aristasDiagrama(maquina)
if (opciones.includes('--sin-rechazo')) aristas = aristas.filter((a) => a.hacia !== maquina.qreject)
const indice = opciones.indexOf('--posiciones')
const posiciones = indice >= 0 ? JSON.parse(readFileSync(opciones[indice + 1], 'utf8')) : distribuir(maquina, aristas)

writeFileSync(salida, diagramaSVG(maquina, aristas, posiciones, { fondo: true }), 'utf8')
console.log(`Diagrama guardado en ${salida}`)
