import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { OutlineEffect } from 'three/examples/jsm/effects/OutlineEffect.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { BLANCO } from '../services/notacion.js'
import { anillo, engrane, panelConVentana } from './geometrias.js'
import { alturaTerreno, crearEntorno, texturaCielo } from './entorno.js'
import { crearLienzo, dibujarEstado, dibujarPantalla, texturaSimbolo, vaciarCacheSimbolos } from './texturas.js'

const PASO = 1.4
const ALCANCE = 7
const Y_CELDA = 0.345
const BORDE_ALIMENTADOR = 6.4
const Z_PANEL = -1.77
const BITS = 12

const FASES = {
  lectura: [0, 0.32],
  computo: [0.28, 0.58],
  escritura: [0.5, 0.7],
  golpe: [0.62, 0.84],
  desplazamiento: [0.8, 1],
}
const CAMBIO_ESTADO = 0.52
const CAMBIO_SIMBOLO = 0.73
const FIN_ESCANEO = 0.55

const COLORES = {
  plataforma: '#e3d2b0',
  zocalo: '#b49f7c',
  bandeja: '#38445c',
  riel: '#ffd23f',
  cuerpo: '#ff6f4f',
  alimentador: '#2a9d8f',
  acento: '#ffd23f',
  papel: '#fffaf0',
  papelActivo: '#ffe27a',
  tinta: '#1b1b1f',
  ranura: '#121419',
  vidrio: '#bfe9ff',
  rodillo: '#f4efe4',
  laton: '#e0a93b',
  cobre: '#c8743b',
  acero: '#b9c2cc',
  fondoMecanismo: '#2a2e38',
  lectura: '#5ee7ff',
  escritura: '#ffd23f',
  bombillaApagada: '#4b4f5c',
  bombillaEncendida: '#ffe066',
}

const COLOR_LED = {
  listo: '#9aa3ad',
  ejecutando: '#ffd23f',
  acepta: '#35d07f',
  rechaza: '#ff4b3e',
  ciclo: '#a66bff',
  limite: '#ff9f1c',
}

const suavizar = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
const acotar = (x, a, b) => Math.min(b, Math.max(a, x))
const enFase = (f, [a, b]) => (f < a || f > b ? -1 : (f - a) / (b - a))
const progreso = (f, [a, b]) => acotar((f - a) / (b - a), 0, 1)

export class EscenaTuring {
  constructor(contenedor) {
    this.contenedor = contenedor
    this.vista = '3d'
    this.pos = 0
    this.cabeza = 0
    this.simbolos = []
    this.celdas = new Map()
    this.libres = []
    this.id = null
    this.indice = -1
    this.paso = null
    this.tween = null
    this.situacion = 'listo'
    this.registro = 0
    this.angulo = 0
    this.ultimoCuadro = performance.now()
    this.ultimoParpadeo = 0
    this.ultimoHumo = 0

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.domElement.className = 'lienzo-3d'
    contenedor.appendChild(this.renderer.domElement)
    this.efecto = new OutlineEffect(this.renderer, { defaultThickness: 0.0042, defaultColor: [0.1, 0.1, 0.12] })

    this.escena = new THREE.Scene()
    this.escena.background = texturaCielo()
    this.escena.fog = new THREE.Fog('#f1e6cf', 38, 100)
    this.camara = new THREE.PerspectiveCamera(30, 1, 0.1, 400)
    this.controles = new OrbitControls(this.camara, this.renderer.domElement)
    this.controles.enableDamping = true
    this.controles.maxPolarAngle = Math.PI * 0.45
    this.controles.minDistance = 5
    this.controles.maxDistance = 42
    this.controles.addEventListener('start', () => {
      this.movida = true
      this.tween = null
    })

    const datos = new Uint8Array([105, 185, 255])
    this.gradiente = new THREE.DataTexture(datos, datos.length, 1, THREE.RedFormat)
    this.gradiente.minFilter = THREE.NearestFilter
    this.gradiente.magFilter = THREE.NearestFilter
    this.gradiente.generateMipmaps = false
    this.gradiente.needsUpdate = true

    this.construirLuces()
    this.entorno = crearEntorno(this.gradiente)
    this.escena.add(this.entorno.grupo)
    this.construirBase()
    this.construirLector()
    this.construirUnidadDeControl()
    this.construirCinta()
    this.mostrarEstado(null)
    this.actualizarPantalla('listo', 'LISTO')

    this.observador = new ResizeObserver(() => this.redimensionar())
    this.observador.observe(contenedor)
    this.redimensionar()

    document.fonts?.load('800 118px "JetBrains Mono"').then(() => {
      vaciarCacheSimbolos()
      for (const c of this.celdas.values()) c.valor = null
      const estado = this.estadoMostrado
      this.estadoMostrado = undefined
      this.mostrarEstado(estado)
    })

    this.renderer.setAnimationLoop(() => this.cuadro())
  }

  toon(color, extra = {}) {
    return new THREE.MeshToonMaterial({ color, gradientMap: this.gradiente, ...extra })
  }

  malla(geometria, material, { sombra = true, recibe = true, contorno = true } = {}) {
    const m = new THREE.Mesh(geometria, material)
    m.castShadow = sombra
    m.receiveShadow = recibe
    if (!contorno) material.userData.outlineParameters = { visible: false }
    return m
  }

  agregar(geometria, color, [x, y, z], opciones) {
    const m = this.malla(geometria, typeof color === 'string' ? this.toon(color) : color, opciones)
    m.position.set(x, y, z)
    this.escena.add(m)
    return m
  }

  pantallaPlana(lienzo, ancho, alto, posicion, horizontal = false) {
    const m = this.agregar(
      new THREE.PlaneGeometry(ancho, alto),
      new THREE.MeshBasicMaterial({ map: lienzo.textura, transparent: true }),
      posicion,
      { sombra: false, contorno: false },
    )
    if (horizontal) m.rotation.x = -Math.PI / 2
    return m
  }

  brillos(lista) {
    for (const [x, y, z, alto] of lista) {
      const brillo = this.agregar(
        new THREE.PlaneGeometry(0.06, alto),
        new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.9, depthWrite: false }),
        [x, y, z],
        { sombra: false, recibe: false, contorno: false },
      )
      brillo.rotation.z = 0.45
      brillo.renderOrder = 3
    }
  }

  construirLuces() {
    this.escena.add(new THREE.HemisphereLight('#e4f3ff', '#a9c77c', 1.45))
    const sol = new THREE.DirectionalLight('#fff4de', 2.3)
    sol.position.set(6, 16, 6)
    sol.castShadow = true
    sol.shadow.mapSize.set(2048, 2048)
    Object.assign(sol.shadow.camera, { left: -15, right: 15, top: 11, bottom: -11, near: 1, far: 50 })
    sol.shadow.bias = -0.0006
    this.escena.add(sol)
  }

  construirBase() {
    this.agregar(new RoundedBoxGeometry(19, 0.42, 8.2, 3, 0.12), COLORES.plataforma, [0, -0.21, -0.85])
    this.agregar(new RoundedBoxGeometry(19.8, 0.36, 9, 3, 0.12), COLORES.zocalo, [0, -0.5, -0.85])
    this.agregar(new RoundedBoxGeometry(BORDE_ALIMENTADOR * 2 + 0.4, 0.3, 2.1, 3, 0.08), COLORES.bandeja, [0, 0.15, 0])
    for (const z of [-0.98, 0.98]) {
      this.agregar(new THREE.BoxGeometry(BORDE_ALIMENTADOR * 2, 0.05, 0.1), COLORES.riel, [0, 0.325, z])
    }

    this.rodillos = []
    for (const lado of [-1, 1]) {
      const x = lado * (BORDE_ALIMENTADOR + 0.95)
      this.agregar(new RoundedBoxGeometry(1.9, 1.5, 2.8, 4, 0.22), COLORES.alimentador, [x, 0.75, 0])
      this.agregar(new RoundedBoxGeometry(1.3, 0.12, 2.0, 2, 0.05), COLORES.acento, [x, 1.54, 0])
      this.agregar(new THREE.BoxGeometry(0.04, 0.2, 1.36), COLORES.ranura, [lado * BORDE_ALIMENTADOR, 0.39, 0], { contorno: false })

      const rodillo = new THREE.Group()
      const cilindro = this.malla(new THREE.CylinderGeometry(0.2, 0.2, 1.46, 24), this.toon(COLORES.rodillo))
      cilindro.rotation.x = Math.PI / 2
      rodillo.add(cilindro)
      for (let i = 0; i < 4; i++) {
        const franja = this.malla(new THREE.BoxGeometry(0.06, 0.02, 1.48), this.toon(COLORES.tinta), { contorno: false })
        const a = (i * Math.PI) / 2
        franja.position.set(Math.cos(a) * 0.2, Math.sin(a) * 0.2, 0)
        franja.rotation.z = a + Math.PI / 2
        rodillo.add(franja)
      }
      rodillo.position.set(lado * (BORDE_ALIMENTADOR - 0.3), 0.64, 0)
      this.escena.add(rodillo)
      this.rodillos.push(rodillo)
      for (const z of [-0.84, 0.84]) {
        this.agregar(new RoundedBoxGeometry(0.42, 0.56, 0.14, 2, 0.04), COLORES.alimentador, [lado * (BORDE_ALIMENTADOR - 0.2), 0.6, z])
      }
    }
  }

  construirLector() {
    this.agregar(
      anillo({ ancho: 2.2, fondo: 3.4, radio: 0.32, hueco: 1.4, radioHueco: 0.1, alto: 0.5, bisel: 0.04 }),
      COLORES.cuerpo,
      [0, 0.34, 0],
    )
    for (const lado of [-1, 1]) {
      this.agregar(new THREE.BoxGeometry(0.04, 0.2, 1.36), COLORES.ranura, [lado * 1.14, 0.39, 0], { contorno: false })
    }
    this.agregar(
      anillo({ ancho: 1.86, fondo: 1.86, radio: 0.16, hueco: 1.4, radioHueco: 0.1, alto: 0.06, bisel: 0.02 }),
      COLORES.acento,
      [0, 0.9, 0],
    )

    for (const x of [-0.79, 0.79]) {
      for (const z of [-0.79, 0.79]) this.agregar(new RoundedBoxGeometry(0.14, 0.88, 0.14, 2, 0.04), COLORES.cuerpo, [x, 1.42, z])
    }
    this.agregar(
      anillo({ ancho: 1.74, fondo: 1.74, radio: 0.12, hueco: 1.46, radioHueco: 0.06, alto: 0.08, bisel: 0.02 }),
      COLORES.cuerpo,
      [0, 1.88, 0],
    )

    const vidrio = this.agregar(
      new RoundedBoxGeometry(1.58, 0.88, 1.58, 3, 0.06),
      this.toon(COLORES.vidrio, { transparent: true, opacity: 0.16, depthWrite: false, emissive: COLORES.vidrio, emissiveIntensity: 0.6 }),
      [0, 1.42, 0],
      { sombra: false, recibe: false, contorno: false },
    )
    vidrio.renderOrder = 2
    this.brillos([[-0.48, 1.45, 0.8, 0.46], [-0.32, 1.45, 0.8, 0.24]])

    const triangulo = new THREE.Shape()
    triangulo.moveTo(0, -0.2)
    triangulo.lineTo(0.22, 0.12)
    triangulo.lineTo(-0.22, 0.12)
    triangulo.closePath()
    const geometriaTriangulo = new THREE.ExtrudeGeometry(triangulo, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 1 })
    geometriaTriangulo.rotateX(-Math.PI / 2)
    this.agregar(geometriaTriangulo, COLORES.acento, [0, 1.99, -0.7])

    this.cabezal = new THREE.Group()
    const varilla = this.malla(new THREE.CylinderGeometry(0.05, 0.05, 0.8, 16), this.toon(COLORES.tinta))
    varilla.position.y = 0.42
    const collar = this.malla(new THREE.CylinderGeometry(0.11, 0.11, 0.1, 20), this.toon(COLORES.acento))
    collar.position.y = 0.06
    const punta = this.malla(new THREE.ConeGeometry(0.09, 0.2, 20), this.toon(COLORES.cuerpo))
    punta.rotation.x = Math.PI
    punta.position.y = -0.09
    this.cabezal.add(varilla, collar, punta)
    this.cabezal.position.set(0, 1.02, -0.56)
    this.escena.add(this.cabezal)

    const luz = (geometria, posicion) => {
      const m = this.agregar(
        geometria,
        new THREE.MeshBasicMaterial({ color: COLORES.lectura, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }),
        posicion,
        { sombra: false, recibe: false, contorno: false },
      )
      m.renderOrder = 4
      return m
    }
    const punta0 = new THREE.Vector3(0, 0.82, -0.56)
    const centroCelda = new THREE.Vector3(0, Y_CELDA + 0.06, 0)
    const largo = punta0.distanceTo(centroCelda)
    const cono = new THREE.ConeGeometry(0.4, largo, 24, 1, true)
    cono.translate(0, -largo / 2, 0)
    this.haz = luz(cono, [punta0.x, punta0.y, punta0.z])
    this.haz.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), centroCelda.clone().sub(punta0).normalize())
    const plano = new THREE.PlaneGeometry(1.05, 1.05)
    plano.rotateX(-Math.PI / 2)
    this.escaneo = luz(plano, [0, Y_CELDA + 0.07, 0])

    this.placaEstado = crearLienzo(512, 198)
    this.pantallaPlana(this.placaEstado, 1.55, 0.6, [-0.12, 0.885, 1.3], true)

    this.agregar(new RoundedBoxGeometry(1.7, 0.36, 0.06, 2, 0.03), COLORES.tinta, [0, 0.6, 1.74])
    this.pantalla = crearLienzo(640, 112)
    this.pantallaPlana(this.pantalla, 1.58, 0.27, [0, 0.6, 1.775])

    this.leds = [
      this.agregar(new THREE.SphereGeometry(0.08, 20, 14), this.toon(COLOR_LED.listo, { emissive: COLOR_LED.listo, emissiveIntensity: 0.5 }), [0.86, 0.94, 1.3]),
    ]
  }

  construirUnidadDeControl() {
    const ventana = { x: -1.05, y: -0.35, radio: 0.5 }
    const [vx, vy] = [ventana.x, 1.5 + ventana.y]

    this.agregar(new RoundedBoxGeometry(3.6, 3.0, 1.3, 4, 0.18), COLORES.cuerpo, [0, 1.5, -2.6])
    this.agregar(panelConVentana({ ancho: 3.6, alto: 3.0, radio: 0.24, ventana, grosor: 0.12, bisel: 0.03 }), COLORES.cuerpo, [0, 1.5, Z_PANEL - 0.15])
    this.agregar(new RoundedBoxGeometry(3.72, 0.14, 1.44, 2, 0.05), COLORES.acento, [0, 3.04, -2.6])

    this.agregar(new THREE.CircleGeometry(0.5, 40), COLORES.fondoMecanismo, [vx, vy, Z_PANEL - 0.17], { contorno: false })
    const centro = { x: vx - 0.07, y: vy + 0.07 }
    this.engranes = [
      { radio: 0.3, dientes: 12, color: COLORES.laton, x: centro.x, y: centro.y, fase: 0 },
      { radio: 0.17, dientes: 7, color: COLORES.cobre, x: centro.x + 0.47 * Math.cos(-0.6), y: centro.y + 0.47 * Math.sin(-0.6), fase: 0.2 },
      { radio: 0.2, dientes: 8, color: COLORES.acero, x: centro.x + 0.5 * Math.cos(2.4), y: centro.y + 0.5 * Math.sin(2.4), fase: 0.1 },
    ].map((e) => ({ ...e, malla: this.agregar(engrane(e), e.color, [e.x, e.y, Z_PANEL - 0.13], { sombra: false }) }))
    this.agregar(new THREE.TorusGeometry(0.52, 0.055, 10, 40), COLORES.laton, [vx, vy, Z_PANEL + 0.005])
    const vidrio = this.agregar(
      new THREE.CircleGeometry(0.5, 40),
      new THREE.MeshBasicMaterial({ color: COLORES.vidrio, transparent: true, opacity: 0.18, depthWrite: false }),
      [vx, vy, Z_PANEL + 0.01],
      { sombra: false, recibe: false, contorno: false },
    )
    vidrio.renderOrder = 2
    this.brillos([[vx - 0.2, vy + 0.08, Z_PANEL + 0.02, 0.4]])

    this.agregar(new RoundedBoxGeometry(1.0, 0.8, 0.05, 2, 0.04), COLORES.tinta, [1.05, 1.07, Z_PANEL + 0.01])
    this.bombillas = []
    for (let fila = 0; fila < 3; fila++) {
      for (let col = 0; col < 4; col++) {
        this.bombillas.push(
          this.agregar(
            new THREE.SphereGeometry(0.075, 16, 12),
            this.toon(COLORES.bombillaApagada, { emissive: COLORES.bombillaEncendida, emissiveIntensity: 0 }),
            [0.75 + col * 0.2, 1.32 - fila * 0.25, Z_PANEL + 0.06],
            { sombra: false },
          ),
        )
      }
    }

    this.agregar(new RoundedBoxGeometry(2.3, 0.9, 0.06, 2, 0.03), COLORES.tinta, [0, 2.38, Z_PANEL + 0.01])
    this.pantallaEstado = crearLienzo(512, 182)
    this.pantallaPlana(this.pantallaEstado, 2.14, 0.76, [0, 2.38, Z_PANEL + 0.045])

    this.tubos = {}
    for (const [nombre, x, color, desdeLector] of [['lectura', -0.45, COLORES.lectura, true], ['escritura', 0.45, COLORES.escritura, false]]) {
      const puntos = [new THREE.Vector3(x, 1.92, -0.9), new THREE.Vector3(x, 1.66, -1.35), new THREE.Vector3(x, 1.55, Z_PANEL)]
      const curva = new THREE.CatmullRomCurve3(desdeLector ? puntos : [...puntos].reverse())
      this.agregar(new THREE.TubeGeometry(curva, 32, 0.055, 10), COLORES.tinta, [0, 0, 0])
      for (const [p, dz] of [[puntos[0], -0.04], [puntos[2], 0.05]]) {
        const collar = this.agregar(new THREE.CylinderGeometry(0.09, 0.09, 0.1, 16), COLORES.laton, [p.x, p.y, p.z + dz])
        collar.rotation.x = Math.PI / 2
      }
      const pulso = this.agregar(new THREE.SphereGeometry(0.13, 16, 12), this.toon(color, { emissive: color, emissiveIntensity: 1.2 }), [0, 0, 0], { sombra: false })
      pulso.visible = false
      this.tubos[nombre] = { curva, pulso }
    }

    this.pistones = [-0.94, 0.94].map((x) => {
      this.agregar(new THREE.CylinderGeometry(0.13, 0.13, 0.42, 18), COLORES.acento, [x, 1.09, -1.3])
      const vastago = new THREE.Group()
      const barra = this.malla(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 12), this.toon(COLORES.acero))
      const tapa = this.malla(new THREE.CylinderGeometry(0.11, 0.11, 0.07, 18), this.toon(COLORES.cuerpo))
      tapa.position.y = 0.26
      vastago.add(barra, tapa)
      vastago.position.set(x, 1.3, -1.3)
      this.escena.add(vastago)
      return vastago
    })

    this.agregar(new THREE.CylinderGeometry(0.17, 0.2, 0.5, 18), COLORES.tinta, [1.2, 3.35, -2.6])
    this.agregar(new THREE.CylinderGeometry(0.21, 0.21, 0.08, 18), COLORES.acento, [1.2, 3.62, -2.6])
    this.agregar(new THREE.CylinderGeometry(0.025, 0.025, 0.7, 8), COLORES.tinta, [-1.3, 3.45, -2.75])
    this.leds.push(
      this.agregar(new THREE.SphereGeometry(0.11, 20, 14), this.toon(COLOR_LED.listo, { emissive: COLOR_LED.listo, emissiveIntensity: 0.5 }), [-1.3, 3.86, -2.75]),
    )

    this.humos = Array.from({ length: 8 }, () => {
      const material = this.toon('#ffffff', { transparent: true, opacity: 0, depthWrite: false, flatShading: true, emissive: '#ffffff', emissiveIntensity: 0.3 })
      const malla = this.agregar(new THREE.IcosahedronGeometry(0.22, 1), material, [1.2, 3.7, -2.6], { sombra: false, recibe: false, contorno: false })
      malla.visible = false
      return { malla, t0: -1 }
    })
  }

  construirCinta() {
    this.grupoCinta = new THREE.Group()
    this.escena.add(this.grupoCinta)
    this.geometriaCelda = new RoundedBoxGeometry(1.12, 0.09, 1.12, 2, 0.03)
    this.geometriaSimbolo = new THREE.PlaneGeometry(0.9, 0.9)
    this.geometriaSimbolo.rotateX(-Math.PI / 2)
    const tope = this.malla(new RoundedBoxGeometry(0.14, 0.16, 1.16, 2, 0.04), this.toon(COLORES.tinta))
    tope.position.set(-0.66, Y_CELDA + 0.02, 0)
    this.grupoCinta.add(tope)
  }

  tomarCelda(i) {
    let celda = this.libres.pop()
    if (!celda) {
      const grupo = new THREE.Group()
      const caja = this.malla(this.geometriaCelda, this.toon(COLORES.papel, { emissive: '#ff6f4f', emissiveIntensity: 0 }))
      const material = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false })
      material.userData.outlineParameters = { visible: false }
      const simbolo = new THREE.Mesh(this.geometriaSimbolo, material)
      simbolo.position.y = 0.05
      grupo.add(caja, simbolo)
      celda = { grupo, caja, simbolo }
    }
    Object.assign(celda, { valor: null, activa: null, destello: 0 })
    celda.grupo.position.set(i * PASO, Y_CELDA, 0)
    this.grupoCinta.add(celda.grupo)
    this.celdas.set(i, celda)
    return celda
  }

  actualizarCeldas(ahora) {
    const minimo = Math.max(0, Math.floor(this.pos) - ALCANCE)
    const maximo = Math.ceil(this.pos) + ALCANCE
    for (const [i, celda] of this.celdas) {
      if (i < minimo || i > maximo) {
        this.grupoCinta.remove(celda.grupo)
        this.libres.push(celda)
        this.celdas.delete(i)
      }
    }
    const bajoCabeza = Math.round(this.pos)
    for (let i = minimo; i <= maximo; i++) {
      const celda = this.celdas.get(i) ?? this.tomarCelda(i)
      const valor = this.simbolos[i] ?? BLANCO
      if (celda.valor !== valor) {
        celda.simbolo.material.map = texturaSimbolo(valor)
        celda.simbolo.material.needsUpdate = true
        celda.valor = valor
      }
      const activa = i === bajoCabeza
      if (celda.activa !== activa) {
        celda.caja.material.color.set(activa ? COLORES.papelActivo : COLORES.papel)
        celda.activa = activa
      }
      const k = celda.destello ? (ahora - celda.destello) / 420 : 1
      if (k < 1) {
        const pulso = Math.sin(Math.PI * k)
        celda.caja.material.emissiveIntensity = 0.85 * pulso
        celda.grupo.scale.setScalar(1 + 0.1 * pulso)
        celda.grupo.position.y = Y_CELDA + 0.12 * pulso
      } else if (celda.destello) {
        celda.destello = 0
        celda.caja.material.emissiveIntensity = 0
        celda.grupo.scale.setScalar(1)
        celda.grupo.position.y = Y_CELDA
      }
    }
  }

  escribir(simbolos, celda, ahora) {
    const cambio = (this.simbolos[celda] ?? BLANCO) !== (simbolos[celda] ?? BLANCO)
    this.simbolos = simbolos
    const c = this.celdas.get(celda)
    if (cambio && c) c.destello = ahora
  }

  terminarPaso() {
    const p = this.paso
    if (!p) return
    if (p.fases) {
      if (!p.simbolosListos) this.escribir(p.simbolos, p.celda, performance.now())
      if (!p.estadoListo) this.mostrarEstado(p.estado)
    }
    this.pos = p.hasta
    this.paso = null
  }

  mostrar({ id, indice, cinta, cabeza, estado, situacion, pantalla, escritura, duracion }) {
    this.terminarPaso()
    const ahora = performance.now()
    const simbolos = [...cinta]
    const mismaEjecucion = id === this.id
    const consecutivo = mismaEjecucion && indice === this.indice + 1 && escritura !== null && escritura !== undefined

    if (consecutivo && duracion > 40) {
      this.paso = { t0: ahora, dur: duracion, desde: this.pos, hasta: cabeza, fases: true, simbolos, celda: escritura, estado }
    } else {
      if (consecutivo) this.escribir(simbolos, escritura, ahora)
      else this.simbolos = simbolos
      this.mostrarEstado(estado)
      this.paso = mismaEjecucion && duracion > 0 ? { t0: ahora, dur: duracion, desde: this.pos, hasta: cabeza, fases: false } : null
      if (!this.paso) this.pos = cabeza
    }

    this.id = id
    this.indice = indice
    this.cabeza = cabeza
    this.registro = indice
    this.actualizarPantalla(situacion, pantalla)
  }

  mostrarEstado(estado) {
    if (estado === this.estadoMostrado) return
    dibujarEstado(this.placaEstado.lienzo, estado, 'ESTADO')
    dibujarEstado(this.pantallaEstado.lienzo, estado, 'ESTADO ACTUAL')
    this.placaEstado.textura.needsUpdate = true
    this.pantallaEstado.textura.needsUpdate = true
    this.estadoMostrado = estado
  }

  actualizarPantalla(situacion, texto) {
    if (situacion !== this.situacionPantalla || texto !== this.textoPantalla) {
      dibujarPantalla(this.pantalla.lienzo, situacion, texto)
      this.pantalla.textura.needsUpdate = true
      for (const led of this.leds) {
        led.material.color.set(COLOR_LED[situacion])
        led.material.emissive.set(COLOR_LED[situacion])
      }
      this.situacionPantalla = situacion
      this.textoPantalla = texto
    }
    this.situacion = situacion
  }

  soltarHumo(ahora) {
    if (ahora - this.ultimoHumo < 200) return
    const libre = this.humos.find((h) => h.t0 < 0) ?? this.humos.reduce((a, b) => (a.t0 < b.t0 ? a : b))
    libre.t0 = ahora
    libre.malla.visible = true
    this.ultimoHumo = ahora
  }

  encuadre(vista) {
    const aspecto = Math.max(0.3, this.camara.aspect)
    const apertura = 2 * Math.tan(THREE.MathUtils.degToRad(this.camara.fov / 2))
    const distancia = (ancho, minimo, maximo) => acotar(ancho / (apertura * aspecto), minimo, maximo)
    if (vista === 'planta') {
      return { posicion: new THREE.Vector3(0, distancia(12, 11, 34), -0.6 + 0.001), objetivo: new THREE.Vector3(0, 0.4, -0.6) }
    }
    const [direccion, ancho, objetivo] =
      vista === 'frontal'
        ? [new THREE.Vector3(0, 0.2, 1), acotar(8 * aspecto, 11, 16), new THREE.Vector3(0, 1.45, -0.6)]
        : [new THREE.Vector3(0, 1.0, 1), acotar(7.5 * aspecto, 10.5, 15.5), new THREE.Vector3(0, 1.1, -0.7)]
    const d = distancia(ancho, 9, 32)
    return { posicion: objetivo.clone().addScaledVector(direccion.normalize(), d), objetivo }
  }

  cambiarVista(vista, animar = true) {
    this.vista = vista
    this.movida = false
    const { posicion, objetivo } = this.encuadre(vista)
    this.controles.enableRotate = vista !== 'planta'
    this.tween = {
      desdeP: this.camara.position.clone(),
      haciaP: posicion,
      desdeO: this.controles.target.clone(),
      haciaO: objetivo,
      t0: performance.now(),
      dur: animar ? 900 : 0,
    }
  }

  redimensionar() {
    const { clientWidth: ancho, clientHeight: alto } = this.contenedor
    if (!ancho || !alto) return
    this.renderer.setSize(ancho, alto, false)
    this.camara.aspect = ancho / alto
    this.camara.updateProjectionMatrix()
    if (!this.movida) this.cambiarVista(this.vista, false)
  }

  cuadro() {
    const ahora = performance.now()
    const dt = Math.min(0.1, (ahora - this.ultimoCuadro) / 1000)
    this.ultimoCuadro = ahora

    if (this.tween) {
      const t = this.tween.dur ? acotar((ahora - this.tween.t0) / this.tween.dur, 0, 1) : 1
      const e = suavizar(t)
      this.camara.position.lerpVectors(this.tween.desdeP, this.tween.haciaP, e)
      this.controles.target.lerpVectors(this.tween.desdeO, this.tween.haciaO, e)
      if (t >= 1) this.tween = null
    }

    const fases = { lectura: -1, computo: -1, escritura: -1, golpe: -1 }
    const p = this.paso
    if (p) {
      const f = acotar((ahora - p.t0) / p.dur, 0, 1)
      let avance = f
      if (p.fases) {
        for (const nombre of Object.keys(fases)) fases[nombre] = enFase(f, FASES[nombre])
        avance = progreso(f, FASES.desplazamiento)
        if (fases.computo >= 0) this.soltarHumo(ahora)
        if (!p.estadoListo && f >= CAMBIO_ESTADO) {
          this.mostrarEstado(p.estado)
          p.estadoListo = true
        }
        if (!p.simbolosListos && f >= CAMBIO_SIMBOLO) {
          this.escribir(p.simbolos, p.celda, ahora)
          p.simbolosListos = true
        }
      }
      this.pos = p.desde + (p.hasta - p.desde) * suavizar(avance)
      if (f >= 1) this.paso = null
    }
    this.grupoCinta.position.x = -this.pos * PASO
    this.actualizarCeldas(ahora)
    this.animarMecanismos(ahora, dt, fases)
    this.entorno.actualizar(dt)

    this.controles.update()
    const suelo = alturaTerreno(this.camara.position.x, this.camara.position.z) + 1.2
    if (this.camara.position.y < suelo) this.camara.position.y = suelo
    this.efecto.render(this.escena, this.camara)
  }

  animarMecanismos(ahora, dt, { lectura, computo, escritura, golpe }) {
    const brillo = lectura >= 0 && lectura < FIN_ESCANEO ? Math.sin((Math.PI * lectura) / FIN_ESCANEO) : 0
    this.haz.material.opacity = 0.32 * brillo
    this.escaneo.material.opacity = 0.55 * brillo
    const envio = lectura >= FIN_ESCANEO * 0.7 ? (lectura - FIN_ESCANEO * 0.7) / (1 - FIN_ESCANEO * 0.7) : -1
    for (const [nombre, t] of [['lectura', envio], ['escritura', escritura]]) {
      const { curva, pulso } = this.tubos[nombre]
      pulso.visible = t >= 0
      if (t >= 0) {
        pulso.position.copy(curva.getPointAt(t))
        pulso.scale.setScalar(0.8 + 0.4 * Math.sin(Math.PI * t))
      }
    }

    const base = this.situacion === 'ejecutando' ? 1.1 : 0.25
    this.angulo += dt * (base + (computo >= 0 ? 8 * Math.sin(Math.PI * computo) : 0))
    const [mayor] = this.engranes
    for (const e of this.engranes) {
      e.malla.rotation.z = e === mayor ? this.angulo : -this.angulo * (mayor.radio / e.radio) + e.fase
    }

    const [izquierdo, derecho] = this.pistones
    izquierdo.position.y = 1.3 + (computo >= 0 ? 0.28 * Math.sin(Math.PI * computo) : 0)
    derecho.position.y = 1.3 + (computo >= 0 ? 0.28 * Math.sin(Math.PI * acotar(computo * 1.5 - 0.5, 0, 1)) : 0)

    this.cabezal.position.y = 1.02 - (golpe >= 0 ? Math.sin(Math.PI * golpe) * 0.34 : 0)

    if (computo >= 0) {
      if (ahora - this.ultimoParpadeo > 60) {
        for (const b of this.bombillas) b.material.emissiveIntensity = Math.random() < 0.5 ? 1 : 0
        this.ultimoParpadeo = ahora
      }
    } else {
      this.bombillas.forEach((b, i) => {
        b.material.emissiveIntensity = (this.registro >> (BITS - 1 - i)) & 1 ? 1 : 0
      })
    }

    for (const h of this.humos) {
      if (h.t0 < 0) continue
      const k = (ahora - h.t0) / 1700
      if (k >= 1) {
        h.t0 = -1
        h.malla.visible = false
        continue
      }
      h.malla.position.set(1.2 + 0.3 * Math.sin(k * 5), 3.72 + 1.7 * k, -2.6 + 0.25 * k)
      h.malla.scale.setScalar(0.6 + 1.7 * k)
      h.malla.material.opacity = 0.85 * (1 - k)
    }

    const giro = (this.pos * PASO) / 0.2
    for (const r of this.rodillos) r.rotation.z = -giro

    const intensidad = this.situacion === 'ejecutando' ? 0.5 + 0.5 * Math.sin(ahora / 120) : 0.6
    for (const led of this.leds) led.material.emissiveIntensity = intensidad
  }

  destruir() {
    this.renderer.setAnimationLoop(null)
    this.observador.disconnect()
    this.controles.dispose()
    this.escena.traverse((o) => {
      o.geometry?.dispose()
      if (o.material) for (const m of [].concat(o.material)) m.dispose()
    })
    for (const c of this.libres) {
      c.caja.material.dispose()
      c.simbolo.material.dispose()
    }
    for (const l of [this.placaEstado, this.pantallaEstado, this.pantalla]) l.textura.dispose()
    this.escena.background.dispose()
    this.gradiente.dispose()
    vaciarCacheSimbolos()
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }
}
