export function descargarTexto(nombre, contenido, tipo = 'text/plain;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }))
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function elegirArchivoTexto(aceptar = '.txt,text/plain') {
  return new Promise((resolver) => {
    const entrada = document.createElement('input')
    entrada.type = 'file'
    entrada.accept = aceptar
    entrada.onchange = async () => {
      const archivo = entrada.files?.[0]
      resolver(archivo ? { nombre: archivo.name, texto: await archivo.text() } : null)
    }
    entrada.click()
  })
}
