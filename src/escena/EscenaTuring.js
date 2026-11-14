import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { OutlineEffect } from 'three/examples/jsm/effects/OutlineEffect.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { BLANCO } from '../services/notacion.js'
import { crearLienzo, dibujarEstado, dibujarPantalla, texturaSimbolo, vaciarCacheSimbolos } from './texturas.js'

const PASO = 1.3
const ALCANCE = 7
const Y_CELDA = 0.345
const BORDE_ALIMENTADOR = 5.6

const COLORES = {
  fondo: '#efe6d4',
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

function rectanguloRedondeado(ruta, ancho, fondo, radio) {
  const x = -ancho / 2
  const y = -fondo / 2
  ruta.moveTo(x + radio, y)
  ruta.lineTo(x + ancho - radio, y)
  ruta.quadraticCurveTo(x + ancho, y, x + ancho, y + radio)
  ruta.lineTo(x + ancho, y + fondo - radio)
  ruta.quadraticCurveTo(x + ancho, y + fondo, x + ancho - radio, y + fondo)
  ruta.lineTo(x + radio, y + fondo)
  ruta.quadraticCurveTo(x, y + fondo, x, y + fondo - radio)
  ruta.lineTo(x, y + radio)
  ruta.quadraticCurveTo(x, y, x + radio, y)
  return ruta
}

function anillo({ ancho, fondo, radio, hueco, radioHueco, alto, bisel }) {
  const forma = rectanguloRedondeado(new THREE.Shape(), ancho, fondo, radio)
  forma.holes.push(rectanguloRedondeado(new THREE.Path(), hueco, hueco, radioHueco))
  const g = new THREE.ExtrudeGeometry(forma, {
    depth: alto,
    bevelEnabled: true,
    bevelThickness: bisel,
    bevelSize: bisel,
    bevelSegments: 2,
    curveSegments: 10,
  })
  g.rotateX(-Math.PI / 2)
  return g
}

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
    this.anim = null
    this.pendiente = null
    this.golpe = null
    this.tween = null
    this.situacion = 'listo'

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.domElement.className = 'lienzo-3d'
    contenedor.appendChild(this.renderer.domElement)
    this.efecto = new OutlineEffect(this.renderer, { defaultThickness: 0.0042, defaultColor: [0.1, 0.1, 0.12] })

    this.escena = new THREE.Scene()
    this.escena.background = new THREE.Color(COLORES.fondo)
    this.camara = new THREE.PerspectiveCamera(30, 1, 0.1, 300)
    this.controles = new OrbitControls(this.camara, this.renderer.domElement)
    this.controles.enableDamping = true
    this.controles.maxPolarAngle = Math.PI * 0.47
    this.controles.minDistance = 5
    this.controles.maxDistance = 60
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
    this.construirEntorno()
    this.construirImpresora()
    this.construirCinta()

    this.observador = new ResizeObserver(() => this.redimensionar())
    this.observador.observe(contenedor)
    this.redimensionar()

    document.fonts?.load('800 118px "JetBrains Mono"').then(() => {
      vaciarCacheSimbolos()
      for (const c of this.celdas.values()) c.valor = null
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

  construirLuces() {
    this.escena.add(new THREE.HemisphereLight('#ffffff', '#c9b892', 1.5))
    const sol = new THREE.DirectionalLight('#ffffff', 2.3)
    sol.position.set(4, 16, 5)
    sol.castShadow = true
    sol.shadow.mapSize.set(2048, 2048)
    Object.assign(sol.shadow.camera, { left: -13, right: 13, top: 7, bottom: -7, near: 1, far: 40 })
    sol.shadow.bias = -0.0006
    this.escena.add(sol)
  }

  construirEntorno() {
    const suelo = this.malla(new THREE.CircleGeometry(200, 64), new THREE.MeshBasicMaterial({ color: COLORES.fondo }), { sombra: false, recibe: false, contorno: false })
    suelo.rotation.x = -Math.PI / 2
    this.escena.add(suelo)
    const sombras = this.malla(new THREE.PlaneGeometry(40, 20), new THREE.ShadowMaterial({ color: '#5b4a2c', opacity: 0.18 }), { sombra: false, contorno: false })
    sombras.rotation.x = -Math.PI / 2
    sombras.position.y = 0.002
    this.escena.add(sombras)

    const bandeja = this.malla(new RoundedBoxGeometry(BORDE_ALIMENTADOR * 2 + 0.4, 0.3, 2.0, 3, 0.08), this.toon(COLORES.bandeja))
    bandeja.position.y = 0.15
    this.escena.add(bandeja)

    for (const z of [-0.92, 0.92]) {
      const riel = this.malla(new THREE.BoxGeometry(BORDE_ALIMENTADOR * 2, 0.05, 0.1), this.toon(COLORES.riel))
      riel.position.set(0, 0.325, z)
      this.escena.add(riel)
    }

    this.rodillos = []
    for (const lado of [-1, 1]) {
      const alimentador = this.malla(new RoundedBoxGeometry(1.9, 1.5, 2.7, 4, 0.22), this.toon(COLORES.alimentador))
      alimentador.position.set(lado * (BORDE_ALIMENTADOR + 0.95), 0.75, 0)
      this.escena.add(alimentador)

      const ranura = this.malla(new THREE.BoxGeometry(0.04, 0.2, 1.3), this.toon(COLORES.ranura), { contorno: false })
      ranura.position.set(lado * BORDE_ALIMENTADOR, 0.39, 0)
      this.escena.add(ranura)

      const tapa = this.malla(new RoundedBoxGeometry(1.3, 0.12, 2.0, 2, 0.05), this.toon(COLORES.acento))
      tapa.position.set(lado * (BORDE_ALIMENTADOR + 0.95), 1.54, 0)
      this.escena.add(tapa)

      const rodillo = new THREE.Group()
      const cilindro = this.malla(new THREE.CylinderGeometry(0.2, 0.2, 1.4, 24), this.toon(COLORES.rodillo))
      cilindro.rotation.x = Math.PI / 2
      rodillo.add(cilindro)
      for (let i = 0; i < 4; i++) {
        const franja = this.malla(new THREE.BoxGeometry(0.06, 0.02, 1.42), this.toon(COLORES.tinta), { contorno: false })
        const a = (i * Math.PI) / 2
        franja.position.set(Math.cos(a) * 0.2, Math.sin(a) * 0.2, 0)
        franja.rotation.z = a + Math.PI / 2
        rodillo.add(franja)
      }
      rodillo.position.set(lado * (BORDE_ALIMENTADOR - 0.3), 0.64, 0)
      this.escena.add(rodillo)
      this.rodillos.push(rodillo)

      for (const z of [-0.8, 0.8]) {
        const soporte = this.malla(new RoundedBoxGeometry(0.42, 0.56, 0.14, 2, 0.04), this.toon(COLORES.alimentador))
        soporte.position.set(lado * (BORDE_ALIMENTADOR - 0.2), 0.6, z)
        this.escena.add(soporte)
      }
    }
  }

  construirImpresora() {
    const cuerpo = this.malla(
      anillo({ ancho: 2.0, fondo: 3.0, radio: 0.3, hueco: 1.36, radioHueco: 0.1, alto: 0.45, bisel: 0.04 }),
      this.toon(COLORES.cuerpo),
    )
    cuerpo.position.y = 0.34
    this.escena.add(cuerpo)

    for (const lado of [-1, 1]) {
      const ranura = this.malla(new THREE.BoxGeometry(0.04, 0.2, 1.3), this.toon(COLORES.ranura), { contorno: false })
      ranura.position.set(lado * 1.04, 0.39, 0)
      this.escena.add(ranura)
    }

    const bisel = this.malla(
      anillo({ ancho: 1.8, fondo: 1.8, radio: 0.16, hueco: 1.36, radioHueco: 0.1, alto: 0.06, bisel: 0.02 }),
      this.toon(COLORES.acento),
    )
    bisel.position.y = 0.85
    this.escena.add(bisel)

    for (const x of [-0.75, 0.75]) {
      for (const z of [-0.75, 0.75]) {
        const poste = this.malla(new RoundedBoxGeometry(0.14, 0.88, 0.14, 2, 0.04), this.toon(COLORES.cuerpo))
        poste.position.set(x, 1.37, z)
        this.escena.add(poste)
      }
    }

    const aro = this.malla(
      anillo({ ancho: 1.66, fondo: 1.66, radio: 0.12, hueco: 1.38, radioHueco: 0.06, alto: 0.08, bisel: 0.02 }),
      this.toon(COLORES.cuerpo),
    )
    aro.position.y = 1.81
    this.escena.add(aro)

    const vidrio = this.malla(
      new RoundedBoxGeometry(1.5, 0.86, 1.5, 3, 0.06),
      this.toon(COLORES.vidrio, { transparent: true, opacity: 0.16, depthWrite: false, emissive: COLORES.vidrio, emissiveIntensity: 0.6 }),
      { sombra: false, recibe: false, contorno: false },
    )
    vidrio.position.y = 1.37
    vidrio.renderOrder = 2
    this.escena.add(vidrio)

    for (const [x, alto] of [[-0.46, 0.46], [-0.3, 0.24]]) {
      const brillo = this.malla(
        new THREE.PlaneGeometry(0.06, alto),
        new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.9, depthWrite: false }),
        { sombra: false, recibe: false, contorno: false },
      )
      brillo.position.set(x, 1.4, 0.76)
      brillo.rotation.z = 0.45
      brillo.renderOrder = 3
      this.escena.add(brillo)
    }

    const triangulo = new THREE.Shape()
    triangulo.moveTo(0, -0.2)
    triangulo.lineTo(0.22, 0.12)
    triangulo.lineTo(-0.22, 0.12)
    triangulo.closePath()
    const puntero = this.malla(
      new THREE.ExtrudeGeometry(triangulo, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 1 }),
      this.toon(COLORES.acento),
    )
    puntero.geometry.rotateX(-Math.PI / 2)
    puntero.position.set(0, 1.93, -0.64)
    this.escena.add(puntero)

    this.cabezal = new THREE.Group()
    const varilla = this.malla(new THREE.CylinderGeometry(0.05, 0.05, 0.8, 16), this.toon(COLORES.tinta))
    varilla.position.y = 0.42
    const collar = this.malla(new THREE.CylinderGeometry(0.11, 0.11, 0.1, 20), this.toon(COLORES.acento))
    collar.position.y = 0.06
    const punta = this.malla(new THREE.ConeGeometry(0.09, 0.2, 20), this.toon(COLORES.cuerpo))
    punta.rotation.x = Math.PI
    punta.position.y = -0.09
    this.cabezal.add(varilla, collar, punta)
    this.cabezal.position.set(0, 0.95, -0.5)
    this.escena.add(this.cabezal)

    this.etiquetaEstado = crearLienzo(512, 166)
    const placa = this.malla(
      new THREE.PlaneGeometry(1.3, 0.42),
      new THREE.MeshBasicMaterial({ map: this.etiquetaEstado.textura, transparent: true }),
      { sombra: false, contorno: false },
    )
    placa.rotation.x = -Math.PI / 2
    placa.position.set(-0.12, 0.835, 1.2)
    this.escena.add(placa)

    const marco = this.malla(new RoundedBoxGeometry(1.6, 0.34, 0.06, 2, 0.03), this.toon(COLORES.tinta))
    marco.position.set(0, 0.56, 1.54)
    this.escena.add(marco)
    this.pantalla = crearLienzo(640, 112)
    const vidrioPantalla = this.malla(
      new THREE.PlaneGeometry(1.5, 0.26),
      new THREE.MeshBasicMaterial({ map: this.pantalla.textura }),
      { sombra: false, contorno: false },
    )
    vidrioPantalla.position.set(0, 0.56, 1.575)
    this.escena.add(vidrioPantalla)

    this.led = this.malla(new THREE.SphereGeometry(0.09, 20, 14), this.toon(COLOR_LED.listo, { emissive: COLOR_LED.listo, emissiveIntensity: 0.4 }))
    this.led.position.set(0.72, 0.89, 1.2)
    this.escena.add(this.led)

    this.actualizarEtiquetas(null, 'listo', 'LISTO')
  }

  construirCinta() {
    this.grupoCinta = new THREE.Group()
    this.escena.add(this.grupoCinta)
    this.geometriaCelda = new RoundedBoxGeometry(1.08, 0.09, 1.08, 2, 0.03)
    this.geometriaSimbolo = new THREE.PlaneGeometry(0.88, 0.88)
    this.geometriaSimbolo.rotateX(-Math.PI / 2)
    const tope = this.malla(new RoundedBoxGeometry(0.14, 0.16, 1.12, 2, 0.04), this.toon(COLORES.tinta))
    tope.position.set(-0.64, Y_CELDA + 0.02, 0)
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
      celda = { grupo, caja, simbolo, valor: null, activa: null, destello: 0 }
    }
    celda.valor = null
    celda.activa = null
    celda.destello = 0
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
      if (celda.valor !== valor || !celda.simbolo.material.map) {
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

  destellar(i, ahora) {
    const celda = this.celdas.get(i)
    if (celda) celda.destello = ahora
  }

  aplicarPendiente(forzar = false) {
    if (!this.pendiente) return
    const ahora = performance.now()
    if (!forzar && ahora < this.pendiente.en) return
    const { simbolos, celda } = this.pendiente
    const cambio = (this.simbolos[celda] ?? BLANCO) !== (simbolos[celda] ?? BLANCO)
    this.simbolos = simbolos
    if (cambio) this.destellar(celda, ahora)
    this.pendiente = null
  }

  mostrar({ id, indice, cinta, cabeza, estado, situacion, pantalla, escritura, duracion }) {
    this.aplicarPendiente(true)
    const ahora = performance.now()
    const simbolos = [...cinta]
    const consecutivo = id === this.id && indice === this.indice + 1 && escritura !== null && escritura !== undefined

    if (consecutivo && duracion > 40) {
      const golpe = Math.min(duracion * 0.45, 380)
      this.golpe = { t0: ahora, dur: golpe }
      this.pendiente = { simbolos, en: ahora + golpe * 0.5, celda: escritura }
      this.anim = { desde: this.pos, hasta: cabeza, t0: ahora + golpe * 0.8, dur: Math.max(50, duracion - golpe) }
    } else {
      const anteriores = this.simbolos
      this.simbolos = simbolos
      if (consecutivo && (anteriores[escritura] ?? BLANCO) !== (simbolos[escritura] ?? BLANCO)) this.destellar(escritura, ahora)
      this.anim = id === this.id && duracion > 0 ? { desde: this.pos, hasta: cabeza, t0: ahora, dur: duracion } : null
      if (!this.anim) this.pos = cabeza
    }

    this.id = id
    this.indice = indice
    this.cabeza = cabeza
    this.actualizarEtiquetas(estado, situacion, pantalla)
  }

  actualizarEtiquetas(estado, situacion, pantalla) {
    if (estado !== this.estadoMostrado) {
      dibujarEstado(this.etiquetaEstado.lienzo, estado)
      this.etiquetaEstado.textura.needsUpdate = true
      this.estadoMostrado = estado
    }
    if (situacion !== this.situacionMostrada || pantalla !== this.pantallaMostrada) {
      dibujarPantalla(this.pantalla.lienzo, situacion, pantalla)
      this.pantalla.textura.needsUpdate = true
      this.situacionMostrada = situacion
      this.pantallaMostrada = pantalla
      this.led.material.color.set(COLOR_LED[situacion])
      this.led.material.emissive.set(COLOR_LED[situacion])
    }
    this.situacion = situacion
  }

  encuadre(vista) {
    const aspecto = Math.max(0.3, this.camara.aspect)
    const apertura = 2 * Math.tan(THREE.MathUtils.degToRad(this.camara.fov / 2))
    const distancia = (ancho, minimo, maximo) => acotar(ancho / (apertura * aspecto), minimo, maximo)
    if (vista === 'planta') {
      return { posicion: new THREE.Vector3(0, distancia(10.5, 9, 30), 0.001), objetivo: new THREE.Vector3(0, 0.4, 0) }
    }
    const [direccion, ancho, objetivo] =
      vista === 'frontal'
        ? [new THREE.Vector3(0, 0.22, 1), acotar(8 * aspecto, 10.5, 15), new THREE.Vector3(0, 0.8, 0)]
        : [new THREE.Vector3(0, 1.15, 1), acotar(7.5 * aspecto, 9.5, 14.5), new THREE.Vector3(0, 0.45, 0.25)]
    const d = distancia(ancho, 9, 30)
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

    if (this.tween) {
      const t = this.tween.dur ? acotar((ahora - this.tween.t0) / this.tween.dur, 0, 1) : 1
      const e = suavizar(t)
      this.camara.position.lerpVectors(this.tween.desdeP, this.tween.haciaP, e)
      this.controles.target.lerpVectors(this.tween.desdeO, this.tween.haciaO, e)
      if (t >= 1) this.tween = null
    }

    this.aplicarPendiente()
    if (this.anim) {
      const t = acotar((ahora - this.anim.t0) / this.anim.dur, 0, 1)
      this.pos = this.anim.desde + (this.anim.hasta - this.anim.desde) * suavizar(t)
      if (t >= 1) this.anim = null
    }
    this.grupoCinta.position.x = -this.pos * PASO
    this.actualizarCeldas(ahora)

    let baja = 0
    if (this.golpe) {
      const g = acotar((ahora - this.golpe.t0) / this.golpe.dur, 0, 1)
      baja = Math.sin(Math.PI * g) * 0.3
      if (g >= 1) this.golpe = null
    }
    this.cabezal.position.y = 0.95 - baja

    const giro = (this.pos * PASO) / 0.2
    for (const r of this.rodillos) r.rotation.z = -giro

    this.led.material.emissiveIntensity = this.situacion === 'ejecutando' ? 0.5 + 0.5 * Math.sin(ahora / 120) : 0.6

    this.controles.update()
    this.efecto.render(this.escena, this.camara)
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
    this.etiquetaEstado.textura.dispose()
    this.pantalla.textura.dispose()
    this.gradiente.dispose()
    vaciarCacheSimbolos()
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }
}
