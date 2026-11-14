import { BLANCO, DERECHA, MOVIMIENTOS, conjunto, transicionATexto } from './notacion.js'
import { analizarDefinicion, analizarEntrada, analizarTransiciones } from './parser.js'
import { clave } from './maquina.js'

export function verificar({ definicion, transiciones, entrada }) {
  const def = analizarDefinicion(definicion)
  const tr = analizarTransiciones(transiciones)
  const ent = analizarEntrada(entrada)

  const errores = [...def.errores, ...tr.errores, ...ent.errores]
  const advertencias = [...def.advertencias, ...tr.advertencias]
  const comprobaciones = []

  const comprobar = (regla, fallas, { nivel = 'error', seccion = 'definicion' } = {}) => {
    comprobaciones.push({ regla, estado: fallas.length ? nivel : 'ok', detalle: fallas.map((f) => f.mensaje) })
    const destino = nivel === 'error' ? errores : advertencias
    for (const f of fallas) destino.push({ seccion: f.seccion ?? seccion, linea: f.linea, mensaje: f.mensaje })
  }

  const { Q, Sigma, Gamma, q0, qaccept, qreject, lineas } = def
  const faltantes = [
    !Q && { mensaje: 'Falta definir Q = {…}' },
    !Sigma && { mensaje: 'Falta definir Σ = {…}' },
    !Gamma && { mensaje: 'Falta definir Γ = {…}' },
    Q?.length === 0 && { linea: lineas.Q, mensaje: 'Q no puede ser vacío' },
    Sigma?.length === 0 && { linea: lineas.Sigma, mensaje: 'Σ no puede ser vacío' },
    Gamma?.length === 0 && { linea: lineas.Gamma, mensaje: 'Γ no puede ser vacío' },
  ].filter(Boolean)
  comprobar('Q, Σ y Γ son conjuntos finitos no vacíos', faltantes)

  if (Sigma && Gamma) {
    comprobar('⊔ ∉ Σ', Sigma.includes(BLANCO)
      ? [{ linea: lineas.Sigma, mensaje: 'El símbolo blanco ⊔ no puede pertenecer al alfabeto de entrada Σ' }] : [])
    comprobar('⊔ ∈ Γ', Gamma.includes(BLANCO)
      ? [] : [{ linea: lineas.Gamma, mensaje: 'El alfabeto de la cinta Γ debe contener el símbolo blanco ⊔' }])
    const fuera = Sigma.filter((s) => !Gamma.includes(s))
    comprobar('Σ ⊆ Γ', fuera.length
      ? [{ linea: lineas.Gamma, mensaje: `Los símbolos ${conjunto(fuera)} de Σ no pertenecen a Γ` }] : [])
  }

  const distinguidos = [['q0', 'q₀', q0], ['qaccept', 'qaccept', qaccept], ['qreject', 'qreject', qreject]]
  for (const [campo, nombre, valor] of distinguidos) {
    const fallas = valor === null
      ? [{ mensaje: `No se definió ${nombre}. Escribe la 7-tupla M = (Q, Σ, Γ, δ, q₀, qaccept, qreject)` }]
      : Q && !Q.includes(valor) ? [{ linea: lineas[campo], mensaje: `${nombre} = ${valor} no pertenece a Q` }] : []
    comprobar(`${nombre} ∈ Q`, fallas)
  }
  if (qaccept !== null && qreject !== null) {
    comprobar('qreject ≠ qaccept', qaccept === qreject
      ? [{ linea: lineas.qreject, mensaje: 'El estado de rechazo debe ser distinto del estado de aceptación' }] : [])
  }

  const definicionCompleta = !errores.some((e) => e.seccion === 'definicion')
  const delta = new Map()
  const explicitas = []
  const implicitas = []

  if (definicionCompleta) {
    const formales = []
    for (const t of tr.transiciones) {
      const fallas = [
        !Q.includes(t.q) && `${t.q} ∉ Q`,
        !Gamma.includes(t.a) && `${t.a} ∉ Γ`,
        !Q.includes(t.qj) && `${t.qj} ∉ Q`,
        !Gamma.includes(t.c) && `${t.c} ∉ Γ`,
        !MOVIMIENTOS.includes(t.mov) && `${t.mov} ∉ {L, R}`,
      ].filter(Boolean)
      if (fallas.length) formales.push({ seccion: 'transiciones', linea: t.linea, mensaje: `${transicionATexto(t)}: ${fallas.join(', ')}` })
    }
    comprobar('δ: Q × Γ → Q × Γ × {L, R}', formales, { seccion: 'transiciones' })

    const vistas = new Map()
    const conflictos = []
    const repetidas = []
    const desdeParada = []
    for (const t of tr.transiciones) {
      const k = clave(t.q, t.a)
      const previa = vistas.get(k)
      if (previa) {
        const igual = previa.qj === t.qj && previa.c === t.c && previa.mov === t.mov
        const lista = igual ? repetidas : conflictos
        lista.push({
          seccion: 'transiciones',
          linea: t.linea,
          mensaje: igual
            ? `δ(${t.q}, ${t.a}) se repite (líneas ${previa.linea} y ${t.linea})`
            : `δ(${t.q}, ${t.a}) tiene dos imágenes distintas (líneas ${previa.linea} y ${t.linea}): la máquina no sería determinista`,
        })
        continue
      }
      vistas.set(k, t)
      if (t.q === qaccept || t.q === qreject) {
        desdeParada.push({ seccion: 'transiciones', linea: t.linea, mensaje: `${transicionATexto(t)} se ignora: las configuraciones de parada no producen más configuraciones` })
        continue
      }
      explicitas.push(t)
    }
    comprobar('δ es una función: a lo sumo una imagen por cada par (q, a)', conflictos, { seccion: 'transiciones' })
    if (repetidas.length) comprobar('Sin transiciones duplicadas', repetidas, { nivel: 'advertencia', seccion: 'transiciones' })
    if (desdeParada.length) comprobar('qaccept y qreject no tienen transiciones de salida', desdeParada, { nivel: 'advertencia', seccion: 'transiciones' })

    for (const t of explicitas) delta.set(clave(t.q, t.a), t)
    for (const q of Q) {
      if (q === qaccept || q === qreject) continue
      for (const a of Gamma) {
        if (delta.has(clave(q, a))) continue
        const t = { q, a, qj: qreject, c: a, mov: DERECHA, implicita: true }
        delta.set(clave(q, a), t)
        implicitas.push(t)
      }
    }
    comprobar(
      'δ está definida en todo (Q − {qaccept, qreject}) × Γ',
      implicitas.length
        ? [{
            seccion: 'transiciones',
            mensaje: `δ no está definida en ${implicitas.length} par(es): ${implicitas.map((t) => `(${t.q}, ${t.a})`).join(', ')}. Se asume δ(q, a) = (qreject, a, R)`,
          }]
        : [],
      { nivel: 'advertencia', seccion: 'transiciones' },
    )
  }

  if (Sigma) {
    const ajenos = [...ent.w].filter((s) => !Sigma.includes(s))
    comprobar('w ∈ Σ*', ajenos.length
      ? [{ seccion: 'entrada', linea: ent.linea, mensaje: `Los símbolos ${conjunto([...new Set(ajenos)])} de w no pertenecen a Σ${ajenos.includes(BLANCO) ? ' (⊔ nunca forma parte de la entrada)' : ''}` }]
      : [], { seccion: 'entrada' })
  }

  const valida = errores.length === 0
  const maquina = valida
    ? { nombre: def.nombre, Q, Sigma, Gamma, q0, qaccept, qreject, delta, transiciones: explicitas, implicitas }
    : null

  return { valida, maquina, w: ent.w, errores, advertencias, comprobaciones }
}
