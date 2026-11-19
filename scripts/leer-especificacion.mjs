import { readFileSync } from 'node:fs'
import { basename } from 'node:path'
import { separarEspecificacion } from '../src/services/parser.js'
import { verificar } from '../src/services/validador.js'
import { esYaml, yamlAEspecificacion } from '../src/services/yaml.js'

export function leerEspecificacion(archivo) {
  let texto = readFileSync(archivo, 'utf8')
  if (esYaml(archivo)) {
    const convertido = yamlAEspecificacion(texto, basename(archivo))
    if (convertido.errores.length) fallar(convertido.errores.map((e) => `  ${e}`))
    texto = convertido.texto
  }
  const verificacion = verificar(separarEspecificacion(texto))
  if (!verificacion.valida) fallar(verificacion.errores.map((e) => `  [${e.seccion}${e.linea ? `:${e.linea}` : ''}] ${e.mensaje}`))
  return verificacion
}

function fallar(lineas) {
  console.error('La especificación no es válida:')
  for (const l of lineas) console.error(l)
  process.exit(1)
}
