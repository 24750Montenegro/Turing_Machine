import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

function aleatorio(semilla) {
  return () => {
    semilla = (semilla + 0x6d2b79f5) | 0
    let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const suave = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

const NIVEL = -0.6
const CENTRO_Z = -0.85

const distanciaClaro = (x, z) => {
  const dz = z - CENTRO_Z
  return Math.hypot(x / 13.5, dz / (dz > 0 ? 17 : 8.5))
}

export function alturaTerreno(x, z) {
  const d = distanciaClaro(x, z)
  const ondas = 1.6 * Math.sin(x * 0.17 + 1.3) * Math.cos(z * 0.2) + 1.1 * Math.sin(x * 0.33 + z * 0.27) + 0.6 * Math.cos(x * 0.71 - z * 0.53)
  return NIVEL + suave(0.95, 2.3, d) * (2.2 + ondas + (d - 1) * 2.6)
}

function pintar(geometria, color) {
  const g = geometria.index ? geometria.toNonIndexed() : geometria
  const c = new THREE.Color(color)
  const datos = new Float32Array(g.attributes.position.count * 3)
  for (let i = 0; i < datos.length; i += 3) datos.set([c.r, c.g, c.b], i)
  g.setAttribute('color', new THREE.BufferAttribute(datos, 3))
  return g
}

function colocar(geometria, { x = 0, y = 0, z = 0, escala = 1, giro = 0, sx, sy, sz }) {
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(0, giro, 0)),
    new THREE.Vector3(sx ?? escala, sy ?? escala, sz ?? escala),
  )
  return geometria.applyMatrix4(m)
}

function variar(color, rng, cantidad = 0.05) {
  return new THREE.Color(color).offsetHSL((rng() - 0.5) * 0.02, 0, (rng() - 0.5) * cantidad)
}

function terreno(rng, gradiente) {
  const g = new THREE.PlaneGeometry(150, 150, 120, 120)
  g.rotateX(-Math.PI / 2)
  const pos = g.attributes.position
  for (let i = 0; i < pos.count; i++) pos.setY(i, alturaTerreno(pos.getX(i), pos.getZ(i)))
  const plano = g.toNonIndexed()
  const p = plano.attributes.position
  const colores = new Float32Array(p.count * 3)
  for (let i = 0; i < p.count; i += 3) {
    const x = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3
    const y = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3
    const z = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3
    const base = distanciaClaro(x, z) < 1.02 && y < NIVEL + 0.05 ? '#e9d7ab' : y > 9 ? '#cdbf8e' : y > 4.5 ? '#9fbd68' : y > 1 ? '#8dbb5e' : '#a5cc6c'
    const c = variar(base, rng, 0.06)
    for (let k = 0; k < 3; k++) colores.set([c.r, c.g, c.b], (i + k) * 3)
  }
  plano.setAttribute('color', new THREE.BufferAttribute(colores, 3))
  plano.computeVertexNormals()
  const malla = new THREE.Mesh(plano, new THREE.MeshToonMaterial({ vertexColors: true, flatShading: true, gradientMap: gradiente }))
  malla.material.userData.outlineParameters = { visible: false }
  malla.receiveShadow = true
  return malla
}

function vegetacion(rng) {
  const troncos = []
  const copas = []
  const rocas = []
  let colocados = 0
  for (let intento = 0; intento < 600 && colocados < 70; intento++) {
    const a = rng() * Math.PI * 2
    const d = 1.12 + rng() * 1.6
    const x = Math.cos(a) * d * 13.5
    const z = CENTRO_Z + Math.sin(a) * d * 8.5
    if (z > 1.5) continue
    const y = alturaTerreno(x, z) - 0.05
    const escala = 0.8 + rng() * 0.9
    const giro = rng() * Math.PI
    troncos.push(pintar(colocar(new THREE.CylinderGeometry(0.12, 0.18, 1, 6), { x, y: y + 0.5 * escala, z, escala, giro }), variar('#8a5a3b', rng)))
    if (rng() < 0.55) {
      const verde = rng() < 0.5 ? '#3f8f5a' : '#4f9e4f'
      for (let k = 0; k < 3; k++) {
        const r = (1.05 - k * 0.27) * escala
        copas.push(pintar(colocar(new THREE.ConeGeometry(r, 1.2 * escala, 7), { x, y: y + (1.2 + k * 0.62) * escala, z, giro: giro + k }), variar(verde, rng)))
      }
    } else {
      const verde = ['#6fb04f', '#88bf4f', '#a7c955'][Math.floor(rng() * 3)]
      copas.push(pintar(colocar(new THREE.IcosahedronGeometry(0.95, 0), { x, y: y + 1.75 * escala, z, escala, giro }), variar(verde, rng)))
      copas.push(pintar(colocar(new THREE.IcosahedronGeometry(0.6, 0), { x: x + 0.45 * escala, y: y + 1.35 * escala, z: z + 0.2, escala, giro }), variar(verde, rng)))
    }
    colocados++
  }
  for (let i = 0; i < 26; i++) {
    const a = rng() * Math.PI * 2
    const d = 1.05 + rng() * 1.4
    const x = Math.cos(a) * d * 13.5
    const z = CENTRO_Z + Math.sin(a) * d * 8.5
    if (z > 3) continue
    const s = 0.35 + rng() * 0.7
    const g = rng() < 0.5 ? new THREE.DodecahedronGeometry(1, 0) : new THREE.IcosahedronGeometry(1, 0)
    rocas.push(pintar(colocar(g, { x, y: alturaTerreno(x, z) + s * 0.25, z, sx: s * 1.3, sy: s * 0.8, sz: s, giro: rng() * 3 }), variar('#a9a294', rng, 0.08)))
  }
  for (let i = 0; i < 18; i++) {
    const lado = rng() < 0.5 ? -1 : 1
    const x = lado * (10.5 + rng() * 3)
    const z = -5 + rng() * 9
    const s = 0.45 + rng() * 0.35
    copas.push(pintar(colocar(new THREE.IcosahedronGeometry(1, 0), { x, y: alturaTerreno(x, z) + s * 0.5, z, sx: s * 1.4, sy: s, sz: s * 1.2 }), variar('#76b552', rng)))
  }
  return { troncos, copas, rocas }
}

function flores(rng) {
  const partes = []
  for (let i = 0; i < 90; i++) {
    const x = (rng() - 0.5) * 30
    const z = 3.6 + rng() * 14
    if (Math.abs(x) < 9.6 && z < 4) continue
    const y = alturaTerreno(x, z)
    if (rng() < 0.6) {
      partes.push(pintar(colocar(new THREE.ConeGeometry(0.09, 0.32, 4), { x, y: y + 0.16, z, giro: rng() * 3 }), variar('#6aa84f', rng)))
      partes.push(pintar(colocar(new THREE.ConeGeometry(0.07, 0.24, 4), { x: x + 0.1, y: y + 0.12, z: z + 0.05 }), variar('#7cb85a', rng)))
    } else {
      const color = ['#ff8fab', '#ffd23f', '#ffffff', '#c39bff'][Math.floor(rng() * 4)]
      partes.push(pintar(colocar(new THREE.CylinderGeometry(0.015, 0.015, 0.3, 4), { x, y: y + 0.15, z }), '#5d9a45'))
      partes.push(pintar(colocar(new THREE.IcosahedronGeometry(0.08, 0), { x, y: y + 0.32, z }), color))
    }
  }
  return partes
}

function nubes(rng, material) {
  const lista = []
  for (let i = 0; i < 8; i++) {
    const partes = []
    const bolas = 3 + Math.floor(rng() * 3)
    for (let k = 0; k < bolas; k++) {
      const r = 1.2 + rng() * 1.3
      partes.push(colocar(new THREE.IcosahedronGeometry(r, 1), { x: k * 1.7 - bolas * 0.8, y: rng() * 0.7, z: (rng() - 0.5) * 1.5, sy: r * 0.72, sx: r, sz: r }))
    }
    const malla = new THREE.Mesh(mergeGeometries(partes), material)
    malla.position.set(-60 + rng() * 120, 11 + rng() * 6, -32 - rng() * 22)
    malla.userData.velocidad = 0.25 + rng() * 0.35
    lista.push(malla)
  }
  return lista
}

export function texturaCielo() {
  const c = document.createElement('canvas')
  c.width = 4
  c.height = 512
  const ctx = c.getContext('2d')
  const g = ctx.createLinearGradient(0, 0, 0, 512)
  g.addColorStop(0, '#86c5e6')
  g.addColorStop(0.55, '#cfe7ec')
  g.addColorStop(1, '#f4e8d0')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 4, 512)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

export function crearEntorno(gradiente) {
  const rng = aleatorio(20231113)
  const grupo = new THREE.Group()
  grupo.add(terreno(rng, gradiente))

  const material = (extra = {}) => new THREE.MeshToonMaterial({ vertexColors: true, flatShading: true, gradientMap: gradiente, ...extra })
  const { troncos, copas, rocas } = vegetacion(rng)
  for (const partes of [troncos, copas, rocas]) {
    const m = new THREE.Mesh(mergeGeometries(partes), material())
    m.castShadow = true
    grupo.add(m)
  }
  const pasto = new THREE.Mesh(mergeGeometries(flores(rng)), material())
  pasto.material.userData.outlineParameters = { visible: false }
  grupo.add(pasto)

  const materialNube = new THREE.MeshToonMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.35, flatShading: true, gradientMap: gradiente })
  materialNube.userData.outlineParameters = { thickness: 0.002, alpha: 0.5 }
  const listaNubes = nubes(rng, materialNube)
  grupo.add(...listaNubes)

  return {
    grupo,
    actualizar(dt) {
      for (const n of listaNubes) {
        n.position.x += n.userData.velocidad * dt
        if (n.position.x > 70) n.position.x = -70
      }
    },
  }
}
