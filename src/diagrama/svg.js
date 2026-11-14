import { partesEstado } from '../services/notacion.js'

const ALTO_LINEA = 15
const ANCHO_CARACTER = 7.9
const ALTO_LAZO = 58

const ESTILO = `
.mt-fondo { fill: #fbf7ef; }
.mt-nodo circle { fill: #fffdf8; stroke: #1b1b1f; stroke-width: 2.5; }
.mt-nodo.aceptacion circle { fill: #d4f3df; }
.mt-nodo.rechazo circle { fill: #fddcd8; }
.mt-nodo.activo circle { fill: #ffd23f; stroke-width: 3.5; }
.mt-nodo text { font: italic 19px 'Cambria Math', 'Latin Modern Math', 'Times New Roman', serif; fill: #1b1b1f; }
.mt-nodo .sub { font-size: 12px; }
.mt-nodo { cursor: grab; }
.mt-arista path { fill: none; stroke: #1b1b1f; stroke-width: 1.7; }
.mt-arista.hacia-rechazo path { stroke: #8d867a; stroke-width: 1.3; }
.mt-arista.hacia-rechazo text { fill: #6f685c; }
.mt-arista.implicita path { stroke-dasharray: 5 4; }
.mt-arista text { font: 13px 'JetBrains Mono', Consolas, monospace; fill: #1b1b1f; paint-order: stroke; stroke: #fbf7ef; stroke-width: 4px; stroke-linejoin: round; }
.mt-arista.activa path { stroke: #e8492c; stroke-width: 3; }
.mt-arista.activa text { fill: #c2341b; font-weight: 700; }
.mt-inicio { fill: none; stroke: #1b1b1f; stroke-width: 1.7; }
`

const escapar = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
const n = (x) => Math.round(x * 10) / 10

export function radioEstado(q) {
  const { base, sub } = partesEstado(q)
  return Math.max(27, 10 + (base.length * 10 + sub.length * 7) / 2)
}

function etiquetaEstado(q) {
  const { base, sub } = partesEstado(q)
  const subindice = sub ? `<tspan class="sub" dy="5">${escapar(sub)}</tspan>` : ''
  return `<text text-anchor="middle" y="${sub ? 3 : 6}">${escapar(base)}${subindice}</text>`
}

const bezier = (s, c, e, t) => ({
  x: (1 - t) ** 2 * s.x + 2 * (1 - t) * t * c.x + t ** 2 * e.x,
  y: (1 - t) ** 2 * s.y + 2 * (1 - t) * t * c.y + t ** 2 * e.y,
})

function curvatura(arista, posiciones, radios, curvada) {
  const p = posiciones[arista.desde]
  const q = posiciones[arista.hacia]
  const largo = Math.hypot(q.x - p.x, q.y - p.y) || 1
  const [nx, ny] = [-(q.y - p.y) / largo, (q.x - p.x) / largo]
  const otros = Object.keys(posiciones).filter((k) => k !== arista.desde && k !== arista.hacia)
  const opciones = curvada ? [30, 55, 85, 120] : [0, 35, -35, 70, -70, 110, -110]
  const libre = (k) => {
    const c = { x: (p.x + q.x) / 2 + nx * k * 2, y: (p.y + q.y) / 2 + ny * k * 2 }
    for (let t = 0.08; t < 0.95; t += 0.04) {
      const b = bezier(p, c, q, t)
      if (otros.some((o) => Math.hypot(b.x - posiciones[o].x, b.y - posiciones[o].y) < radios[o] + 14)) return false
    }
    return true
  }
  return opciones.find(libre) ?? opciones[0]
}

function geometria(arista, posiciones, radios, curvada) {
  const p = posiciones[arista.desde]
  const q = posiciones[arista.hacia]

  if (arista.desde === arista.hacia) {
    const r = radios[arista.desde]
    const [a1, a2] = [-Math.PI / 2 - 0.6, -Math.PI / 2 + 0.6]
    const cima = p.y - r - ALTO_LAZO
    const d = `M ${n(p.x + r * Math.cos(a1))} ${n(p.y + r * Math.sin(a1))} C ${n(p.x - 40)} ${n(cima)}, ${n(p.x + 40)} ${n(cima)}, ${n(p.x + r * Math.cos(a2))} ${n(p.y + r * Math.sin(a2))}`
    return {
      d,
      lazo: { x0: p.x - 32, y0: cima + ALTO_LAZO * 0.25, x1: p.x + 32, y1: p.y - r },
      candidatos: [{ punto: { x: p.x, y: cima + ALTO_LAZO * 0.25 - 2 }, normal: { x: 0, y: -1 } }],
    }
  }

  const largo = Math.hypot(q.x - p.x, q.y - p.y) || 1
  const curva = curvatura(arista, posiciones, radios, curvada)
  const signo = curva < 0 ? -1 : 1
  const [nx, ny] = [(-(q.y - p.y) / largo) * signo, ((q.x - p.x) / largo) * signo]
  const c = { x: (p.x + q.x) / 2 + nx * Math.abs(curva) * 2, y: (p.y + q.y) / 2 + ny * Math.abs(curva) * 2 }
  const borde = (centro, r) => {
    const vx = c.x - centro.x
    const vy = c.y - centro.y
    const l = Math.hypot(vx, vy) || 1
    return { x: centro.x + (vx / l) * r, y: centro.y + (vy / l) * r }
  }
  const s = borde(p, radios[arista.desde])
  const e = borde(q, radios[arista.hacia] + 2)
  const candidatos = []
  for (const t of [0.5, 0.4, 0.6, 0.3, 0.7, 0.22, 0.78]) {
    for (const lado of [1, -1]) candidatos.push({ punto: bezier(s, c, e, t), normal: { x: nx * lado, y: ny * lado } })
  }
  return { d: `M ${n(s.x)} ${n(s.y)} Q ${n(c.x)} ${n(c.y)} ${n(e.x)} ${n(e.y)}`, candidatos }
}

function bloqueEtiqueta(lineas, { punto, normal }) {
  const ancho = Math.max(...lineas.map((l) => [...l].length)) * ANCHO_CARACTER
  const alto = lineas.length * ALTO_LINEA
  let x
  let arriba
  let ancla
  if (Math.abs(normal.x) > Math.abs(normal.y)) {
    ancla = normal.x > 0 ? 'start' : 'end'
    x = punto.x + normal.x * 9
    arriba = punto.y - alto / 2
  } else {
    ancla = 'middle'
    x = punto.x
    arriba = normal.y < 0 ? punto.y - 6 - alto : punto.y + 6
  }
  const x0 = ancla === 'start' ? x : ancla === 'end' ? x - ancho : x - ancho / 2
  const svg = lineas
    .map((l, i) => `<text x="${n(x)}" y="${n(arriba + 11 + i * ALTO_LINEA)}" text-anchor="${ancla}">${escapar(l)}</text>`)
    .join('')
  return { caja: { x0, y0: arriba, x1: x0 + ancho, y1: arriba + alto }, svg }
}

const cruzaRectangulos = (a, b) => a.x0 < b.x1 + 3 && b.x0 < a.x1 + 3 && a.y0 < b.y1 + 2 && b.y0 < a.y1 + 2

function cruzaCirculo(caja, { x, y, r }) {
  const cx = Math.max(caja.x0, Math.min(x, caja.x1))
  const cy = Math.max(caja.y0, Math.min(y, caja.y1))
  return Math.hypot(cx - x, cy - y) < r + 4
}

export function limitesDiagrama(posiciones) {
  const qs = Object.keys(posiciones)
  if (!qs.length) return { x: 0, y: 0, ancho: 100, alto: 100 }
  const xs = qs.flatMap((q) => [posiciones[q].x - radioEstado(q), posiciones[q].x + radioEstado(q)])
  const ys = qs.flatMap((q) => [posiciones[q].y - radioEstado(q), posiciones[q].y + radioEstado(q)])
  const x = Math.min(...xs) - 110
  const y = Math.min(...ys) - 120
  return { x, y, ancho: Math.max(...xs) + 110 - x, alto: Math.max(...ys) + 70 - y }
}

export function diagramaSVG(M, aristas, posiciones, { activo = null, aristaActiva = null, limites = null, fondo = false } = {}) {
  const radios = Object.fromEntries(M.Q.map((q) => [q, radioEstado(q)]))
  const claves = new Set(aristas.map((a) => `${a.desde}\u0000${a.hacia}`))
  const caja = limites ?? limitesDiagrama(posiciones)
  const circulos = M.Q.map((q) => ({ ...posiciones[q], r: radios[q] }))

  const trazos = aristas.map((a) => {
    const g = geometria(a, posiciones, radios, claves.has(`${a.hacia}\u0000${a.desde}`))
    const activa = Boolean(aristaActiva) && aristaActiva.desde === a.desde && aristaActiva.hacia === a.hacia
    const clase = ['mt-arista', a.hacia === M.qreject && 'hacia-rechazo', a.implicita && 'implicita', activa && 'activa']
      .filter(Boolean).join(' ')
    const marcador = activa ? 'mt-flecha-activa' : a.hacia === M.qreject ? 'mt-flecha-tenue' : 'mt-flecha'
    return { arista: a, ...g, activa, clase, marcador }
  })

  const ocupadas = trazos.filter((t) => t.lazo).map((t) => t.lazo)
  const orden = [...trazos].sort((a, b) => Boolean(b.lazo) - Boolean(a.lazo) || a.arista.etiquetas.length - b.arista.etiquetas.length)
  for (const t of orden) {
    const opciones = t.candidatos.map((c) => bloqueEtiqueta(t.arista.etiquetas, c))
    const libre = opciones.find((o) => !circulos.some((c) => cruzaCirculo(o.caja, c)) && !ocupadas.some((x) => x !== t.lazo && cruzaRectangulos(o.caja, x)))
    t.etiqueta = libre ?? opciones[0]
    ocupadas.push(t.etiqueta.caja)
  }
  trazos.sort((a, b) => a.activa - b.activa)

  const nodos = M.Q.map((q) => {
    const p = posiciones[q]
    const clase = ['mt-nodo', q === M.qaccept && 'aceptacion', q === M.qreject && 'rechazo', q === activo && 'activo']
      .filter(Boolean).join(' ')
    return `<g class="${clase}" data-estado="${escapar(q)}" transform="translate(${n(p.x)} ${n(p.y)})"><circle r="${n(radios[q])}"/>${etiquetaEstado(q)}</g>`
  })

  const p0 = posiciones[M.q0]
  const r0 = radios[M.q0]
  const inicio = `<path class="mt-inicio" d="M ${n(p0.x - r0 - 48)} ${n(p0.y)} H ${n(p0.x - r0 - 3)}" marker-end="url(#mt-flecha)"/>`
  const flecha = (id, color) =>
    `<marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${color}"/></marker>`

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${n(caja.x)} ${n(caja.y)} ${n(caja.ancho)} ${n(caja.alto)}" width="${n(caja.ancho)}" height="${n(caja.alto)}">`,
    `<style>${ESTILO}</style>`,
    `<defs>${flecha('mt-flecha', '#1b1b1f')}${flecha('mt-flecha-tenue', '#8d867a')}${flecha('mt-flecha-activa', '#e8492c')}</defs>`,
    fondo ? `<rect class="mt-fondo" x="${n(caja.x)}" y="${n(caja.y)}" width="${n(caja.ancho)}" height="${n(caja.alto)}"/>` : '',
    inicio,
    ...trazos.map((t) => `<g class="${t.clase}"><path d="${t.d}" marker-end="url(#${t.marcador})"/></g>`),
    ...trazos.map((t) => `<g class="${t.clase}">${t.etiqueta.svg}</g>`),
    ...nodos,
    '</svg>',
  ].join('')
}
