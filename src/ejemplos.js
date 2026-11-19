import incisoBAcepta from '../ejemplos/inciso-b-acepta.txt?raw'
import incisoBRechaza from '../ejemplos/inciso-b-rechaza.txt?raw'
import incisoBCiclo from '../ejemplos/inciso-b-ciclo.txt?raw'
import m2 from '../ejemplos/m2-potencias-de-dos.txt?raw'
import m1 from '../ejemplos/m1-w-numeral-w.txt?raw'
import luhn from '../ejemplos/reconocedora-luhn.yaml?raw'
import reconocedora from '../ejemplos/reconocedora-w-numeral-w.yaml?raw'
import alteradora from '../ejemplos/alteradora-invertir.yaml?raw'
import { yamlAEspecificacion } from './services/yaml.js'

const desdeYaml = (contenido, nombre) => yamlAEspecificacion(contenido, nombre).texto

export const EJEMPLOS = [
  { id: 'b-acepta', grupo: 'Lógica Matemática (.txt)', titulo: 'Inciso b · aceptación', detalle: '0ⁿ1ⁿ con w = 000111', texto: incisoBAcepta },
  { id: 'b-rechaza', grupo: 'Lógica Matemática (.txt)', titulo: 'Inciso b · rechazo', detalle: 'w = 00011 llega a qreject', texto: incisoBRechaza },
  { id: 'b-ciclo', grupo: 'Lógica Matemática (.txt)', titulo: 'Inciso b · ciclo infinito', detalle: 'w = 1100 nunca se detiene', texto: incisoBCiclo },
  { id: 'm2', grupo: 'Lógica Matemática (.txt)', titulo: 'M₂ de clase', detalle: '{0^(2^n) | n ≥ 0} con w = 0000', texto: m2 },
  { id: 'm1', grupo: 'Lógica Matemática (.txt)', titulo: 'M₁ de clase', detalle: '{w#w | w ∈ {0,1}*} con w = 01#01', texto: m1 },
  {
    id: 'luhn',
    grupo: 'Proyecto 3 (.yaml, con caché)',
    titulo: 'Reconocedora · algoritmo de Luhn',
    detalle: 'tarjetas de 13 a 19 dígitos: 2 válidas y 2 rechazadas',
    texto: desdeYaml(luhn, 'reconocedora-luhn.yaml'),
  },
  {
    id: 'reconocedora',
    grupo: 'Proyecto 3 (.yaml, con caché)',
    titulo: 'Reconocedora · w#w',
    detalle: '{w#w | w ∈ {a,b}*}: 2 cadenas aceptadas y 2 rechazadas',
    texto: desdeYaml(reconocedora, 'reconocedora-w-numeral-w.yaml'),
  },
  {
    id: 'alteradora',
    grupo: 'Proyecto 3 (.yaml, con caché)',
    titulo: 'Alteradora · invertir w',
    detalle: 'w ↦ wᴿ sobre 4 cadenas',
    texto: desdeYaml(alteradora, 'alteradora-invertir.yaml'),
  },
]
