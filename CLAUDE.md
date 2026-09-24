# Simulador de Stock — instrucciones para Claude Code

Frontend del motor `stock-simulation-engine` (API en Rust/axum).

## Stack obligatorio (no usar alternativas)

| Capa | Tecnología | Detalle |
| --- | --- | --- |
| Framework | **Angular** (standalone components, signals) | Sin NgModules propios |
| UI | **PrimeNG** en **modo Unstyled** | `providePrimeNG({ unstyled: true, pt })`; importar solo el módulo de cada componente usado |
| Estilos | **Tailwind CSS** | Utilidades en los templates; preset de pass-through propio para PrimeNG; `.scss` de componente vacíos |
| Gráficos | **uPlot** | Solo dentro de `app-uplot-chart`; `setData()` para actualizar, `destroy()` en `ngOnDestroy` |
| Datos | **Web Worker** + `Float64Array` | El worker parsea el JSON de `/ticks` y arma `AlignedData` |
| Formularios | **Reactive Forms** | Panel de parámetros |

No agregues otras librerías de UI, gráficos o CSS (nada de Angular Material, Chart.js, Bootstrap, etc.).

## Documentos de referencia (léelos antes de cambiar código)

- `RULES.md`: reglas de arquitectura **obligatorias** (Angular standalone, PrimeNG en modo Unstyled, uPlot, Web Workers con `Float64Array`, Tailwind, archivos de 150 a 300 líneas y nunca más de 400).
- `docs/design/HANDOFF.md`: especificación de pantallas, estados y flujos.
- `docs/design/design-reference.dc.html`: prototipo interactivo del diseño. Úsalo como referencia visual y de comportamiento (colores, tamaños, textos, estados). **No lo copies como código**: es un formato de prototipo, no Angular.
- `docs/api/openapi.json`: contrato de la API. Los tipos TypeScript se derivan de aquí.

## Convenciones

- Textos de la interfaz en español (es-CL). Nombres de código en inglés.
- Llamadas HTTP solo desde servicios en `src/app/core/api/`, nunca desde componentes.
- JWT en `Authorization: Bearer <token>` mediante un interceptor funcional.
- La trayectoria viene de `GET /simulations/{id}/ticks`. El frontend **no** simula precios: el Web Worker solo parsea el JSON y lo convierte en `Float64Array` (`AlignedData`: `[times, ticks]`).
- La URL base de la API va en `src/environments/`, nunca en el código.

## Comandos

- `npm start`: servidor de desarrollo
- `npm run build`: compilar (debe terminar sin errores ni warnings nuevos)
- `npm test`: pruebas

## Antes de terminar una tarea

1. `npm run build` sin errores.
2. Revisar que ningún `.ts` o `.scss` pase de 400 líneas: `find src -name "*.ts" -o -name "*.scss" | xargs wc -l | sort -n | tail`.
3. Resumir qué archivos cambiaron y qué quedó pendiente.
