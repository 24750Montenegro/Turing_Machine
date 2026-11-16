import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { separarEspecificacion } from '../src/services/parser.js'
import { verificar } from '../src/services/validador.js'
import { simular } from '../src/services/simulador.js'
import { reporteATexto } from '../src/services/exportador.js'

const ruta = (archivo) => fileURLToPath(new URL(`../${archivo}`, import.meta.url))
const sinFecha = (texto) => texto.replace(/^Generado: .*$/m, '')

async function abrir(page) {
  const errores = []
  page.on('pageerror', (e) => errores.push(e.message))
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await expect(page.getByRole('button', { name: 'Simular' })).toBeVisible()
  return errores
}

async function cargar(page, archivo) {
  const selector = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Cargar especificación' }).click()
  await (await selector).setFiles(ruta(archivo))
  await page.getByRole('button', { name: 'Cargar en las tres secciones' }).click()
}

async function simularHastaElFinal(page) {
  await page.getByRole('button', { name: 'Simular' }).click()
  await page.keyboard.press('End')
  return page.locator('.resultado-titulo')
}

const editor = (page, titulo) => page.locator('section.editor', { has: page.getByRole('heading', { name: titulo }) }).locator('textarea')

const CASOS = [
  { archivo: 'ejemplos/inciso-b-acepta.txt', titulo: 'M acepta w', reporte: 'M ACEPTA w' },
  { archivo: 'ejemplos/inciso-b-rechaza.txt', titulo: 'M rechaza w', reporte: 'M RECHAZA w' },
  { archivo: 'ejemplos/inciso-b-ciclo.txt', titulo: 'M no se detiene', reporte: 'M NO SE DETIENE (ciclo infinito)' },
]

for (const { archivo, titulo, reporte } of CASOS) {
  test(`Carga ${archivo}, verifica, simula y exporta las configuraciones`, async ({ page }) => {
    const errores = await abrir(page)
    await cargar(page, archivo)
    await expect(page.getByText('M = (Q, Σ, Γ, δ, q1, qaccept, qreject)').first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Simular' })).toBeEnabled()

    await expect(await simularHastaElFinal(page)).toHaveText(titulo)

    const descarga = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exportar .txt', exact: true }).click()
    const exportado = readFileSync(await (await descarga).path(), 'utf8')
    const v = verificar(separarEspecificacion(readFileSync(ruta(archivo), 'utf8')))
    expect(sinFecha(exportado)).toBe(sinFecha(reporteATexto(v, simular(v.maquina, v.w))))
    expect(exportado).toContain(reporte)
    expect(errores).toEqual([])
  })
}

test('Muestra los errores de la especificación y Ctrl + Z los deshace', async ({ page }) => {
  await abrir(page)
  await cargar(page, 'ejemplos/inciso-b-acepta.txt')
  const componentes = editor(page, 'Gramática · componentes')
  const original = await componentes.inputValue()
  await componentes.fill(original.replace('Σ = {0, 1}', 'Σ = {0, 1, ⊔}'))
  await expect(page.getByText('El símbolo blanco ⊔ no puede pertenecer al alfabeto de entrada Σ')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Simular' })).toBeDisabled()

  await componentes.press('Control+z')
  await expect(componentes).toHaveValue(original)
  await expect(page.getByRole('button', { name: 'Simular' })).toBeEnabled()
})

test('El diagrama resalta el estado y anima la transición aplicada', async ({ page }) => {
  await abrir(page)
  await cargar(page, 'ejemplos/inciso-b-ciclo.txt')
  await page.getByRole('tab', { name: 'Diagrama de estados' }).click()
  await expect(page.locator('.diagrama-lienzo [data-estado]')).toHaveCount(8)
  await expect(page.locator('.diagrama-lienzo').getByText('0 → x, R')).toBeVisible()

  await page.getByRole('button', { name: 'Simular' }).click()
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('.mt-nodo.activo[data-estado="q5"]')).toHaveCount(1)
  await expect(page.locator('circle.mt-ficha')).toHaveCount(1)
  await expect(page.locator('.mt-arista.activa')).not.toHaveCount(0)
})

test('Editar el diagrama escribe en la especificación y se puede deshacer', async ({ page }) => {
  await abrir(page)
  await cargar(page, 'ejemplos/inciso-b-acepta.txt')
  await page.getByRole('tab', { name: 'Diagrama de estados' }).click()
  await page.getByRole('button', { name: 'Editar' }).click()
  await page.getByRole('button', { name: 'Estado', exact: true }).click()
  const componentes = editor(page, 'Gramática · componentes')
  await expect(componentes).toHaveValue(/Q = \{q1, q2, q3, q4, q5, q6, qaccept, qreject, q7\}/)

  await page.getByRole('button', { name: 'Deshacer' }).click()
  await expect(componentes).toHaveValue(/Q = \{q1, q2, q3, q4, q5, q6, qaccept, qreject\}/)
})

test('Simula una máquina de dos cintas', async ({ page }) => {
  const errores = await abrir(page)
  await page.getByRole('button', { name: 'Ejemplos' }).click()
  await page.getByRole('button', { name: /Dos cintas/ }).click()
  await expect(await simularHastaElFinal(page)).toHaveText('M acepta w')
  await expect(page.locator('.config-grande').first()).toContainText('(0011⊔qaccept, $qacceptxx⊔)')

  const cintas = page.getByRole('group', { name: 'Cinta que muestra la máquina' })
  await expect(cintas.getByRole('button')).toHaveCount(2)
  await cintas.getByRole('button', { name: '2' }).click()
  await expect(cintas.getByRole('button', { name: '2' })).toHaveAttribute('aria-pressed', 'true')
  expect(errores).toEqual([])
})

test('Las tres vistas de la máquina 3D funcionan', async ({ page }) => {
  const errores = await abrir(page)
  for (const vista of ['Planta', 'Frontal', '3D']) {
    await page.getByRole('button', { name: vista, exact: true }).click()
    await expect(page.getByRole('button', { name: vista, exact: true })).toHaveClass(/activo/)
  }
  await expect(page.locator('canvas.lienzo-3d')).toBeVisible()
  expect(errores).toEqual([])
})
