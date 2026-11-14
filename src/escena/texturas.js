import * as THREE from 'three'
import { BLANCO, partesEstado } from '../services/notacion.js'

const FUENTE_MONO = '"JetBrains Mono", Consolas, monospace'
const FUENTE_MATE = '"Cambria Math", "Latin Modern Math", "Times New Roman", serif'
const cache = new Map()

function lienzo(ancho, alto) {
  const c = document.createElement('canvas')
  c.width = ancho
  c.height = alto
  return c
}

function textura(c) {
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}

export function texturaSimbolo(simbolo) {
  if (cache.has(simbolo)) return cache.get(simbolo)
  const c = lienzo(160, 160)
  const ctx = c.getContext('2d')
  if (simbolo === BLANCO) {
    ctx.strokeStyle = '#b3aa98'
    ctx.lineWidth = 11
    ctx.lineJoin = 'miter'
    ctx.beginPath()
    ctx.moveTo(48, 50)
    ctx.lineTo(48, 112)
    ctx.lineTo(112, 112)
    ctx.lineTo(112, 50)
    ctx.stroke()
  } else {
    ctx.fillStyle = '#1b1b1f'
    ctx.font = `800 118px ${FUENTE_MONO}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(simbolo, 80, 88)
  }
  const t = textura(c)
  cache.set(simbolo, t)
  return t
}

export function vaciarCacheSimbolos() {
  for (const t of cache.values()) t.dispose()
  cache.clear()
}

function rectanguloRedondeado(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

export function dibujarEstado(c, estado, rotulo = '') {
  const ctx = c.getContext('2d')
  ctx.clearRect(0, 0, c.width, c.height)
  rectanguloRedondeado(ctx, 6, 6, c.width - 12, c.height - 12, 34)
  ctx.fillStyle = '#fffaf0'
  ctx.fill()
  ctx.lineWidth = 10
  ctx.strokeStyle = '#1b1b1f'
  ctx.stroke()
  if (rotulo) {
    ctx.fillStyle = '#a0957f'
    ctx.font = `700 24px "Space Grotesk", ${FUENTE_MONO}`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText(rotulo, 30, 24)
  }
  if (!estado) return
  const { base, sub } = partesEstado(estado)
  ctx.fillStyle = '#1b1b1f'
  ctx.textBaseline = 'alphabetic'
  ctx.font = `italic 120px ${FUENTE_MATE}`
  const anchoBase = ctx.measureText(base).width
  ctx.font = `italic 68px ${FUENTE_MATE}`
  const anchoSub = ctx.measureText(sub).width
  const escala = Math.min(1, (c.width - 70) / (anchoBase + anchoSub + 6))
  const x = (c.width - (anchoBase + anchoSub + 6) * escala) / 2
  ctx.save()
  ctx.textAlign = 'left'
  ctx.translate(x, c.height / 2 + 34 * escala + (rotulo ? 10 : 0))
  ctx.scale(escala, escala)
  ctx.font = `italic 120px ${FUENTE_MATE}`
  ctx.fillText(base, 0, 0)
  ctx.font = `italic 68px ${FUENTE_MATE}`
  ctx.fillText(sub, anchoBase + 6, 26)
  ctx.restore()
}

const COLORES_PANTALLA = {
  listo: '#9fe0c9',
  ejecutando: '#ffd23f',
  acepta: '#5ee08f',
  rechaza: '#ff6b5c',
  ciclo: '#c49bff',
  limite: '#ffb347',
}

export function dibujarPantalla(c, situacion, texto) {
  const ctx = c.getContext('2d')
  ctx.clearRect(0, 0, c.width, c.height)
  rectanguloRedondeado(ctx, 0, 0, c.width, c.height, 26)
  ctx.fillStyle = '#16221f'
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.04)'
  for (let y = 8; y < c.height; y += 8) ctx.fillRect(0, y, c.width, 3)
  ctx.fillStyle = COLORES_PANTALLA[situacion] ?? COLORES_PANTALLA.listo
  ctx.font = `700 58px ${FUENTE_MONO}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(texto, c.width / 2, c.height / 2 + 4)
}

export function crearLienzo(ancho, alto) {
  const c = lienzo(ancho, alto)
  return { lienzo: c, textura: textura(c) }
}
