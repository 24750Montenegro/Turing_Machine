// Genera ejemplos/reconocedora-luhn.yaml (npm run luhn).
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const DIGITOS = [...'0123456789']
const MIN = 13
const MAX = 19
const doble = (d) => (2 * d > 9 ? 2 * d - 9 : 2 * d)

const transiciones = []
const agregar = (comentario, q, m, a, qj, n, c, mov) => transiciones.push({ comentario, q, m, a, qj, n, c, mov })

// c_k: ya leyó k dígitos.
for (let k = 0; k < MAX; k++) {
  for (const d of DIGITOS) agregar(k === 0 && d === '0' ? 'contar los dígitos' : null, `c${k}`, null, d, `c${k + 1}`, null, d, 'R')
}
for (let k = MIN; k <= MAX; k++) agregar(k === MIN ? '13 a 19 dígitos: empezar con suma 0' : null, `c${k}`, null, null, 'sumar', '0', null, 'L')
// La caché guarda la suma mod 10.
for (const s of DIGITOS) {
  for (const d of DIGITOS) {
    const suma = (Number(s) + Number(d)) % 10
    agregar(s === '0' && d === '0' ? 'sumar: suma d' : null, 'sumar', s, d, 'doblar', String(suma), d, 'L')
  }
}
for (const s of DIGITOS) {
  for (const d of DIGITOS) {
    const suma = (Number(s) + doble(Number(d))) % 10
    agregar(s === '0' && d === '0' ? 'doblar: suma 2d (2d − 9 si pasa de 9)' : null, 'doblar', s, d, 'sumar', String(suma), d, 'L')
  }
}
agregar('aceptar si la suma es 0', 'sumar', '0', null, 'acepta', '0', null, 'R')
agregar(null, 'doblar', '0', null, 'acepta', '0', null, 'R')

const estados = [...Array.from({ length: MAX + 1 }, (_, k) => `c${k}`), 'sumar', 'doblar', 'acepta']
const valor = (x) => (x === null ? '' : ` '${x}'`)
const L = [
  '---',
  `# MT reconocedora: tarjetas de ${MIN} a ${MAX} dígitos válidas según Luhn. Generado con npm run luhn.`,
  '# c0…c19 cuentan los dígitos; sumar/doblar recorren de derecha a izquierda con la suma mod 10 en caché.',
  'q_states:',
  '  q_list:',
  ...estados.map((q) => `  - '${q}'`),
  "  initial: 'c0'",
  "  final: 'acepta'",
  'alphabet:',
  ...DIGITOS.map((d) => `- '${d}'`),
  'tape_alphabet:',
  '-',
  'delta:',
]
for (const t of transiciones) {
  if (t.comentario) L.push(`# ${t.comentario}`)
  L.push(
    '- params:',
    `    initial_state: '${t.q}'`,
    `    mem_cache_value:${valor(t.m)}`,
    `    tape_input:${valor(t.a)}`,
    '  output:',
    `    final_state: '${t.qj}'`,
    `    mem_cache_value:${valor(t.n)}`,
    `    tape_output:${valor(t.c)}`,
    `    tape_displacement: ${t.mov}`,
  )
}
L.push(
  '# Dos válidas; la tercera falla Luhn y la cuarta lo cumple pero tiene 11 dígitos.',
  'simulation_strings:',
  "- '4111111111111111'",
  "- '378282246310005'",
  "- '4111111111111112'",
  "- '79927398713'",
)

const destino = fileURLToPath(new URL('../ejemplos/reconocedora-luhn.yaml', import.meta.url))
writeFileSync(destino, `${L.join('\n')}\n`, 'utf8')
console.log(`${transiciones.length} transiciones escritas en ${destino}`)
