# Handoff de diseño — Simulador de Stock

Referencia visual: `design-reference.dc.html` (ábrelo para ver colores, tamaños y textos exactos).
Contrato: `../api/openapi.json`.

## 1. Tokens de diseño (Tailwind `theme.extend`)

| Token | Valor | Uso |
| --- | --- | --- |
| `ink` | `#16181D` | Texto principal, botones primarios, nav activo |
| `canvas` | `#F4F3EF` | Fondo de la app, tiles de datos |
| `line` | `#DEDCD5` | Bordes |
| `muted` | `#5A5D66` | Texto secundario |
| `subtle` | `#ECEBE6` | Grilla del gráfico, hover |
| `brand` | `#2F4FD8` (dark `#1F3AA8`, soft `#EEF1FC`) | Acento, línea del gráfico, selección |
| `danger` | `#B42318` | Errores, eliminar |
| `success` | `#14532D` sobre `#EEF7F1` | Aviso "Simulación guardada" |

Tipografía: **IBM Plex Sans** (UI) e **IBM Plex Mono** (números, tickers, fórmulas). Radios: 10 px en controles, 14 px en tarjetas, 16 px en diálogos. Altura de controles: 44 a 48 px.

## 1b. Qué componente usar en cada parte (Angular + PrimeNG + Tailwind + uPlot)

| Elemento del diseño | Implementación |
| --- | --- |
| Botones (primario negro, secundario con borde, peligro rojo, solo ícono) | `p-button` (`ButtonModule`) con variantes en el pass-through: `severity="secondary"` y `severity="danger"` |
| Inputs de texto (buscador, ticker, nombre, email) | `pInputText` (`InputTextModule`) |
| Contraseña | `p-password` (`PasswordModule`) con `[feedback]="false"` |
| Campos numéricos (S₀, μ, σ, T, pasos, semilla, extra_params) | `p-inputnumber` (`InputNumberModule`) con `locale="es-CL"` |
| Selector de modelo y selector de acción | `p-select` (`SelectModule`) con `appendTo="body"` |
| Panel parámetros \| gráfico | `p-splitter` (`SplitterModule`) |
| Barra de posición | `p-slider` (`SliderModule`) |
| Velocidades 0,5× / 1× / 2× / 4× | `p-selectbutton` (`SelectButtonModule`) |
| Diálogos (agregar, editar, eliminar) | `p-dialog` (`DialogModule`) modal; para eliminar, `p-confirmdialog` (`ConfirmDialogModule`) + `ConfirmationService` |
| Aviso "Simulación guardada" | `p-message` (`MessageModule`) severity success, o `p-toast` |
| Spinner de carga | `p-progressspinner` (`ProgressSpinnerModule`) |
| Íconos | PrimeIcons (`pi pi-…`) |
| Layout, tarjetas, grilla de acciones, tiles, sidebar | Tailwind puro (`flex`, `grid`, `grid-cols-2`, etc.), sin componentes PrimeNG |
| Gráfico de trayectoria | uPlot dentro de `app-uplot-chart`: serie de precio, línea de S₀ como segunda serie constante o hook `draw`, marcador del tick actual en un hook `draw`, tooltip en un hook `setCursor` |
| Estilos de uPlot (ejes, leyenda, tooltip) | `.uplot` en `styles.scss` con `@apply` |

Cada componente PrimeNG nuevo necesita su entrada en el pass-through (`core/primeng/passthrough.ts`) con clases Tailwind que reproduzcan el diseño.

## 2. Rutas

| Ruta | Pantalla | Guard |
| --- | --- | --- |
| `/login` | Iniciar sesión | pública |
| `/register` | Crear cuenta | pública |
| `/stock` | Mis simulaciones (grilla de acciones) | auth |
| `/stock/:id?sim=:simId` | Detalle de acción + historial | auth |
| `/simulation?stock=:id` | Nueva simulación | auth |

## 3. Pantallas

### Login / Registro
- Tarjeta centrada de 420 px: nombre de la app, título, subtítulo, formulario y enlace para cambiar entre login y registro.
- Login: `POST /user/login` con `{email, password}`. Guardar `token`.
  - **Ojo:** el spec dice que responde un *array* de `LoginResponse`. Confirmar con el backend. Si es array, usar `[0].token`.
- Registro: `POST /user/register` con `{username, email, password}`. Después, ir a login.

### Layout (autenticado)
- Sidebar de 280 px (88 px colapsado con el botón ☰):
  - Nav: **Stock** y **Simulation**.
  - Abajo: avatar con iniciales, usuario (`GET /user/info`, text/plain) y botón de cerrar sesión.
- Contenido con padding de 40 × 48 px.

### Stock (`/stock`)
- Datos: `GET /profile` → `ProfileWithData.stocks` (`StockWithSimulations[]`).
- Encabezado "Mis simulaciones", botón **+** (Agregar acción) y buscador por nombre o ticker (filtra en cliente).
- Grilla de 2 columnas. Cada tarjeta muestra:
  - nombre y ticker
  - badge con `model_type`
  - badge con "N simulaciones" (`simulations.length`)
  - S₀, volatilidad y tendencia
  - un "Ver →" que lleva al detalle
- Diálogo **Agregar acción**: `POST /stocks` con `{ticker, name}`.

### Detalle (`/stock/:id`)
- Encabezado:
  - enlace "← Volver a Mis simulaciones"
  - nombre y ticker
  - botones **Editar** (diálogo con solo el nombre; `PATCH /stocks/{id}` `{name}`), **Eliminar** (confirmación; `DELETE /stocks/{id}`) y **Nueva simulación** (→ `/simulation?stock=:id`)
- Columna izquierda de 360 px: "Simulaciones guardadas (N)".
  - Datos: `GET /stocks/{id}/simulations?limit=20&offset=…`.
  - Cada ítem: modelo, fecha, y `T x a · N pasos · seed S`.
  - Botón "Cargar más" para paginar.
  - Estado vacío si no hay simulaciones.
- Panel derecho (simulación seleccionada, `?sim=`):
  - título con el modelo y metadatos; botón eliminar (`DELETE /simulations/{id}`)
  - tiles de parámetros: S₀, μ, σ y los `extra_params` del modelo
  - **visor de trayectoria** (sección 5)

### Nueva simulación (`/simulation`)
- Encabezado con selector **Acción** (opciones: "Sin acción" → `stock_id: null`, y las acciones del perfil).
- `p-splitter` con dos paneles:
  - Izquierda (~356 px): formulario reactivo con scroll y botón fijo abajo.
  - Derecha: visor de trayectoria.
- Formulario (`CreateSimulationPayload`):
  - **Modelo** (`model_type`): GBM, Merton, OU, Heston. Debajo, la fórmula del modelo en mono.
  - **Parámetros base**: `initial_price`, `drift`, `volatility`, `time_horizon` (años), `steps`, `random_seed`, más el botón "Nueva semilla".
  - **Parámetros del modelo** (`extra_params`, depende del modelo):
    - Merton: `jump_intensity` λ, `jump_mean` m, `jump_volatility` δ
    - OU: `mean_reversion` κ, `reversion_level` L
    - Heston: `initial_variance` v₀, `mean_reversion` κ, `reversion_level` θ, `vol_of_vol` ξ, `correlation` ρ
    - GBM: sin extras (`{model: "gbm"}`)
  - Validación: S₀ > 0, T > 0, pasos entero ≥ 1, semilla entero ≥ 0, σ ≥ 0, ρ ∈ [−1, 1]. Los campos inválidos van con borde rojo y mensaje.
- Botón **"Simular y guardar"**:
  1. `POST /simulations`
  2. `GET /simulations/{id}/ticks`
  3. reproducir la trayectoria
  - Al terminar, mostrar el aviso "Simulación guardada en TICKER" con "Ver en historial →".
  - Cambiar cualquier parámetro limpia la trayectoria (hay que volver a simular).

## 4. Fórmulas mostradas (solo texto informativo)

```
GBM     dS = μ·S dt + σ·S dW
Merton  dS = μ·S dt + σ·S dW + S·(J − 1) dN,  N ~ Poisson(λ), ln J ~ N(m, δ²)
OU      dS = κ·(L − S) dt + σ·S dW
Heston  dS = μ·S dt + √v·S dW₁ ;  dv = κ·(θ − v) dt + ξ·√v dW₂ ;  ρ = corr(W₁, W₂)
```

## 5. Visor de trayectoria (componente compartido)

**Fuente:** `GET /simulations/{id}/ticks` → `TicksResponse { ticks[], times[], steps, time_horizon, random_seed }`.

**Flujo de datos:**
1. El servicio HTTP obtiene el JSON como texto.
2. El Web Worker lo parsea y devuelve `Float64Array` transferibles `[times, ticks]`.
3. `app-uplot-chart` recibe `AlignedData`.
4. En cada cuadro, `setData()` con `subarray(0, n)`.

**Gráfico (uPlot):**
- Eje X = `times` en años (etiquetas "0,25 a"); eje Y = precio.
- Línea de precio en `brand` de 2 px, y línea punteada horizontal en S₀.
- Punto marcador más línea vertical en el tick actual.
- Tooltip al pasar el mouse: `Tick N · t 0,480 a · S 108,21`.
- Leyenda en vivo: Tick, t, Precio, S₀.

**Tiles** (calculados de `ticks`): Precio final, Retorno %, Mínimo, Máximo.

**Reproducción** (servicio por instancia, con `requestAnimationFrame`):
- reiniciar, play/pausa (botón redondo), slider de posición, texto `Tick X/N · S precio`, velocidades 0,5× / 1× / 2× / 4×
- a 1×, la trayectoria completa dura unos 6 s
- arranca sola al cargar
- se pausa cuando hay un diálogo abierto o la carga no está lista

**Estados:**
- `idle`: borde punteado, "Aún no hay trayectoria" (solo en Nueva simulación).
- `loading`: spinner, "Cargando trayectoria…" y la ruta del endpoint.
- `error`: caja roja con botón **Reintentar**. Mensajes según el código:
  - 413 → "Trayectoria demasiado grande". Sugerir reducir los pasos.
  - 404 → "Simulación no encontrada".
  - 400 → "Parámetros inválidos".
  - otro → "No se pudo cargar la trayectoria".
- `ready`: tiles + gráfico + reproducción.

## 6. Diálogos

Los diálogos son modales de 440 px con overlay `rgba(22,24,29,.45)`. Llevan "Cancelar" y un botón de acción; ese botón es rojo cuando elimina algo.

## 7. Preguntas abiertas para el backend

1. ¿`/user/login` y `/user/register` responden un array o un objeto?
2. ¿Cuál es el límite de pasos que provoca el 413? Mostrarlo en el campo "Pasos".
3. En OU, ¿la volatilidad es `σ·S` o absoluta? En Heston, ¿se usa `volatility`?
4. Una acción creada con `POST /stocks` no tiene `model_type` ni S₀, μ y σ. ¿Cómo llegan a `StockWithSimulations`? Mientras tanto, mostrar "Sin modelo" y "—".
