import { useCallback, useReducer } from 'react'

const LIMITE = 100
const PAUSA_PARA_AGRUPAR = 900

function reductor(estado, accion) {
  if (accion.tipo === 'cambiar') {
    const valor = typeof accion.valor === 'function' ? accion.valor(estado.valor) : accion.valor
    if (valor === estado.valor) return estado
    const agrupar = accion.grupo !== null && accion.grupo === estado.grupo && accion.t - estado.t < PAUSA_PARA_AGRUPAR
    return {
      valor,
      pasado: agrupar ? estado.pasado : [...estado.pasado.slice(1 - LIMITE), estado.valor],
      futuro: [],
      grupo: accion.grupo,
      t: accion.t,
    }
  }
  if (accion.tipo === 'deshacer' && estado.pasado.length) {
    return {
      valor: estado.pasado.at(-1),
      pasado: estado.pasado.slice(0, -1),
      futuro: [estado.valor, ...estado.futuro],
      grupo: null,
      t: 0,
    }
  }
  if (accion.tipo === 'rehacer' && estado.futuro.length) {
    const [siguiente, ...resto] = estado.futuro
    return { valor: siguiente, pasado: [...estado.pasado, estado.valor], futuro: resto, grupo: null, t: 0 }
  }
  return estado
}

// Los cambios seguidos de un mismo grupo (por ejemplo, escribir en un editor) se deshacen juntos.
export function useHistorial(inicial) {
  const [estado, despachar] = useReducer(reductor, undefined, () => ({
    valor: typeof inicial === 'function' ? inicial() : inicial,
    pasado: [],
    futuro: [],
    grupo: null,
    t: 0,
  }))
  const cambiar = useCallback((valor, grupo = null) => despachar({ tipo: 'cambiar', valor, grupo, t: Date.now() }), [])
  const deshacer = useCallback(() => despachar({ tipo: 'deshacer' }), [])
  const rehacer = useCallback(() => despachar({ tipo: 'rehacer' }), [])
  return {
    valor: estado.valor,
    cambiar,
    deshacer,
    rehacer,
    puedeDeshacer: estado.pasado.length > 0,
    puedeRehacer: estado.futuro.length > 0,
  }
}
