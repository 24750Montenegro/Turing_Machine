# Máquina de Turing

Simulador de máquinas de Turing deterministas de una cinta. Lee la descripción formal de la máquina (un `.yaml` con el formato del proyecto o un `.txt` con la notación de clase), simula cada cadena de entrada y muestra las descripciones instantáneas (IDs) paso a paso, con el resultado aceptada / rechazada.

El sistema está desplegado en [turing.jfmonte.com](https://turing.jfmonte.com).

## Video de demostración

[Ver video](https://youtu.be/LIkvBwZ3q38)

## Cómo ejecutarlo

Requiere Node.js 20 o superior.

```bash
npm install
npm run dev                                   # página en http://localhost:5173
npm run simular -- ejemplos/reconocedora-luhn.yaml salida.txt   # terminal: IDs de todas las cadenas
npm test                                      # pruebas de los servicios
npm run e2e                                   # pruebas de la página (Playwright)
```

Otros comandos: `npm run diagrama -- <archivo> salida.svg` dibuja el diagrama de estados, `npm run resultados` regenera `resultados/` a partir de `ejemplos/` y `npm run luhn` vuelve a generar la máquina de Luhn.

En la página: **Cargar especificación** acepta `.yaml` o `.txt` y muestra una vista previa antes de cargar; **Simular** (Ctrl + Enter) ejecuta todas las cadenas; las flechas ← → recorren las IDs; **Exportar .txt** guarda las IDs y el resultado de cada cadena; **Guardar .yaml** escribe la máquina en el formato del proyecto.

## Cómo funciona

1. **Lectura.** Un `.yaml` (`q_states`, `alphabet`, `tape_alphabet`, `delta`, `simulation_strings`) se convierte a la notación del simulador: el blanco (`null` o vacío) es ⊔, Γ = `alphabet` ∪ `tape_alphabet` ∪ {⊔} y cada elemento de `delta` es una transición. La especificación queda en tres editores: componentes, transiciones y entrada (una cadena por línea).
2. **Verificación.** Antes de simular se comprueba la 7-tupla: conjuntos no vacíos, ⊔ ∈ Γ, Σ ⊆ Γ, estados distinguidos en Q, transiciones dentro de Q y Γ, determinismo y que cada cadena use símbolos válidos.
3. **Simulación.** Cada configuración es `u q v` (la cabeza está sobre el primer símbolo de `v`) y la relación "produce" aplica δ para obtener la siguiente. Se guarda la secuencia completa de IDs. Además se detectan ciclos infinitos (configuración repetida o avance sin fin sobre blancos), con un límite de pasos configurable.
4. **Salida.** El depurador muestra la ID actual, la cinta, la transición que se aplica y la regla usada; también hay una máquina 3D y el diagrama de estados animado (editable). El reporte `.txt` incluye la especificación, la verificación, un resumen por cadena y todas las IDs.

Hay dos formas de escribir la máquina, según la 7-tupla:

| 7-tupla | Uso | Parada | Cinta | Movimientos |
|---|---|---|---|---|
| `M = (Q, Σ, Γ, δ, q₀, ⊔, F)` | Formato YAML del proyecto | Acepta al entrar a un estado de F; si no hay transición, se detiene y rechaza | Infinita a ambos lados | L, R, S |
| `M = (Q, Σ, Γ, δ, q₀, qaccept, qreject)` | Notación de Lógica Matemática (Sipser) | qaccept o qreject; lo no definido va a qreject | Con extremo izquierdo | L, R |

**Memoria caché.** El interruptor *Caché [q, m]* (o la línea `caché = sí`) hace que el estado sea el par [q, m], donde m ∈ Γ es un símbolo guardado en el control finito (empieza en ⊔). Las transiciones se escriben δ([q, m], a) = ([p, n], b, D) y las IDs como `u[q, m]v`. Sin el interruptor la máquina funciona como antes. Al cargar un `.yaml` se activa sola si algún `mem_cache_value` no es blanco.

Formato `.txt`:

```text
[componentes]
M = (Q, Σ, Γ, δ, q0, ⊔, F)
Q = {q0, q1}
Σ = {a, b}
Γ = {a, b, ⊔}
F = {q1}
caché = sí

[transiciones]
δ([q0, ⊔], a) = ([q0, a], a, R)     // guarda la a en la caché
δ([q0, a], b) = ([q1, a], b, S)     // acepta si después de la a viene una b

[entrada]
w = ab
w = ba
```

## Ejemplos

| Archivo | Máquina |
|---|---|
| `ejemplos/reconocedora-luhn.yaml` | **Reconocedora**: números de tarjeta de 13 a 19 dígitos que cumplen el algoritmo de Luhn. Primero cuenta los dígitos (c0 … c19); luego recorre de derecha a izquierda alternando `sumar` y `doblar`, con la suma mod 10 en la caché, y acepta si termina en 0. 2 cadenas aceptadas y 2 rechazadas. |
| `ejemplos/alteradora-invertir.yaml` | **Alteradora**: invierte w ∈ {a, b}* (abaab → baaba) copiando con la caché cada símbolo, del último al primero, después de un separador. 4 cadenas. |
| `ejemplos/reconocedora-w-numeral-w.yaml` | Reconocedora de {w#w}, con caché. |
| `ejemplos/*.txt` | Máquinas de Lógica Matemática (inciso b, M₁, M₂). |

Las salidas de cada ejemplo están en `resultados/`.

## Arquitectura

```text
src/services/   lógica de la máquina, sin interfaz
  yaml.js         YAML ⇄ especificación
  parser.js       lectura de componentes, transiciones y cadenas
  validador.js    verificación y construcción de M (δ como Map de (q, m, a) a la transición)
  maquina.js      configuración inicial y relación "produce"
  simulador.js    secuencia de IDs y resultado de cada cadena
  ciclos.js       detección de ciclos infinitos
  exportador.js   reporte .txt
  edicion.js      cambios hechos desde el diagrama y el interruptor de caché
src/components/ interfaz en React · src/escena/ máquina 3D (three.js) · src/diagrama/ diagrama SVG
scripts/        simular, diagrama, resultados y generador de Luhn desde la terminal
tests/, e2e/    pruebas con node --test y Playwright
```