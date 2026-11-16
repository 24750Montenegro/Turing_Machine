import incisoBAcepta from '../ejemplos/inciso-b-acepta.txt?raw'
import incisoBRechaza from '../ejemplos/inciso-b-rechaza.txt?raw'
import incisoBCiclo from '../ejemplos/inciso-b-ciclo.txt?raw'
import m2 from '../ejemplos/m2-potencias-de-dos.txt?raw'
import m1 from '../ejemplos/m1-w-numeral-w.txt?raw'
import dosCintas from '../ejemplos/dos-cintas-0n1n.txt?raw'

export const EJEMPLOS = [
  { id: 'b-acepta', titulo: 'Inciso b · aceptación', detalle: '0ⁿ1ⁿ con w = 000111', texto: incisoBAcepta },
  { id: 'b-rechaza', titulo: 'Inciso b · rechazo', detalle: 'w = 00011 llega a qreject', texto: incisoBRechaza },
  { id: 'b-ciclo', titulo: 'Inciso b · ciclo infinito', detalle: 'w = 1100 nunca se detiene', texto: incisoBCiclo },
  { id: 'm2', titulo: 'M₂ de clase', detalle: '{0^(2^n) | n ≥ 0} con w = 0000', texto: m2 },
  { id: 'm1', titulo: 'M₁ de clase', detalle: '{w#w | w ∈ {0,1}*} con w = 01#01', texto: m1 },
  { id: 'dos-cintas', titulo: 'Dos cintas · 0ⁿ1ⁿ', detalle: 'δ(q, a₁, a₂) = (q′, b₁, b₂, D₁, D₂) con w = 0011', texto: dosCintas },
]
