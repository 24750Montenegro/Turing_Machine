import * as THREE from 'three'

export function aleatorio(semilla) {
  return () => {
    semilla = (semilla + 0x6d2b79f5) | 0
    let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function texturaDe(ancho, alto, dibujar, repetir = null) {
  const c = document.createElement('canvas')
  c.width = ancho
  c.height = alto
  dibujar(c.getContext('2d'), ancho, alto)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  if (repetir) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(...repetir)
  }
  return t
}

const rgba = (c, a) => `rgba(${c.join(',')}, ${a})`

export function texturaMadera({ base, oscuro, claro, semilla = 11 }) {
  const rng = aleatorio(semilla)
  return texturaDe(1024, 512, (ctx, w, h) => {
    ctx.fillStyle = rgba(base, 1)
    ctx.fillRect(0, 0, w, h)
    const onda = (amplitud) => {
      const ondas = [1, 2, 3].map((k) => ({ k, a: (rng() * amplitud) / k, f: rng() * Math.PI * 2 }))
      return (x) => ondas.reduce((s, o) => s + o.a * Math.sin((2 * Math.PI * o.k * x) / w + o.f), 0)
    }
    const veta = (y0, grosor, color, alfa) => {
      const centro = onda(12)
      const ancho = onda(0.5)
      ctx.fillStyle = rgba(color, alfa)
      for (const dy of [-h, 0, h]) {
        ctx.beginPath()
        for (let x = 0; x <= w; x += 16) ctx.lineTo(x, y0 + dy + centro(x))
        for (let x = w; x >= 0; x -= 16) ctx.lineTo(x, y0 + dy + centro(x) + grosor * (1 + ancho(x)))
        ctx.fill()
      }
    }
    for (let i = 0; i < 18; i++) veta(rng() * h, 10 + rng() * 40, rng() < 0.55 ? oscuro : claro, 0.16 + rng() * 0.22)
    for (let i = 0; i < 130; i++) veta(rng() * h, 1 + rng() * 2.5, rng() < 0.7 ? oscuro : claro, 0.22 + rng() * 0.35)
    ctx.fillStyle = rgba(oscuro, 0.45)
    for (let i = 0; i < 900; i++) ctx.fillRect(rng() * w, rng() * h, 3 + rng() * 14, 1.2)
  }, [1, 1])
}

export function texturaCepillada(base, semilla = 5) {
  const rng = aleatorio(semilla)
  return texturaDe(512, 256, (ctx, w, h) => {
    ctx.fillStyle = base
    ctx.fillRect(0, 0, w, h)
    for (let i = 0; i < 420; i++) {
      ctx.fillStyle = rng() < 0.5 ? `rgba(255,255,255,${0.015 + rng() * 0.03})` : `rgba(0,0,0,${0.02 + rng() * 0.05})`
      ctx.fillRect(0, rng() * h, w, 1 + rng() * 2)
    }
  }, [1, 1])
}

export function texturaMetal([sombra, base, luz, brillo]) {
  return texturaDe(256, 256, (ctx, w) => {
    const r = w / 2
    ctx.fillStyle = sombra
    ctx.fillRect(0, 0, w, w)
    ctx.filter = 'blur(1px)'
    const mancha = (x, y, rx, ry, color) => {
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.ellipse(r * (1 + x), r * (1 + y), r * rx, r * ry, -0.5, 0, Math.PI * 2)
      ctx.fill()
    }
    mancha(-0.06, -0.08, 0.84, 0.8, base)
    mancha(-0.24, -0.3, 0.46, 0.3, luz)
    mancha(-0.36, -0.42, 0.14, 0.08, brillo)
    ctx.strokeStyle = luz
    ctx.lineWidth = r * 0.06
    ctx.beginPath()
    ctx.arc(r, r, r * 0.9, Math.PI * 0.1, Math.PI * 0.5)
    ctx.stroke()
  })
}

export function proyectarUV(geometria, [ancho, alto] = [3, 1.5]) {
  const posicion = geometria.attributes.position
  const normal = geometria.attributes.normal
  const uv = new Float32Array(posicion.count * 2)
  for (let i = 0; i < posicion.count; i++) {
    const [x, y, z] = [posicion.getX(i), posicion.getY(i), posicion.getZ(i)]
    const [nx, ny, nz] = [Math.abs(normal.getX(i)), Math.abs(normal.getY(i)), Math.abs(normal.getZ(i))]
    const [u, v] = ny >= nx && ny >= nz ? [x, z] : nx >= nz ? [z, y] : [x, y]
    uv[2 * i] = u / ancho
    uv[2 * i + 1] = v / alto
  }
  geometria.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  return geometria
}
