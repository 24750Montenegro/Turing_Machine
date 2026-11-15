import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

export const PISO = -4
const PARED_Z = -8
const MITAD_ANCHO = 26
const ALTO_PARED = 18

const TIZA = '"Segoe Print", "Caveat", "Comic Sans MS", cursive'
const COLORES_LIBROS = ['#7a2e2e', '#2c4a6b', '#3f6b45', '#b8873b', '#5a3d5c', '#8a5a35', '#c9b48f', '#4d5f3a']

function aleatorio(semilla) {
  return () => {
    semilla = (semilla + 0x6d2b79f5) | 0
    let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function texturaDe(ancho, alto, dibujar, repetir = null) {
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

const tablones = (rng) =>
  texturaDe(1024, 1024, (ctx, w, h) => {
    const filas = 8
    const tonos = ['#9a6a43', '#8d5f3b', '#a5754b', '#93653f']
    for (let i = 0; i < filas; i++) {
      const y = (i * h) / filas
      let x = -rng() * 400
      while (x < w) {
        const largo = 380 + rng() * 260
        ctx.fillStyle = tonos[Math.floor(rng() * tonos.length)]
        ctx.fillRect(x, y, largo, h / filas)
        ctx.strokeStyle = 'rgba(60, 35, 18, 0.25)'
        ctx.lineWidth = 2
        for (let k = 0; k < 5; k++) {
          const yy = y + 10 + rng() * (h / filas - 20)
          ctx.beginPath()
          ctx.moveTo(x, yy)
          ctx.bezierCurveTo(x + largo * 0.3, yy + (rng() - 0.5) * 14, x + largo * 0.7, yy + (rng() - 0.5) * 14, x + largo, yy)
          ctx.stroke()
        }
        ctx.fillStyle = 'rgba(45, 25, 12, 0.7)'
        ctx.fillRect(x, y, 3, h / filas)
        x += largo
      }
      ctx.fillStyle = 'rgba(45, 25, 12, 0.75)'
      ctx.fillRect(0, y, w, 4)
    }
  }, [5, 4])

const papelTapiz = () =>
  texturaDe(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#8fa085'
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = '#86977c'
    ctx.fillRect(0, 0, w / 2, h)
    ctx.fillStyle = 'rgba(240, 225, 190, 0.35)'
    for (const [x, y] of [[w * 0.75, h * 0.25], [w * 0.75, h * 0.75]]) {
      ctx.beginPath()
      for (let k = 0; k < 4; k++) {
        const a = (k * Math.PI) / 2
        ctx.ellipse(x + Math.cos(a) * 9, y + Math.sin(a) * 9, 8, 4, a, 0, Math.PI * 2)
      }
      ctx.fill()
    }
  }, [14, 4])

const lambrin = () =>
  texturaDe(512, 256, (ctx, w, h) => {
    ctx.fillStyle = '#6e4428'
    ctx.fillRect(0, 0, w, h)
    for (let i = 0; i < 2; i++) {
      const x = 24 + i * (w / 2)
      ctx.fillStyle = '#7b4c2d'
      ctx.fillRect(x, 30, w / 2 - 48, h - 60)
      ctx.strokeStyle = '#4f2f1a'
      ctx.lineWidth = 6
      ctx.strokeRect(x, 30, w / 2 - 48, h - 60)
      ctx.strokeStyle = 'rgba(255, 220, 170, 0.18)'
      ctx.lineWidth = 3
      ctx.strokeRect(x + 10, 40, w / 2 - 68, h - 80)
    }
  }, [13, 1])

const alfombra = () =>
  texturaDe(1024, 640, (ctx, w, h) => {
    ctx.fillStyle = '#7a2e2e'
    ctx.fillRect(0, 0, w, h)
    const marco = (m, color, grosor) => {
      ctx.strokeStyle = color
      ctx.lineWidth = grosor
      ctx.strokeRect(m, m, w - 2 * m, h - 2 * m)
    }
    marco(26, '#c99a4a', 14)
    marco(58, '#2c3e5c', 26)
    marco(86, '#c99a4a', 6)
    ctx.fillStyle = '#2c3e5c'
    ctx.beginPath()
    ctx.moveTo(w / 2, 150)
    ctx.lineTo(w - 260, h / 2)
    ctx.lineTo(w / 2, h - 150)
    ctx.lineTo(260, h / 2)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = '#c99a4a'
    ctx.lineWidth = 8
    ctx.stroke()
    ctx.fillStyle = '#c99a4a'
    ctx.beginPath()
    ctx.arc(w / 2, h / 2, 46, 0, Math.PI * 2)
    ctx.fill()
    for (const [x, y] of [[170, 160], [w - 170, 160], [170, h - 160], [w - 170, h - 160]]) {
      ctx.beginPath()
      ctx.arc(x, y, 22, 0, Math.PI * 2)
      ctx.fill()
    }
  })

const vistaVentana = () =>
  texturaDe(256, 320, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, '#9fd0ea')
    g.addColorStop(0.7, '#f3e3c3')
    g.addColorStop(1, '#f7d9a8')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = '#6f8f5c'
    for (const [x, r] of [[30, 60], [120, 46], [210, 70]]) {
      ctx.beginPath()
      ctx.arc(x, h - 20, r, Math.PI, 0)
      ctx.fill()
    }
  })

const boceto = () =>
  texturaDe(512, 620, (ctx, w, h) => {
    ctx.fillStyle = '#e8d9b5'
    ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = '#6b4a2b'
    ctx.fillStyle = '#6b4a2b'
    ctx.lineWidth = 5
    ctx.font = `italic 44px "Cambria Math", "Times New Roman", serif`
    ctx.textAlign = 'center'
    const estados = [[140, 200, 'q₀'], [370, 200, 'q₁'], [255, 440, 'qₐ']]
    for (const [x, y, q] of estados) {
      ctx.beginPath()
      ctx.arc(x, y, 58, 0, Math.PI * 2)
      ctx.stroke()
      ctx.fillText(q, x, y + 14)
    }
    ctx.beginPath()
    ctx.moveTo(200, 200)
    ctx.lineTo(310, 200)
    ctx.moveTo(360, 258)
    ctx.lineTo(290, 390)
    ctx.stroke()
    ctx.font = `30px ${TIZA}`
    ctx.fillText('0 → x, R', 255, 175)
    ctx.fillText('⊔ → R', 380, 340)
    ctx.font = `26px ${TIZA}`
    ctx.fillText('Lógica Matemática', w / 2, h - 50)
  })

const esferaTerrestre = (rng) =>
  texturaDe(512, 256, (ctx, w, h) => {
    ctx.fillStyle = '#9db7a3'
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = '#d8c08a'
    for (let i = 0; i < 9; i++) {
      ctx.beginPath()
      const [x, y] = [rng() * w, 40 + rng() * (h - 80)]
      for (let k = 0; k < 7; k++) ctx.ellipse(x + (rng() - 0.5) * 60, y + (rng() - 0.5) * 40, 20 + rng() * 40, 12 + rng() * 22, rng() * 3, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.strokeStyle = 'rgba(80, 60, 40, 0.35)'
    ctx.lineWidth = 2
    for (let k = 1; k < 6; k++) {
      ctx.beginPath()
      ctx.moveTo(0, (k * h) / 6)
      ctx.lineTo(w, (k * h) / 6)
      ctx.stroke()
    }
  })

const caraReloj = () =>
  texturaDe(256, 256, (ctx, w) => {
    ctx.fillStyle = '#f3e7cc'
    ctx.beginPath()
    ctx.arc(w / 2, w / 2, w / 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#2b2118'
    ctx.font = `bold 30px "Times New Roman", serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const romanos = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI']
    romanos.forEach((r, i) => {
      const a = (i * Math.PI) / 6 - Math.PI / 2
      ctx.fillText(r, w / 2 + Math.cos(a) * 96, w / 2 + Math.sin(a) * 96)
    })
  })

function pintar(geometria, color) {
  const g = geometria.index ? geometria.toNonIndexed() : geometria
  const c = new THREE.Color(color)
  const datos = new Float32Array(g.attributes.position.count * 3)
  for (let i = 0; i < datos.length; i += 3) datos.set([c.r, c.g, c.b], i)
  g.setAttribute('color', new THREE.BufferAttribute(datos, 3))
  return g
}

function ubicar(geometria, x, y, z, giroY = 0, giroZ = 0) {
  geometria.rotateZ(giroZ)
  geometria.rotateY(giroY)
  geometria.translate(x, y, z)
  return geometria
}

function dibujarPizarra(lienzo, { maquina = '', configuracion = '', transicion = '', resultado = '' }, ruido) {
  const ctx = lienzo.getContext('2d')
  const { width: w, height: h } = lienzo
  ctx.fillStyle = '#2f4a3a'
  ctx.fillRect(0, 0, w, h)
  for (const [x, y, r, a] of ruido.manchas) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, `rgba(220, 235, 220, ${a})`)
    g.addColorStop(1, 'rgba(220, 235, 220, 0)')
    ctx.fillStyle = g
    ctx.fillRect(x - r, y - r, 2 * r, 2 * r)
  }

  const tinta = document.createElement('canvas')
  tinta.width = w
  tinta.height = h
  const t = tinta.getContext('2d')
  t.textBaseline = 'alphabetic'
  const escribir = (texto, x, y, tamano, color, anchoMaximo = w * 0.44) => {
    if (!texto) return
    t.font = `${tamano}px ${TIZA}`
    const escala = Math.min(1, anchoMaximo / t.measureText(texto).width)
    t.font = `${Math.round(tamano * escala)}px ${TIZA}`
    t.fillStyle = color
    t.fillText(texto, x, y)
  }
  escribir('Máquina de Turing', 90, 130, 96, '#fff3b0')
  t.strokeStyle = '#fff3b0'
  t.lineWidth = 5
  t.beginPath()
  t.moveTo(90, 158)
  t.quadraticCurveTo(450, 146, 840, 162)
  t.stroke()
  escribir(maquina, 90, 270, 60, '#f4f4ee')
  escribir('δ: Q × Γ → Q × Γ × {L, R}', 90, 370, 56, '#f4f4ee')
  escribir('Configuración actual', 1100, 130, 64, '#b9e3ff')
  escribir(configuracion, 1100, 240, 72, '#f4f4ee', w * 0.43)
  escribir(transicion, 1100, 350, 64, '#f4f4ee', w * 0.43)
  escribir(resultado, 1100, 460, 70, '#ffb9a8', w * 0.43)

  t.globalCompositeOperation = 'destination-out'
  for (const [x, y, r] of ruido.poros) t.fillRect(x, y, r, r)
  ctx.globalAlpha = 0.93
  ctx.drawImage(tinta, 0, 0)
  ctx.globalAlpha = 1
}

export function crearSalon(gradiente) {
  const rng = aleatorio(1936)
  const grupo = new THREE.Group()
  const toon = (color, extra = {}) => new THREE.MeshToonMaterial({ color, gradientMap: gradiente, ...extra })
  const sinContorno = (material) => {
    material.userData.outlineParameters = { visible: false }
    return material
  }
  const agregar = (geometria, material, [x, y, z], { sombra = true, recibe = true } = {}) => {
    const m = new THREE.Mesh(geometria, typeof material === 'string' ? toon(material) : material)
    m.position.set(x, y, z)
    m.castShadow = sombra
    m.receiveShadow = recibe
    grupo.add(m)
    return m
  }

  const piso = agregar(new THREE.PlaneGeometry(MITAD_ANCHO * 2, 48), sinContorno(toon('#ffffff', { map: tablones(rng) })), [0, PISO, PARED_Z + 24], { sombra: false })
  piso.rotation.x = -Math.PI / 2
  const tapete = agregar(new THREE.PlaneGeometry(27, 14), sinContorno(toon('#ffffff', { map: alfombra() })), [0, PISO + 0.02, -0.4], { sombra: false })
  tapete.rotation.x = -Math.PI / 2

  const fondo = agregar(new THREE.PlaneGeometry(MITAD_ANCHO * 2, ALTO_PARED - 3.2), sinContorno(toon('#ffffff', { map: papelTapiz() })), [0, PISO + 3.2 + (ALTO_PARED - 3.2) / 2, PARED_Z], { sombra: false })
  fondo.material.map.repeat.set(14, 4)
  agregar(new THREE.PlaneGeometry(MITAD_ANCHO * 2, 3.2), sinContorno(toon('#ffffff', { map: lambrin() })), [0, PISO + 1.6, PARED_Z + 0.01], { sombra: false })
  agregar(new THREE.BoxGeometry(MITAD_ANCHO * 2, 0.22, 0.25), '#4f2f1a', [0, PISO + 3.2, PARED_Z + 0.1], { sombra: false })
  agregar(new THREE.BoxGeometry(MITAD_ANCHO * 2, 0.4, 0.2), '#4f2f1a', [0, PISO + 0.2, PARED_Z + 0.08], { sombra: false })
  for (const lado of [-1, 1]) {
    const pared = agregar(new THREE.PlaneGeometry(48, ALTO_PARED), sinContorno(toon('#ffffff', { map: papelTapiz() })), [lado * MITAD_ANCHO, PISO + ALTO_PARED / 2, PARED_Z + 24], { sombra: false })
    pared.rotation.y = -lado * (Math.PI / 2)
    pared.material.map.repeat.set(13, 4)
  }

  agregar(new RoundedBoxGeometry(15.4, 5.8, 0.3, 3, 0.1), '#5a3820', [0, 5.0, PARED_Z + 0.15])
  const lienzoPizarra = document.createElement('canvas')
  lienzoPizarra.width = 2048
  lienzoPizarra.height = 700
  const texturaPizarra = new THREE.CanvasTexture(lienzoPizarra)
  texturaPizarra.colorSpace = THREE.SRGBColorSpace
  texturaPizarra.anisotropy = 8
  agregar(new THREE.PlaneGeometry(14.6, 5.0), sinContorno(new THREE.MeshBasicMaterial({ map: texturaPizarra })), [0, 5.0, PARED_Z + 0.31], { sombra: false })
  agregar(new THREE.BoxGeometry(14.8, 0.12, 0.5), '#5a3820', [0, 2.22, PARED_Z + 0.5])
  for (const [x, color] of [[-4.5, '#f6f2e6'], [-4.0, '#f6f2e6'], [3.2, '#ffe28a'], [5.6, '#f6f2e6']]) {
    const tiza = agregar(new THREE.CylinderGeometry(0.06, 0.06, 0.55, 10), color, [x, 2.35, PARED_Z + 0.55], { sombra: false })
    tiza.rotation.z = Math.PI / 2 + (rng() - 0.5) * 0.3
  }
  agregar(new RoundedBoxGeometry(0.9, 0.24, 0.36, 2, 0.05), '#3b3b3b', [1.2, 2.4, PARED_Z + 0.55])

  const ruido = {
    manchas: Array.from({ length: 14 }, () => [rng() * 2048, rng() * 700, 80 + rng() * 220, 0.03 + rng() * 0.05]),
    poros: Array.from({ length: 9000 }, () => [rng() * 2048, rng() * 700, 1 + rng() * 2.5]),
  }
  let pendiente = { maquina: '', configuracion: '', transicion: '', resultado: '' }
  let ultimo = 0
  let sucio = true

  const marco = (ancho, alto, [x, y, z], textura) => {
    agregar(new RoundedBoxGeometry(ancho + 0.5, alto + 0.5, 0.2, 2, 0.06), '#6b4423', [x, y, z])
    agregar(new THREE.PlaneGeometry(ancho, alto), sinContorno(toon('#ffffff', { map: textura })), [x, y, z + 0.11], { sombra: false })
  }
  marco(3.0, 3.6, [-10.6, 5.6, PARED_Z + 0.12], boceto())

  const ventanaX = 12.6
  agregar(new THREE.PlaneGeometry(4.6, 5.6), sinContorno(new THREE.MeshBasicMaterial({ map: vistaVentana() })), [ventanaX, 5.2, PARED_Z + 0.03], { sombra: false })
  for (const [ancho, alto, dx, dy] of [[5.2, 0.32, 0, 2.95], [5.2, 0.32, 0, -2.95], [0.32, 6.2, 2.45, 0], [0.32, 6.2, -2.45, 0], [0.16, 5.6, 0, 0], [4.6, 0.16, 0, 0.4]]) {
    agregar(new THREE.BoxGeometry(ancho, alto, 0.25), '#f1e6cf', [ventanaX + dx, 5.2 + dy, PARED_Z + 0.12])
  }
  agregar(new THREE.BoxGeometry(5.6, 0.2, 0.7), '#f1e6cf', [ventanaX, 2.12, PARED_Z + 0.3])
  for (const lado of [-1, 1]) agregar(new RoundedBoxGeometry(1.1, 7.4, 0.3, 2, 0.12), '#7a2e2e', [ventanaX + lado * 3.3, 5.0, PARED_Z + 0.35])
  agregar(new THREE.BoxGeometry(7.6, 0.24, 0.24), '#5a3820', [ventanaX, 8.8, PARED_Z + 0.4])
  const radiador = []
  for (let i = 0; i < 9; i++) radiador.push(pintar(new RoundedBoxGeometry(0.34, 2.2, 0.5, 2, 0.12).translate(ventanaX - 2 + i * 0.5, PISO + 1.5, PARED_Z + 0.55), '#b9b2a6'))
  agregar(mergeGeometries(radiador), toon('#ffffff', { vertexColors: true }), [0, 0, 0])

  const reloj = new THREE.Group()
  const cara = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.12, 40), [toon('#3d2817'), toon('#ffffff', { map: caraReloj() }), toon('#3d2817')])
  cara.rotation.x = Math.PI / 2
  const aro = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.12, 10, 40), toon('#3d2817'))
  const manecilla = (largo, grosor) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(grosor, largo, 0.04), toon('#1b1b1f'))
    m.geometry.translate(0, largo / 2 - 0.1, 0)
    m.position.z = 0.1
    return m
  }
  const horaria = manecilla(0.6, 0.09)
  const minutero = manecilla(0.9, 0.06)
  reloj.add(cara, aro, horaria, minutero)
  reloj.position.set(0, 10.1, PARED_Z + 0.2)
  grupo.add(reloj)

  const estante = []
  const libros = []
  const repisaX = -17.2
  for (const [ancho, alto, dx, dy] of [[0.3, 8.6, -3.1, 4.3], [0.3, 8.6, 3.1, 4.3], [6.5, 0.3, 0, 8.5]]) {
    estante.push(pintar(new THREE.BoxGeometry(ancho, alto, 1.6).translate(repisaX + dx, PISO + dy, PARED_Z + 0.85), '#5a3820'))
  }
  for (let nivel = 0; nivel < 4; nivel++) {
    const y = PISO + 0.4 + nivel * 2.05
    estante.push(pintar(new THREE.BoxGeometry(6.0, 0.18, 1.5).translate(repisaX, y, PARED_Z + 0.85), '#6b4423'))
    let x = repisaX - 2.85
    while (x < repisaX + 2.6) {
      const ancho = 0.16 + rng() * 0.2
      const alto = 1.05 + rng() * 0.6
      const inclinado = rng() < 0.08 ? 0.25 : 0
      libros.push(pintar(ubicar(new THREE.BoxGeometry(ancho, alto, 1.05), x + ancho / 2, y + 0.09 + alto / 2, PARED_Z + 0.9, 0, -inclinado), COLORES_LIBROS[Math.floor(rng() * COLORES_LIBROS.length)]))
      x += ancho + 0.02 + (inclinado ? 0.3 : 0)
      if (rng() < 0.06) x += 0.6
    }
  }
  agregar(mergeGeometries(estante), toon('#ffffff', { vertexColors: true }), [0, 0, 0])
  agregar(mergeGeometries(libros), toon('#ffffff', { vertexColors: true }), [0, 0, 0])

  const planta = []
  planta.push(pintar(new THREE.CylinderGeometry(0.9, 0.65, 1.6, 16).translate(20.5, PISO + 0.8, -5.6), '#a5532f'))
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2
    const hoja = new THREE.IcosahedronGeometry(0.75 + rng() * 0.35, 0)
    hoja.scale(1, 1.4, 0.6)
    planta.push(pintar(ubicar(hoja, 20.5 + Math.cos(a) * 0.9, PISO + 2.6 + rng() * 1.6, -5.6 + Math.sin(a) * 0.9, a, 0.4), rng() < 0.5 ? '#4f8a4b' : '#5f9b52'))
  }
  agregar(mergeGeometries(planta), toon('#ffffff', { vertexColors: true, flatShading: true }), [0, 0, 0])

  const silla = []
  const sx = 13.4
  const sz = 5.2
  silla.push(pintar(new RoundedBoxGeometry(2.2, 0.22, 2.2, 2, 0.06).translate(sx, PISO + 2.0, sz), '#7b4c2d'))
  for (const [dx, dz] of [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]]) {
    silla.push(pintar(new THREE.CylinderGeometry(0.1, 0.12, 2.0, 8).translate(sx + dx, PISO + 1.0, sz + dz), '#5a3820'))
  }
  for (const dx of [-0.9, 0.9]) silla.push(pintar(new THREE.CylinderGeometry(0.09, 0.09, 2.4, 8).translate(sx + dx, PISO + 3.3, sz + 0.95), '#5a3820'))
  silla.push(pintar(new RoundedBoxGeometry(2.0, 0.9, 0.14, 2, 0.05).translate(sx, PISO + 4.0, sz + 0.95), '#7b4c2d'))
  agregar(mergeGeometries(silla), toon('#ffffff', { vertexColors: true }), [0, 0, 0])

  agregar(new THREE.CylinderGeometry(0.75, 0.6, 1.6, 18, 1, true), toon('#6e6a5e', { side: THREE.DoubleSide }), [-12.6, PISO + 0.8, 3.6])
  for (let i = 0; i < 4; i++) {
    agregar(new THREE.IcosahedronGeometry(0.28, 0), toon('#f2ead8', { flatShading: true }), [-12.6 + (rng() - 0.5) * 1.6, PISO + 0.25, 3.6 + 1 + rng() * 1.2])
  }

  const lampara = new THREE.Group()
  const base = new THREE.Mesh(new RoundedBoxGeometry(1.1, 0.18, 0.75, 2, 0.06), toon('#c8963e'))
  const tallo = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.3, 10), toon('#c8963e'))
  tallo.position.y = 0.72
  const pantalla = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 1.5, 24, 1, true, 0, Math.PI), toon('#2f6b45', { side: THREE.DoubleSide, emissive: '#1d3f2a', emissiveIntensity: 0.3 }))
  pantalla.rotation.z = Math.PI / 2
  pantalla.position.y = 1.35
  const foco = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), new THREE.MeshBasicMaterial({ color: '#fff1c4' }))
  foco.position.y = 1.18
  const luz = new THREE.PointLight('#ffd9a0', 7, 9, 2)
  luz.position.y = 1.1
  lampara.add(base, tallo, pantalla, foco, luz)
  lampara.position.set(-7.9, 0.09, -4.3)
  lampara.rotation.y = 0.35
  for (const m of [base, tallo, pantalla]) m.castShadow = true
  grupo.add(lampara)

  const pila = []
  let alturaPila = 0
  for (let i = 0; i < 4; i++) {
    const alto = 0.22 + rng() * 0.12
    pila.push(pintar(ubicar(new THREE.BoxGeometry(1.5 - i * 0.08, alto, 1.1 - i * 0.05), 0, alturaPila + alto / 2, 0, (rng() - 0.5) * 0.4), COLORES_LIBROS[(i * 3) % COLORES_LIBROS.length]))
    alturaPila += alto
  }
  agregar(mergeGeometries(pila), toon('#ffffff', { vertexColors: true }), [7.9, 0, -4.3])

  const globo = new THREE.Group()
  const soporte = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.52, 0.16, 20), toon('#5a3820'))
  const pie = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.5, 10), toon('#c8963e'))
  pie.position.y = 0.33
  const meridiano = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.035, 8, 40, Math.PI * 1.2), toon('#c8963e'))
  meridiano.position.y = 1.15
  meridiano.rotation.z = -Math.PI * 0.1
  const tierra = new THREE.Mesh(new THREE.SphereGeometry(0.6, 32, 20), toon('#ffffff', { map: esferaTerrestre(rng) }))
  tierra.position.y = 1.15
  tierra.rotation.z = 0.41
  globo.add(soporte, pie, meridiano, tierra)
  globo.position.set(-8.9, 0.08, 2.7)
  for (const m of globo.children) m.castShadow = true
  grupo.add(globo)

  agregar(new THREE.CylinderGeometry(0.28, 0.32, 0.38, 16), toon('#1f2a3a'), [8.85, 0.19, 2.6])
  const pluma = agregar(new THREE.ConeGeometry(0.12, 1.5, 6), toon('#f4efe4', { flatShading: true }), [8.95, 0.85, 2.55])
  pluma.rotation.z = -0.35
  pluma.rotation.x = 0.15
  for (const [x, z, giro] of [[-4.2, 2.95, 0.12], [-3.5, 3.0, -0.08], [4.4, 3.0, 0.2]]) {
    const hoja = agregar(new THREE.BoxGeometry(1.4, 0.02, 0.9), toon('#f6f0e1'), [x, 0.01, z], { sombra: false })
    hoja.rotation.y = giro
  }

  return {
    grupo,
    pizarra(datos) {
      const claves = ['maquina', 'configuracion', 'transicion', 'resultado']
      if (claves.every((k) => (datos[k] ?? '') === pendiente[k])) return
      pendiente = Object.fromEntries(claves.map((k) => [k, datos[k] ?? '']))
      sucio = true
    },
    redibujarPizarra() {
      sucio = true
      ultimo = 0
    },
    actualizar(ahora, dt) {
      tierra.rotation.y += dt * 0.25
      const hora = new Date()
      minutero.rotation.z = -((hora.getMinutes() + hora.getSeconds() / 60) / 60) * Math.PI * 2
      horaria.rotation.z = -(((hora.getHours() % 12) + hora.getMinutes() / 60) / 12) * Math.PI * 2
      if (sucio && ahora - ultimo > 120) {
        dibujarPizarra(lienzoPizarra, pendiente, ruido)
        texturaPizarra.needsUpdate = true
        sucio = false
        ultimo = ahora
      }
    },
  }
}
