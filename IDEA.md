# caliper — Idea

> Documento vivo. Aquí capturamos la idea, el problema, la inspiración y el alcance.

## Inspiración: el modo de inspección de Figma

En Figma, al seleccionar un elemento (o hacer hover con `Alt/Option`), se obtiene de forma inmediata:

- **Dimensiones del elemento**: `width` × `height` en px.
- **Posición**: coordenadas `X`, `Y` respecto al frame o parent.
- **Distancias entre elementos** (las "red lines"): spacing en px hacia los elementos vecinos al hacer hover con `Alt`.
- **Tipografía**: `font-family`, `font-size`, `font-weight`, `line-height`, `letter-spacing`.
- **Color / relleno**: hex / rgb, opacidad.
- **Bordes y radios**: `stroke-width`, `border-radius`.
- **Efectos**: sombras, blur, etc.

Esto permite a un diseñador o desarrollador medir y verificar rápidamente cualquier propiedad visual sin abrir DevTools ni inspeccionar código.

---

## Idea

Construir una herramienta que reproduzca la experiencia de inspección de Figma, pero sobre **UIs reales ya renderizadas** (la web/app que estamos construyendo). El usuario hace hover o clic sobre un elemento y obtiene de forma inmediata:

- Tamaño (`width` × `height`)
- Padding y margin (visualizados como overlays de color, igual que el box-model de Figma/DevTools)
- Distancias hacia elementos vecinos al hacer hover con una tecla modificadora (estilo `Alt` en Figma)
- Tipografía completa (`font-family`, `font-size`, `font-weight`, `line-height`, `letter-spacing`)
- Color de fondo, color de texto, opacidad
- Border, border-radius, sombras
- (Opcional) Comparación contra un diseño de Figma para detectar desviaciones de _pixel perfect_

Todo esto **sin abrir DevTools, sin buscar el nodo en el árbol del DOM, sin leer reglas CSS**.

## Problema que resuelve

Cuando se busca un resultado **pixel perfect** entre el diseño en Figma y la UI implementada, el flujo actual es tedioso:

1. Abrir DevTools (`Cmd+Opt+I`).
2. Activar el inspector de elementos.
3. Hacer clic en el elemento.
4. Buscar entre las reglas CSS aplicadas (a veces sobreescritas, a veces heredadas, a veces de un framework).
5. Calcular mentalmente paddings, gaps y distancias.
6. Volver a Figma para comparar valores uno por uno.

Esto rompe el _flow_ del diseñador/desarrollador y vuelve la verificación visual costosa. La idea es colapsar todo eso en un **hover + clic**.

## Usuarios objetivo

- Desarrolladores frontend haciendo QA visual de su propia implementación contra un diseño.
- Diseñadores UX/UI que quieren auditar la implementación final sin saber CSS.
- QAs visuales / testers que necesitan reportar discrepancias de spacing/tipografía.

## Form factor — decisión: extensión de navegador (MV3)

**Decidido: empezamos con una extensión de Chrome (Manifest V3).** El `.dmg` queda como camino futuro, no descartado.

### Por qué extensión y no `.dmg`

1. **Datos reales, no estimados.** En el navegador `getComputedStyle()` + `getBoundingClientRect()` devuelven todas las propiedades exactas (padding, font, distancias, color). En una app nativa habría que ir por Accessibility APIs de macOS (no devuelven CSS) o por captura + análisis de imagen (frágil y nunca pixel-perfect de verdad).
2. **Tiempo a MVP.** Una extensión con overlay + hover + medición es cuestión de días. Una app nativa con la misma utilidad es semanas.
3. **El caso de uso principal es web.** Pixel-perfect contra Figma casi siempre es web o web app. Apps nativas son un nicho posterior.
4. **No es callejón sin salida.** Si después se quiere `.dmg`, lo natural es una app de escritorio (Electron / Tauri) que embeba un navegador y reutilice el mismo content script vía CDP. El trabajo de la extensión se aprovecha entero.

### Trade-offs aceptados
- No funciona sobre apps nativas ni Electron empaquetado de terceros (aceptable para v0.1).
- Limitaciones de MV3 en service workers (sin estado persistente, hay que usar `chrome.storage`).

## Alcance / MVP — v0.1 (implementado)

Funcionalidad mínima para considerar la herramienta utilizable:

- [x] **Toggle** con atajo `Cmd+Shift+U` (Mac) / `Ctrl+Shift+U` (Win/Linux) e icono en la toolbar.
- [x] **Hover sobre un elemento** → outline azul + pill `width × height` (estilo Figma).
- [x] **Click sobre un elemento** → selección bloqueada + box-model (padding verde, margin naranja, convención DevTools).
- [x] **Hover con `Alt` sobre un segundo elemento** → líneas rojas con la distancia en px hacia el seleccionado en ambos ejes — **feature estrella, igual que Figma**.
- [x] **Panel lateral fijo** con propiedades agrupadas: Layout, Spacing, Typography, Fill, Border, Effects.
- [x] **Copiar valor** con un clic en cualquier fila del panel + toast de confirmación.
- [x] **Esc** → primero deselecciona, segundo Esc cierra el modo inspección.
- [x] **Indicador en la toolbar** (badge `●` azul) cuando la herramienta está activa en la pestaña.

### Fuera de alcance para v0.1
- Comparación contra archivos de Figma (post-MVP).
- Soporte multi-pestaña / persistencia de selección entre recargas.
- Modo "regla libre" para medir entre dos puntos arbitrarios.
- Firefox / Safari (Chrome MV3 primero, después se porta).

## Stack técnico — v0.1 implementado

- **Manifest V3** (Chrome).
- **Vanilla JavaScript** sin build step. Razón: el usuario carga la carpeta directamente en `chrome://extensions` y funciona; sin `npm install` ni proceso de compilación.
- **Closed Shadow DOM** anclado a `<html>` para todo el overlay y el panel — aislamiento total respecto al CSS de la página.
- **Tipografía UI**: `Inter` (con fallback al system stack), monoespaciada `SF Mono` / `JetBrains Mono` para valores numéricos.
- **Paleta**:
  - Acento (selección, dimensiones): `#0D99FF` (Figma blue).
  - Medición (distancias): `#FF4D4D`.
  - Padding overlay: verde tenue (convención DevTools).
  - Margin overlay: naranja tenue (convención DevTools).
  - Surface del panel: `rgba(28,28,30,0.92)` con `backdrop-filter: blur(20px) saturate(180%)`.
- **Iconos**: generados por un script Python que solo usa stdlib (`struct` + `zlib`), reproducible con `python3 icons/generate.py`.

### Próximos pasos sugeridos (post-v0.1)
- Soporte para Firefox (manifest V3 ya compatible mayormente).
- Comparación contra archivos Figma (vía Figma API).
- Modo "regla libre" para medir entre dos puntos arbitrarios.
- Modo persistente: que la selección sobreviva navegaciones/recargas.
- Empaquetado como app de escritorio (`.dmg` Tauri/Electron) que embeba la extensión vía CDP.

## v0.2 — soporte para iframes (implementado)

- [x] `manifest.content_scripts.all_frames: true` → el inspector vive en cada frame (top + cada iframe, incluyendo cross-origin con `<all_urls>`).
- [x] Cada frame inspecciona de forma **independiente** (modelo "Option A"): hover, selección y distance funcionan localmente; cada frame tiene su propio shadow DOM, su propio panel y su propio estado.
- [x] **Esc global**: cuando un frame se desactiva por Esc, manda `caliper/global-deactivate` al service worker, que broadcastea `caliper/deactivate` a todos los frames del tab. Los receptores son idempotentes y no re-emiten para evitar bucles.
- [x] El popup consulta estado al **top frame específicamente** (`frameId: 0`) — sin esto, una respuesta de un iframe desincronizado podía mostrar estado incorrecto.
- [x] El handler de `caliper/toggle` recibido vía broadcast pasa `{broadcast: false}` al `deactivate()` para no disparar una segunda ola innecesaria.

### Trade-offs aceptados en v0.2
- Distance entre frames distintos no se dibuja (cada frame solo conoce su propio sistema de coordenadas; cruzar el límite de un iframe sin postMessage entre orígenes diferentes era costo desproporcionado).
- Múltiples paneles visibles si el usuario selecciona en frames distintos — preferimos esto a meter latencia de postMessage en el camino del hover.
- Drift en iframes lazy-loaded: los frames insertados después de activar arrancan con el inspector apagado. Workaround: toggle off/on para resincronizar. Solución completa requiere que el SW guarde estado por tab (post-v0.2).
- Iframes pequeños recortan el panel (280px no cabe en un widget de 200×100). El caso real (inspeccionar contenido relevante) suele estar en frames grandes; aceptable.

## v0.3 — distance siempre visible + cross-browser

### UX: distance al hover sin Alt
- [x] Quitada la guarda por `Alt`. Si hay un elemento seleccionado y el cursor pasa sobre **cualquier** otro elemento, las líneas rojas y los pills de medición aparecen automáticamente.
- [x] El elemento sobre el que está el cursor también muestra su outline azul + dimension pill, así los dos extremos de la medida se leen de un vistazo.
- [x] Refactor pequeño en `overlay.js`: las funciones `renderHover` / `renderSelection` / `renderDistance` ya no llaman `replaceChildren()` por dentro — son aditivas. `render()` en `main.js` es el único que limpia (vía `O.clear()`). Sin ese cambio, dibujar selección + hover en el mismo frame se auto-borraba.
- [x] Eliminado código muerto: `S.altPressed`, los listeners `keyup` y `window.blur`. Menos superficie.

#### Trade-off
- Las líneas "viven": cualquier movimiento del cursor cambia el hover y redibuja. Throttled a un `requestAnimationFrame` así que perf se mantiene plana, pero visualmente es más activo que con Alt. Es exactamente lo que pidió el usuario.

### Cross-browser: Chrome + Firefox + Safari

Una sola carpeta de fuente carga en los tres navegadores.

- [x] **Código compatible sin polyfill.** El namespace `chrome.*` funciona como alias en Firefox 121+ y Safari 16.4+. Las APIs basadas en Promises que usamos (`await chrome.tabs.query()` etc.) están disponibles en los tres en versiones modernas. Cero `try/catch` para detección de runtime.
- [x] **CSS ya cross-browser.** Tenemos tanto `backdrop-filter` como `-webkit-backdrop-filter`; tanto `::-webkit-scrollbar` como `scrollbar-width`. `gap` en flex está cubierto en todos los targets (Safari 14.1+).
- [x] **Manifest tweak**: agregado `browser_specific_settings.gecko.id` y `strict_min_version: 121.0` para Firefox. No requiere build step.

#### Cómo se carga en cada uno
- **Chrome / Edge / Brave**: `chrome://extensions/` → Load unpacked.
- **Firefox 121+**: `about:debugging` → Load Temporary Add-on.
- **Safari 16.4+**: `xcrun safari-web-extension-converter <folder>` → genera proyecto Xcode → build + Develop menu → Allow Unsigned Extensions.

#### Limitaciones aceptadas
- **Safari ignora shortcuts del manifest.** Apple no respeta `commands.suggested_key` de forma confiable; el usuario asigna shortcut a mano en System Settings o usa el icono de la toolbar.
- **Safari requiere Xcode.** Es la regla de Apple, no nuestra; no hay "load unpacked" ahí.
- **Firefox <121** queda fuera. Soportarlo requeriría `background.scripts` adicional, que en Chrome dispara warning. La complejidad no compensa: FF 121 salió en diciembre 2023.

### Lo que NO se hizo en v0.3 (a propósito)
- No agregué Webextension-polyfill. El uso de `chrome.*` con Promises es suficiente para los tres navegadores en versiones modernas.
- No agregué un build step para producir manifests por navegador. El manifest único cubre los tres.
- No probé Safari empíricamente (requiere Xcode). El manifest es estándar; si algo no encaja, se itera.

## Notas y referencias

- Figma — modo inspect / dev mode.
- Chrome DevTools — panel "Computed" y overlay de box-model.
- Herramientas similares conocidas: PerfectPixel, VisBug (Google), Pesticide (extensión CSS).
  - Diferenciador propuesto: ninguna de estas reproduce la **interacción tipo Figma** completa (hover + alt para distancias, panel rico con tipografía/colores agrupado).
