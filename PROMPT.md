# Prompts para pegar en Claude Code (en orden)

Stack: **Angular (standalone) + PrimeNG Unstyled + Tailwind + uPlot + Web Worker**. Todos los prompts lo repiten a propósito.

Pega un prompt a la vez y revisa el resultado antes de pasar al siguiente. Así cada cambio queda acotado y fácil de revisar.

---

## Prompt 0: plan (modo Plan)

```
Lee CLAUDE.md, RULES.md, docs/design/HANDOFF.md y docs/api/openapi.json.
Revisa también docs/design/design-reference.dc.html como referencia visual.
El stack es Angular standalone + PrimeNG (modo Unstyled, pass-through con Tailwind) + Tailwind + uPlot + Web Worker con Float64Array; no uses otras librerías.
Compara con el código actual en src/ y dame un plan por etapas de lo que hay que
cambiar para que la app quede como el diseño y use la API. No escribas código todavía.
```

## Prompt 1: capa de API

```
Implementa la etapa de API según HANDOFF.md (Angular: HttpClient, servicios @Injectable, signals):
- Tipos TypeScript en src/app/core/api/models/ derivados de openapi.json.
- Servicios AuthApi, ProfileApi, StocksApi y SimulationsApi (incluido GET /simulations/{id}/ticks).
- Interceptor funcional con el JWT y environment con la URL base.
- Guard de autenticación.
Respeta RULES.md. Al terminar, corre npm run build.
```

## Prompt 2: worker y visor de trayectoria

```
Cambia el Web Worker para que parsee el JSON de TicksResponse y devuelva Float64Array
[times, ticks] (transferibles). Quita la simulación local de precios.
Actualiza app-uplot-chart (uPlot; setData, nunca recrear el gráfico) y el visor según la sección 5 de HANDOFF.md: eje en años,
línea en S₀, marcador, tooltip, leyenda y estados idle/loading/error/ready con los mensajes 413/404/400. Controles de reproducción con p-button, p-slider y p-selectbutton; spinner con p-progressspinner.
Corre npm run build.
```

## Prompt 3: pantallas

```
Implementa las pantallas de HANDOFF.md sección 3 con Angular + PrimeNG (usa la tabla 1b para elegir cada componente, y agrega su pass-through con Tailwind) usando los servicios nuevos:
login/registro, sidebar con usuario y logout, grilla de acciones desde /profile con
diálogo "Agregar acción", detalle con editar/eliminar y paginación, y Nueva simulación
con los 4 modelos y sus extra_params, y el flujo "Simular y guardar".
Usa design-reference.dc.html para medidas y textos. Corre npm run build y revisa el límite de líneas.
```

## Prompt 4: verificación

```
Revisa que todo cumpla RULES.md y HANDOFF.md. Lista cualquier diferencia con el diseño
y las preguntas abiertas de la sección 7 que afecten el código.
```
