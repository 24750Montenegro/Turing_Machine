// En Windows se usa el Edge instalado; en otro sistema, PW_CANAL=chrome o `npx playwright install chromium`.
export const canal = process.env.PW_CANAL ?? (process.platform === 'win32' ? 'msedge' : undefined)

// WebGL por software para que la escena 3D funcione sin tarjeta de video (modo headless).
export const argumentos = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']
