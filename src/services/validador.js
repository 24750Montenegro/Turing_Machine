import { BLANCO, DERECHA, MODELOS, conjunto, estadoATexto, firmaDelta, movimientosDe, transicionATexto } from './notacion.js'
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
  const informar = (regla, detalle = []) => comprobaciones.push({ regla, estado: 'ok', detalle })

  const { Q, Sigma, Gamma, F, q0, qaccept, qreject, lineas, modelo, cache } = def
  const hopcroft = modelo === MODELOS.hopcroft
  const movimientos = movimientosDe(modelo)

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

  const enQ = (campo, nombre, valor, ayuda) =>
    comprobar(`${nombre} ∈ Q`, valor === null
      ? [{ mensaje: `No se definió ${nombre}. ${ayuda}` }]
      : Q && !Q.includes(valor) ? [{ linea: lineas[campo], mensaje: `${nombre} = ${valor} no pertenece a Q` }] : [])

  if (hopcroft) {
    enQ('q0', 'q₀', q0, 'Escribe la 7-tupla M = (Q, Σ, Γ, δ, q₀, ⊔, F)')
    const fallasF = !F
      ? [{ mensaje: 'Falta definir el conjunto de estados finales F = {…}' }]
      : Q ? F.filter((q) => !Q.includes(q)).map((q) => ({ linea: lineas.F, mensaje: `${q} ∈ F no pertenece a Q` })) : []
    comprobar('F ⊆ Q', fallasF)
    const sobrantes = ['qaccept', 'qreject'].filter((c) => lineas[c]).map((c) => ({ linea: lineas[c], mensaje: `Con M = (Q, Σ, Γ, δ, q₀, ⊔, F) no se usa ${c}: los estados de aceptación van en F` }))
    if (sobrantes.length) comprobar('Los estados finales se definen con F', sobrantes)
  } else {
    for (const [campo, nombre, valor] of [['q0', 'q₀', q0], ['qaccept', 'qaccept', qaccept], ['qreject', 'qreject', qreject]]) {
      enQ(campo, nombre, valor, 'Escribe la 7-tupla M = (Q, Σ, Γ, δ, q₀, qaccept, qreject)')
    }
    if (qaccept !== null && qreject !== null) {
      comprobar('qreject ≠ qaccept', qaccept === qreject
        ? [{ linea: lineas.qreject, mensaje: 'El estado de rechazo debe ser distinto del estado de aceptación' }] : [])
    }
    if (lineas.F) comprobar('F solo se usa con M = (Q, Σ, Γ, δ, q₀, ⊔, F)', [{ linea: lineas.F, mensaje: 'Con M = (Q, Σ, Γ, δ, q₀, qaccept, qreject) no se usa F: cambia la 7-tupla o quita F' }])
  }

  const parada = new Set(hopcroft ? F ?? [] : [qaccept, qreject])
  const definicionCompleta = !errores.some((e) => e.seccion === 'definicion')
  const delta = new Map()
  const explicitas = []
  const implicitas = []

  if (definicionCompleta) {
    // Con caché, una transición sin [q, m] usa m = n = ⊔.
    const todas = tr.transiciones.map((t) => (cache && t.m === undefined ? { ...t, m: BLANCO, n: BLANCO } : t))
    const formales = []
    for (const t of todas) {
      const fallas = [
        !cache && t.m !== undefined && 'usa la memoria caché [q, m], pero está desactivada (escribe caché = sí en los componentes)',
        !Q.includes(t.q) && `${t.q} ∉ Q`,
        cache && !Gamma.includes(t.m) && `${t.m} ∉ Γ`,
        !Gamma.includes(t.a) && `${t.a} ∉ Γ`,
        !Q.includes(t.qj) && `${t.qj} ∉ Q`,
        cache && !Gamma.includes(t.n) && `${t.n} ∉ Γ`,
        !Gamma.includes(t.c) && `${t.c} ∉ Γ`,
        !movimientos.includes(t.mov) && `${t.mov} ∉ {${movimientos.join(', ')}}`,
      ].filter(Boolean)
      if (fallas.length) formales.push({ seccion: 'transiciones', linea: t.linea, mensaje: `${transicionATexto(t)}: ${fallas.join(', ')}` })
    }
    comprobar(firmaDelta({ modelo, cache }), formales, { seccion: 'transiciones' })

    const vistas = new Map()
    const conflictos = []
    const repetidas = []
    const desdeParada = []
    for (const t of todas) {
      const llave = clave(t.q, t.a, cache ? t.m : undefined)
      const dominio = `δ(${estadoATexto(t.q, cache ? t.m : undefined)}, ${t.a})`
      const previa = vistas.get(llave)
      if (previa) {
        const igual = previa.qj === t.qj && previa.n === t.n && previa.c === t.c && previa.mov === t.mov
        const lista = igual ? repetidas : conflictos
        lista.push({
          seccion: 'transiciones',
          linea: t.linea,
          mensaje: igual
            ? `${dominio} se repite (líneas ${previa.linea} y ${t.linea})`
            : `${dominio} tiene dos imágenes distintas (líneas ${previa.linea} y ${t.linea}): la máquina no sería determinista`,
        })
        continue
      }
      vistas.set(llave, t)
      if (parada.has(t.q)) {
        desdeParada.push({ seccion: 'transiciones', linea: t.linea, mensaje: `${transicionATexto(t)} se ignora: las configuraciones de parada no producen más configuraciones` })
        continue
      }
      explicitas.push(t)
    }
    const par = cache ? 'cada ([q, m], a)' : 'cada par (q, a)'
    comprobar(`δ es una función: a lo sumo una imagen por ${par}`, conflictos, { seccion: 'transiciones' })
    if (repetidas.length) comprobar('Sin transiciones duplicadas', repetidas, { nivel: 'advertencia', seccion: 'transiciones' })
    if (desdeParada.length) {
      comprobar(hopcroft ? 'Los estados de F no tienen transiciones de salida' : 'qaccept y qreject no tienen transiciones de salida', desdeParada, { nivel: 'advertencia', seccion: 'transiciones' })
    }

    for (const t of explicitas) delta.set(clave(t.q, t.a, cache ? t.m : undefined), t)
    if (hopcroft) {
      informar('Si δ no está definida, M se detiene', ['Al detenerse acepta si el estado está en F y rechaza si no.'])
    } else if (cache) {
      informar('δ está definida en todo (Q − {qaccept, qreject}) × Γ × Γ', ['Las lecturas ([q, m], a) que no se escriben van a qreject: δ([q, m], a) = ([qreject, m], a, R)'])
    } else {
      for (const q of Q) {
        if (parada.has(q)) continue
        for (const a of Gamma) {
          if (delta.has(clave(q, a))) continue
          const t = { q, a, qj: qreject, c: a, mov: DERECHA, implicita: true }
          delta.set(clave(q, a), t)
          implicitas.push(t)
        }
      }
      comprobar('δ está definida en todo (Q − {qaccept, qreject}) × Γ', implicitas.length
        ? [{ seccion: 'transiciones', mensaje: `δ no está definida en ${implicitas.length} par(es): ${implicitas.map((t) => `(${t.q}, ${t.a})`).join(', ')}. Se asume δ(q, a) = (qreject, a, R)` }]
        : [], { nivel: 'advertencia', seccion: 'transiciones' })
    }
  }

  if (Sigma) {
    const ajenas = (permitido) => ent.cadenas.flatMap(({ w, linea }) => {
      const fuera = [...new Set([...w].filter((s) => !permitido(s)))]
      return fuera.length ? [{ seccion: 'entrada', linea, mensaje: `Los símbolos ${conjunto(fuera)} de w = ${w} no pertenecen a Σ${fuera.includes(BLANCO) ? ' (⊔ nunca forma parte de la entrada)' : ''}` }] : []
    })
    if (hopcroft && Gamma) {
      // El ejemplo del proyecto usa # en w sin estar en Σ: solo se advierte.
      comprobar('Cada cadena usa símbolos de Γ − {⊔}', ajenas((s) => s !== BLANCO && Gamma.includes(s)), { seccion: 'entrada' })
      comprobar('w ∈ Σ*', ajenas((s) => Sigma.includes(s) || s === BLANCO || !Gamma.includes(s)), { nivel: 'advertencia', seccion: 'entrada' })
    } else {
      comprobar('w ∈ Σ*', ajenas((s) => Sigma.includes(s)), { seccion: 'entrada' })
    }
  }

  const valida = errores.length === 0
  const maquina = valida
    ? {
        nombre: def.nombre,
        modelo,
        cache,
        Q,
        Sigma,
        Gamma,
        q0,
        F: hopcroft ? F : [qaccept],
        qaccept: hopcroft ? null : qaccept,
        qreject: hopcroft ? null : qreject,
        delta,
        transiciones: explicitas,
        implicitas,
      }
    : null

  return { valida, maquina, w: ent.w, cadenas: ent.cadenas, errores, advertencias, comprobaciones }
}
