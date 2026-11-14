import * as THREE from 'three'

export function rectanguloRedondeado(ruta, ancho, fondo, radio) {
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

const extruir = (forma, alto, bisel) =>
  new THREE.ExtrudeGeometry(forma, {
    depth: alto,
    bevelEnabled: true,
    bevelThickness: bisel,
    bevelSize: bisel,
    bevelSegments: 2,
    curveSegments: 12,
  })

export function anillo({ ancho, fondo, radio, hueco, radioHueco, alto, bisel }) {
  const forma = rectanguloRedondeado(new THREE.Shape(), ancho, fondo, radio)
  forma.holes.push(rectanguloRedondeado(new THREE.Path(), hueco, hueco, radioHueco))
  const g = extruir(forma, alto, bisel)
  g.rotateX(-Math.PI / 2)
  return g
}

export function panelConVentana({ ancho, alto, radio, ventana, grosor, bisel }) {
  const forma = rectanguloRedondeado(new THREE.Shape(), ancho, alto, radio)
  const hueco = new THREE.Path()
  hueco.absarc(ventana.x, ventana.y, ventana.radio, 0, Math.PI * 2, true)
  forma.holes.push(hueco)
  return extruir(forma, grosor, bisel)
}

export function engrane({ radio, dientes, grosor = 0.05, altoDiente = 0.07, eje = 0.05 }) {
  const forma = new THREE.Shape()
  const paso = (Math.PI * 2) / dientes
  const [interior, exterior] = [radio - altoDiente / 2, radio + altoDiente / 2]
  for (let k = 0; k < dientes; k++) {
    const a = k * paso
    const puntos = [[a, interior], [a + paso * 0.12, exterior], [a + paso * 0.45, exterior], [a + paso * 0.57, interior]]
    puntos.forEach(([angulo, r], i) => {
      const [x, y] = [Math.cos(angulo) * r, Math.sin(angulo) * r]
      if (k === 0 && i === 0) forma.moveTo(x, y)
      else forma.lineTo(x, y)
    })
  }
  forma.closePath()
  const hueco = new THREE.Path()
  hueco.absarc(0, 0, eje, 0, Math.PI * 2, true)
  forma.holes.push(hueco)
  return new THREE.ExtrudeGeometry(forma, { depth: grosor, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 1 })
}
