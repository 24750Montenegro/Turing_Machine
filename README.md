# Máquina de Turing

Simulador de máquinas de Turing deterministas con la notación del curso de Lógica Matemática: 7-tupla, función de transición δ(qᵢ, b) = (qⱼ, c, L | R), configuraciones uqv y el símbolo blanco ⊔. Incluye una máquina 3D con cel shading, un depurador paso a paso y el diagrama de estados.

## Requisitos del proyecto

| Requisito | Dónde se cumple |
|---|---|
| Simular una máquina de Turing determinista con la notación de clase | `src/services/maquina.js` |
| Sin buffer ni memoria externa a la cinta | La configuración (u, q, v) es todo el estado; ver [abajo](#sin-memoria-externa-a-la-cinta) |
| Cargar un .txt con los componentes y la cadena de entrada | Botón *Cargar especificación* y `npm run simular` |
| Verificar que la especificación es correcta | `src/services/validador.js` (panel *Verificación de M*) |
| Generar un .txt con las configuraciones | Botón *Exportar .txt* y `src/services/exportador.js` |
| Inciso b: diagrama con aceptación, rechazo y ciclo infinito | [`docs/inciso-b.md`](docs/inciso-b.md) |
| Archivos de entrada que aceptan, rechazan y ciclan | `ejemplos/inciso-b-*.txt` |
| Archivos para Canvas (incisos a–i) | `npm run entrega` → carpeta `entrega/` ([ver abajo](#entrega-en-canvas)) |

## Uso

```bash
npm install
npm run dev          # aplicación web en http://localhost:5173
npm test             # pruebas del cálculo formal
npm run simular -- ejemplos/inciso-b-acepta.txt resultados/salida.txt
npm run diagrama -- ejemplos/inciso-b-acepta.txt diagrama.svg
npm run e2e          # pruebas de la página con Playwright
npm run entrega      # genera la carpeta entrega/ para Canvas
```

En la aplicación, los componentes (la "gramática"), las transiciones y la entrada se editan en tres secciones distintas. Cada una se puede escribir ahí mismo o importar desde un .txt; si el archivo trae la especificación completa, antes de cargarlo se muestra una vista previa con la sección a la que irá cada línea. En los editores, **Ctrl + Z** deshace y **Ctrl + Y** rehace, incluidos los cambios hechos desde el diagrama o al cargar archivos.

- **Modo depuración:** avanza configuración por configuración (← →, espacio). Muestra Cᵢ, el desglose u / q / v, la cinta, la transición que se aplicará y la regla de "produce" que corresponde.
- **Modo rápido:** ejecuta todo de corrido y muestra el resultado.
- Vistas de la cámara: 3D, planta (el recuadro con el triángulo que apunta al carácter leído) y frontal. La máquina está en un salón de estudio; la pizarra muestra la 7-tupla, la configuración actual y la transición aplicada.
- **Diagrama de estados:** durante la simulación una ficha recorre la transición aplicada, se resalta la línea de la etiqueta usada y abajo se ven la configuración y la cinta.
- **Edición visual:** con *Editar* se agregan, renombran o eliminan estados, se asignan los papeles de q₀, qaccept y qreject y se agregan, editan o eliminan transiciones δ(qᵢ, b) = (qⱼ, c, L | R). Cada cambio se escribe en la configuración, conservando los comentarios, y se puede deshacer.

## Formato del archivo

```text
// Los comentarios empiezan con //
[componentes]
M = (Q, Σ, Γ, δ, q1, qaccept, qreject)
Q = {q1, q2, qaccept, qreject}
Σ = {0, 1}
Γ = {0, 1, x, ⊔}

[transiciones]
// q1 marca el primer 0
δ(q1, 0) = (q2, x, R)
δ(q2, ⊔) = (qaccept, ⊔, R)

[entrada]
w = 0011
```

- Los encabezados `[componentes]`, `[transiciones]` y `[entrada]` son opcionales: todo lo que está debajo de uno, incluidos los comentarios, va a esa sección. Sin encabezados, cada línea va a la sección de lo que define y los comentarios y líneas en blanco se van con la siguiente línea con contenido. *Guardar especificación* siempre escribe los encabezados.
- La 7-tupla fija el estado inicial, el de aceptación y el de rechazo, en ese orden.
- Cada símbolo de Σ y Γ es un solo carácter. `_` se acepta como ⊔, `Sigma`, `Gamma` y `delta` como Σ, Γ y δ.
- `w = ε` (o `w =`) es la cadena vacía.
- Si δ(q, a) no está definida para algún q ∉ {qaccept, qreject}, se avisa y se asume δ(q, a) = (qreject, a, R), como en los diagramas de clase.

### Varias cintas

Por defecto la máquina tiene una cinta y todo funciona como arriba. Si hace falta, se agrega `cintas = k` en los componentes y se usa la definición de máquina de k cintas de Sipser:

```text
[componentes]
M = (Q, Σ, Γ, δ, q1, qaccept, qreject)
Q = {q1, q2, q3, qaccept, qreject}
Σ = {0, 1}
Γ = {0, 1, x, $, ⊔}
cintas = 2

[transiciones]
δ(q1, 0, ⊔) = (q2, 0, $, S, R)
```

- δ: Q × Γᵏ → Q × Γᵏ × {L, R, S}ᵏ, escrita δ(qᵢ, a₁, …, aₖ) = (qⱼ, b₁, …, bₖ, D₁, …, Dₖ). S deja la cabeza en su lugar; con una sola cinta solo se permiten L y R, como en clase.
- w va en la cinta 1 y las demás empiezan en blanco. Cada configuración es (u₁qv₁, …, uₖqvₖ): el mismo estado q y una cabeza por cinta, cada una con las reglas de "produce".
- Las combinaciones (q, a₁, …, aₖ) sin definir van a qreject sin cambiar nada.
- El depurador muestra todas las cintas; la máquina 3D muestra una a la vez (selector *Cinta*). Ejemplo: `ejemplos/dos-cintas-0n1n.txt`.

## Verificación

Antes de simular se comprueba:

- Q, Σ y Γ son conjuntos finitos no vacíos, ⊔ ∉ Σ, ⊔ ∈ Γ y Σ ⊆ Γ.
- q₀, qaccept, qreject ∈ Q y qreject ≠ qaccept.
- δ: Q × Γ → Q × Γ × {L, R}: cada transición usa estados de Q, símbolos de Γ y movimientos L o R. Con `cintas = k`, cada transición lee, escribe y mueve en las k cintas, con movimientos L, R o S.
- δ es una función (determinismo): no hay dos imágenes para el mismo par (q, a).
- w ∈ Σ*.

## Entrega en Canvas

`npm run entrega` abre la aplicación en Microsoft Edge con Playwright y arma la carpeta `entrega/`:

| Inciso | Archivo |
|---|---|
| a) Programa | `a-programa/maquina-de-turing.zip` (código del último commit) y `LEEME.txt` |
| b) Diseño y diagrama | `b-diagrama/inciso-b-maquina.pdf`, `inciso-b-diagrama.png` y `.svg` |
| c) Entrada que acepta / d) su salida | `c-entrada-aceptacion.txt` / `d-salida-aceptacion.txt` |
| e) Entrada que rechaza / f) su salida | `e-entrada-rechazo.txt` / `f-salida-rechazo.txt` |
| g) Entrada con ciclo / h) su salida | `g-entrada-ciclo.txt` / `h-salida-ciclo.txt` |
| i) Ejecución y revisión | `i-ejecucion/LEEME.txt` y capturas |

Cada entrada se carga con *Cargar especificación*, se simula hasta el final y se exporta con *Exportar .txt*; el script compara la salida exportada con la de los servicios y se detiene si no coinciden. En Windows usa el Edge instalado; en otro sistema se puede usar `PW_CANAL=chrome` o instalar Chromium con `npx playwright install chromium`.

## Arquitectura

```text
src/
  services/          cálculo formal, sin React ni three.js
    notacion.js      ⊔, L, R, subíndices
    parser.js        lectura del .txt
    validador.js     verificación de la 7-tupla y construcción de M
    maquina.js       configuración inicial y relación "produce"
    simulador.js     secuencia C₁, C₂, …, Cₖ (Definición 7)
    ciclos.js        detección de ciclos sobre la secuencia ya producida
    exportador.js    salida .txt con las configuraciones
    diagrama.js      etiquetas de las aristas en notación de clase
    edicion.js       cambios hechos desde el diagrama, aplicados al texto de la configuración
  diagrama/          distribución y dibujo SVG del diagrama de estados
  escena/            máquina 3D (three.js, cel shading)
  components/        interfaz en React
ejemplos/            especificaciones de entrada
resultados/          salidas generadas con npm run simular
docs/                diseño y diagramas del inciso b
tests/               pruebas de los servicios (node --test)
e2e/                 pruebas de la página con Playwright
scripts/             simular, diagrama y entrega desde la terminal
```

`produce` en `maquina.js` implementa las reglas de clase tal cual:

| Caso | Regla |
|---|---|
| Izquierda | uaqᵢbv produce uqⱼacv si δ(qᵢ, b) = (qⱼ, c, L) |
| Extremo izquierdo | qᵢbv produce qⱼcv si δ(qᵢ, b) = (qⱼ, c, L) |
| Derecha | uaqᵢbv produce uacqⱼv si δ(qᵢ, b) = (qⱼ, c, R) |
| Final de la cinta | uaqᵢ equivale a uaqᵢ⊔ |

La traza de M₂ sobre 0000 coincide configuración por configuración con la de clase (ver `tests/simulador.test.js`).

### Sin memoria externa a la cinta

La máquina no usa ninguna estructura auxiliar: cada paso toma la configuración actual (u, q, v), donde la cinta es uv y la cabeza está sobre el primer símbolo de v, y produce la siguiente aplicando δ. La lista de configuraciones es la salida que pide el proyecto, no algo que la máquina consulte.

### Ciclos infinitos y el problema de la parada

Como no se puede decidir en general si una máquina se detiene, la simulación tiene un límite de pasos (1000 por defecto). Además, `ciclos.js` analiza la secuencia ya producida y demuestra que M no se detendrá cuando:

1. una configuración se repite (Cⱼ = Cᵢ): al ser M determinista, Cᵢ, …, Cⱼ₋₁ se repite para siempre;
2. M vuelve al mismo estado con solo ⊔ a la derecha de la cabeza y sin haber retrocedido: el mismo cálculo se repite desplazado sobre la cinta en blanco.

Si ninguna se cumple antes del límite, el resultado es "sin resultado".

## Despliegue en GitHub Pages

El flujo `.github/workflows/deploy.yml` instala dependencias con `npm ci`, corre las pruebas y compila con Vite:

- en cada push a `main` (o al ejecutarlo a mano desde *Actions*) publica `dist/` directamente en GitHub Pages;
- en los pull requests solo verifica que las pruebas y la compilación pasen.

La primera vez hay que elegir *Settings → Pages → Source: GitHub Actions* en el repositorio; GitHub no permite activarlo desde el flujo con el token por defecto. Vite usa `base: './'`, así que funciona con cualquier nombre de repositorio.

## Bibliografía

Sipser, M. (1997). *Introduction to the Theory of Computation*. PWS Publishing Company.
