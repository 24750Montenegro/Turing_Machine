// Genera en entrega/ los archivos para Canvas usando la aplicación real en un navegador (Playwright).
import { execFileSync } from 'node:child_process'
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'
import { createServer } from 'vite'
import { separarEspecificacion } from '../src/services/parser.js'
import { verificar } from '../src/services/validador.js'
import { simular } from '../src/services/simulador.js'
import { configuracionATexto, delta } from '../src/services/maquina.js'
import { conSubindice, transicionATexto } from '../src/services/notacion.js'
import { maquinaATexto, nombreConfiguracion, reporteATexto } from '../src/services/exportador.js'
import { aristasDiagrama } from '../src/services/diagrama.js'
import { diagramaSVG } from '../src/diagrama/svg.js'
import { argumentos, canal } from './navegador.mjs'

const RAIZ = fileURLToPath(new URL('..', import.meta.url))
const SALIDA = join(RAIZ, 'entrega')
const SITIO = 'https://24750montenegro.github.io/Turing_Machine/'
const ESPERADO = { acepta: 'M ACEPTA w', rechaza: 'M RECHAZA w', ciclo: 'M NO SE DETIENE (ciclo infinito)' }

const CASOS = [
  { nombre: 'aceptacion', archivo: 'ejemplos/inciso-b-acepta.txt', entrada: 'c', salida: 'd', resultado: 'acepta' },
  { nombre: 'rechazo', archivo: 'ejemplos/inciso-b-rechaza.txt', entrada: 'e', salida: 'f', resultado: 'rechaza' },
  { nombre: 'ciclo', archivo: 'ejemplos/inciso-b-ciclo.txt', entrada: 'g', salida: 'h', resultado: 'ciclo' },
]

const leer = (archivo) => readFileSync(join(RAIZ, archivo), 'utf8')
const sinFecha = (texto) => texto.replace(/^Generado: .*$/m, '')
const git = (...args) => execFileSync('git', args, { cwd: RAIZ, encoding: 'utf8' })
const paso = (texto) => console.log(`· ${texto}`)

function fallar(mensaje) {
  console.error(`\n✗ ${mensaje}`)
  process.exit(1)
}

const pendientes = git('status', '--porcelain').trim()
if (pendientes) console.warn(`Aviso: hay cambios sin commit; el .zip del programa se arma con el último commit.\n${pendientes}\n`)

rmSync(SALIDA, { recursive: true, force: true })
for (const carpeta of ['a-programa', 'b-diagrama', 'i-ejecucion/capturas']) mkdirSync(join(SALIDA, carpeta), { recursive: true })

const servidor = await createServer({ root: RAIZ, logLevel: 'error', server: { port: 5199 } })
await servidor.listen()
const URL_APP = servidor.resolvedUrls.local[0]
const navegador = await chromium.launch({ channel: canal, args: argumentos })
const contexto = await navegador.newContext({ viewport: { width: 1600, height: 950 }, acceptDownloads: true })

try {
  const resumen = []
  for (const caso of CASOS) {
    paso(`${caso.archivo}: cargar, verificar, simular y exportar desde la página`)
    const page = await contexto.newPage()
    const errores = []
    page.on('pageerror', (e) => errores.push(e.message))
    await page.goto(URL_APP)
    await page.evaluate(() => localStorage.clear())
    await page.reload()

    const selector = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: 'Cargar especificación' }).click()
    await (await selector).setFiles(join(RAIZ, caso.archivo))
    await page.getByRole('button', { name: 'Cargar en las tres secciones' }).click()
    if (!(await page.getByRole('button', { name: 'Simular' }).isEnabled())) fallar(`${caso.archivo} no pasó la verificación`)

    await page.getByRole('button', { name: 'Simular' }).click()
    await page.keyboard.press('End')
    await page.locator('.resultado-titulo').waitFor()
    await page.waitForTimeout(1600)
    await page.screenshot({ path: join(SALIDA, 'i-ejecucion/capturas', `${caso.nombre}-maquina-3d.png`) })

    const descarga = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exportar .txt', exact: true }).click()
    const destino = join(SALIDA, `${caso.salida}-salida-${caso.nombre}.txt`)
    await (await descarga).saveAs(destino)

    await page.getByRole('tab', { name: 'Diagrama de estados' }).click()
    await page.waitForTimeout(400)
    await page.screenshot({ path: join(SALIDA, 'i-ejecucion/capturas', `${caso.nombre}-diagrama.png`) })
    await page.close()

    const exportado = readFileSync(destino, 'utf8')
    const v = verificar(separarEspecificacion(leer(caso.archivo)))
    const sim = simular(v.maquina, v.w)
    if (sinFecha(exportado) !== sinFecha(reporteATexto(v, sim))) fallar(`La salida de ${caso.archivo} no coincide con los servicios`)
    if (sim.resultado !== caso.resultado || !exportado.includes(ESPERADO[caso.resultado])) fallar(`${caso.archivo} debía dar «${caso.resultado}»`)
    if (errores.length) fallar(`Errores en la página: ${errores.join('; ')}`)

    copyFileSync(join(RAIZ, caso.archivo), join(SALIDA, `${caso.entrada}-entrada-${caso.nombre}.txt`))
    const n = sim.pasos.length - 1
    resumen.push({ ...caso, w: sim.w, pasos: n, ultima: `${nombreConfiguracion(n)} = ${configuracionATexto(sim.pasos[n].configuracion)}`, ciclo: sim.ciclo })
  }

  paso('Inciso b: diagramas y documento de diseño')
  const M = verificar(separarEspecificacion(leer('ejemplos/inciso-b-acepta.txt'))).maquina
  const posiciones = JSON.parse(leer('docs/posiciones-inciso-b.json'))
  const completo = diagramaSVG(M, aristasDiagrama(M), posiciones, { fondo: true })
  const sinRechazo = diagramaSVG(M, aristasDiagrama(M).filter((a) => a.hacia !== M.qreject), posiciones, { fondo: true })
  writeFileSync(join(SALIDA, 'b-diagrama/inciso-b-diagrama.svg'), completo)
  writeFileSync(join(SALIDA, 'b-diagrama/inciso-b-diagrama-sin-rechazo.svg'), sinRechazo)

  const imagen = await navegador.newPage({ deviceScaleFactor: 2 })
  for (const [svg, nombre] of [[completo, 'inciso-b-diagrama.png'], [sinRechazo, 'inciso-b-diagrama-sin-rechazo.png']]) {
    await imagen.setContent(`<body style="margin:0;background:#fff">${svg}</body>`)
    await imagen.locator('svg').screenshot({ path: join(SALIDA, 'b-diagrama', nombre) })
  }
  await imagen.setContent(documentoInciso(M, completo, sinRechazo, resumen), { waitUntil: 'load' })
  await imagen.pdf({ path: join(SALIDA, 'b-diagrama/inciso-b-maquina.pdf'), format: 'Letter', printBackground: true, margin: { top: '18mm', bottom: '18mm', left: '16mm', right: '16mm' } })
  await imagen.close()

  paso('Inciso a: código fuente del último commit')
  git('archive', '--format=zip', '--prefix=maquina-de-turing/', '-o', join(SALIDA, 'a-programa/maquina-de-turing.zip'), 'HEAD')
  writeFileSync(join(SALIDA, 'a-programa/LEEME.txt'), leemePrograma(git('log', '-1', '--format=%h %s').trim()))
  writeFileSync(join(SALIDA, 'i-ejecucion/LEEME.txt'), leemeEjecucion())
  writeFileSync(join(SALIDA, 'LEEME.txt'), indice(resumen))
  console.log(`\n✓ Entrega lista en ${SALIDA}`)
} finally {
  await navegador.close()
  await servidor.close()
}

function documentoInciso(M, completo, sinRechazo, resumen) {
  const normales = M.Q.filter((q) => q !== M.qaccept && q !== M.qreject)
  const celda = (q, a) => {
    const t = delta(M, q, a)
    return `(${conSubindice(t.qj)}, ${t.c}, ${t.mov})`
  }
  const filas = normales.map((q) => `<tr><th>${conSubindice(q)}</th>${M.Gamma.map((a) => `<td>${celda(q, a)}</td>`).join('')}</tr>`).join('')
  const papeles = [
    ['q₁', 'Marca con x el siguiente 0; si ve y, ya no quedan 0; si w empieza con 1, entra al ciclo'],
    ['q₂', 'Avanza a la derecha sobre 0 e y hasta el primer 1 y lo marca con y'],
    ['q₃', 'Regresa a la izquierda hasta la última x'],
    ['q₄', 'Verifica que a la derecha solo queden y, hasta ⊔'],
    ['q₅', 'Ciclo, ida: avanza a la derecha hasta ⊔'],
    ['q₆', 'Ciclo, vuelta: regresa a la izquierda hasta la x'],
  ]
  const casos = resumen
    .map((c) => `<tr><td>${c.entrada}) ${c.entrada}-entrada-${c.nombre}.txt</td><td>w = ${c.w}</td><td>${{ acepta: 'Acepta', rechaza: 'Rechaza', ciclo: 'No se detiene' }[c.resultado]}</td><td>${c.pasos}</td><td>${c.ultima}${c.ciclo ? ` = ${nombreConfiguracion(c.ciclo.desde)}` : ''}</td></tr>`)
    .join('')
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>
    body { font: 11pt/1.5 'Segoe UI', system-ui, sans-serif; color: #1b1b1f; }
    h1 { font-size: 19pt; margin: 0 0 4px; } h2 { font-size: 13pt; margin: 22px 0 8px; border-bottom: 2px solid #1b1b1f; padding-bottom: 3px; }
    .sub { color: #5f584d; margin: 0 0 14px; } .formal p { margin: 2px 0; font-family: 'Cambria Math', 'Times New Roman', serif; font-size: 12pt; }
    table { border-collapse: collapse; width: 100%; font-size: 10pt; margin: 6px 0; } th, td { border: 1px solid #8d867a; padding: 4px 6px; text-align: left; }
    th { background: #f1e9da; } td { font-family: 'Cambria Math', 'Times New Roman', serif; } .papeles td { font-family: inherit; }
    figure { margin: 10px 0; break-inside: avoid; text-align: center; } figure svg { max-width: 100%; height: auto; max-height: 88mm; } figcaption { font-size: 9.5pt; color: #5f584d; }
    ol { margin: 4px 0; padding-left: 22px; } .nota { font-size: 10pt; color: #5f584d; } pre { font: 10pt 'Cambria Math', Consolas, monospace; background: #f8f2e7; padding: 8px; }
  </style></head><body>
  <h1>Inciso b) Máquina de Turing con aceptación, rechazo y ciclo infinito</h1>
  <p class="sub">Lógica Matemática · Simulador de máquinas de Turing deterministas · notación de clase</p>
  <h2>Descripción informal</h2>
  <p>M = "Sobre la cadena de entrada w:</p>
  <ol>
    <li>Si w empieza con 1, marcar ese 1 con x e ir y venir entre la x y el primer ⊔, para siempre.</li>
    <li>Si w = ε, rechazar.</li>
    <li>Marcar con x el 0 más a la izquierda y buscar hacia la derecha el primer 1. Si no hay, rechazar; si lo hay, marcarlo con y.</li>
    <li>Regresar a la última x y repetir la etapa 3 mientras queden 0 sin marcar.</li>
    <li>Cuando ya no queden 0, recorrer las y. Si aparece un 0 o un 1, rechazar; si se llega a ⊔, aceptar."</li>
  </ol>
  <p>L(M) = {0ⁿ1ⁿ | n ≥ 1}. M reconoce L(M) pero no lo decide: con las cadenas que empiezan con 1 no se detiene.</p>
  <h2>Descripción formal</h2>
  <div class="formal">${maquinaATexto(M).map((l) => `<p>${l}</p>`).join('')}</div>
  <p>δ está definida en todo (Q − {qaccept, qreject}) × Γ:</p>
  <table><tr><th>δ</th>${M.Gamma.map((a) => `<th>${a}</th>`).join('')}</tr>${filas}</table>
  <table class="papeles"><tr><th>Estado</th><th>Papel</th></tr>${papeles.map(([q, p]) => `<tr><td>${q}</td><td>${p}</td></tr>`).join('')}</table>
  <h2>Diagrama de estados</h2>
  <p class="nota">Notación de clase: «a → b, D» lee a, escribe b y mueve la cabeza en la dirección D; «a → D» deja el símbolo igual.</p>
  <figure>${completo}<figcaption>Diagrama completo de M.</figcaption></figure>
  <figure>${sinRechazo}<figcaption>Convención de los diagramas de clase: las transiciones que no se dibujan van a qreject.</figcaption></figure>
  <h2>Archivos de prueba</h2>
  <table><tr><th>Archivo</th><th>Entrada</th><th>Resultado</th><th>Pasos</th><th>Última configuración</th></tr>${casos}</table>
  <h2>Por qué w = 1100 no se detiene</h2>
  <pre>${simular(M, '1100').pasos.map((p, i) => `${nombreConfiguracion(i).padEnd(4)} = ${configuracionATexto(p.configuracion).padEnd(11)} ${p.transicion ? transicionATexto(p.transicion, conSubindice) : ''}`).join('\n')}</pre>
  <p>C₁₃ = C₅. Como M es determinista, cada configuración produce exactamente una configuración, así que la secuencia C₅, …, C₁₂ se repite para siempre y M nunca llega a una configuración de aceptación ni de rechazo.</p>
  </body></html>`
}

function leemePrograma(commit) {
  return `PROGRAMA: SIMULADOR DE MÁQUINAS DE TURING DETERMINISTAS
=====================================================

Lenguaje: JavaScript (React + Vite para la página; Node.js para la terminal y las pruebas).
Versión: commit ${commit}

Versión publicada: ${SITIO}

Ejecutarlo en una computadora (requiere Node.js 20 o superior):
  1. Descomprimir maquina-de-turing.zip y abrir una terminal en la carpeta.
  2. npm install
  3. npm run dev          -> abre la página en http://localhost:5173
  4. npm test             -> pruebas del cálculo formal
  5. npm run simular -- ejemplos/inciso-b-acepta.txt salida.txt
                          -> lee un .txt, lo verifica y escribe las configuraciones

En la página: "Cargar especificación" lee un .txt con los componentes, las transiciones y w;
el panel "Verificación" muestra si la especificación es correcta; "Simular" genera
C₁, C₂, …, Cₖ y "Exportar .txt" guarda las configuraciones en notación de clase.

El cálculo formal está en src/services/ (sin interfaz). La configuración es uqv y no se usa
ningún buffer ni memoria aparte de la cinta. Ver README.md.
`
}

function leemeEjecucion() {
  return `EJECUCIÓN DEL PROGRAMA Y REVISIÓN DE CÓDIGO
==========================================

Antes de la presentación:
  npm install
  npm test              -> pruebas de los servicios (node --test)
  npm run e2e           -> pruebas de la página con Playwright (usa Microsoft Edge en Windows)
  npm run dev           -> la página en http://localhost:5173

Las capturas de esta carpeta las tomó Playwright al generar la entrega: cada archivo
de c), e) y g) se cargó con "Cargar especificación", se simuló hasta el final y se exportó
con "Exportar .txt". La salida exportada se comparó con la que calculan los servicios.

Para volver a generar toda la carpeta entrega/: npm run entrega
`
}

function indice(resumen) {
  const r = Object.fromEntries(resumen.map((c) => [c.nombre, c]))
  const linea = (c) => `w = ${c.w}: ${{ acepta: 'llega a qaccept', rechaza: 'llega a qreject', ciclo: 'no se detiene' }[c.resultado]} (${c.pasos} pasos, ${c.ultima}${c.ciclo ? ` = ${nombreConfiguracion(c.ciclo.desde)}` : ''})`
  return `ENTREGA EN CANVAS
=================

a) Programa ................... a-programa/maquina-de-turing.zip (y a-programa/LEEME.txt)
b) Diseño y diagrama .......... b-diagrama/inciso-b-maquina.pdf
                                 b-diagrama/inciso-b-diagrama.png (.svg)
                                 b-diagrama/inciso-b-diagrama-sin-rechazo.png (.svg)
c) Entrada que acepta ......... c-entrada-aceptacion.txt
d) Salida de c) ............... d-salida-aceptacion.txt
e) Entrada que rechaza ........ e-entrada-rechazo.txt
f) Salida de e) ............... f-salida-rechazo.txt
g) Entrada con ciclo infinito . g-entrada-ciclo.txt
h) Salida de g) ............... h-salida-ciclo.txt
i) Ejecución y revisión ....... i-ejecucion/LEEME.txt y i-ejecucion/capturas/

Las entradas c), e) y g) usan la máquina del inciso b):
  c) ${linea(r.aceptacion)}
  e) ${linea(r.rechazo)}
  g) ${linea(r.ciclo)}

Las salidas d), f) y h) las generó el programa con "Exportar .txt" (Playwright manejó la página).
Versión publicada: ${SITIO}
`
}
