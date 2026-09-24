# RULES

## 1. Core Architecture & Stack
*   **Framework:** Angular (Standalone Components).
*   **UI Library:** PrimeNG.
*   **Visualization Engine:** uPlot.
*   **Data Handling:** Web Workers for parsing JSON payloads, `TypedArrays` (`Float64Array`) for memory efficiency.

## 2. File Size Constraints & Modularity
*   **Maximum File Size:** No TypeScript or SCSS file shall exceed 400 Lines of Code (LOC).
*   **Target File Size:** Maintain files between 150 and 300 LOC.
*   **Logic Delegation:** 
    *   If a component exceeds 300 LOC, extract data transformation logic into an `@Injectable` service.
    *   Extract heavy JSON parsing and array mapping into Web Workers.
    *   Divide complex views into smaller, stateless presentational (dumb) components.

## 3. UI & Component Rules (PrimeNG)
*   **Imports:** Import only the specific PrimeNG modules required for the component (e.g., `SliderModule`, `SplitterModule`, `InputNumberModule`) to minimize bundle size.
*   **Forms:** Use Reactive Forms for parameter control panels (Drift, Volatility, Steps).
*   **Layout:** Utilize `p-splitter` for the main layout to separate the parameter workbench from the visualization canvas.

## 4. Visualization Rules (uPlot)
*   **Encapsulation:** uPlot must be strictly encapsulated within a dedicated standalone component (`app-uplot-chart`). 
*   **Data Structure:** Never pass raw JSON arrays of objects to the chart. The data service or Web Worker must format the payload into uPlot's `AlignedData` format: `[ [timestamps], [path1], [path2] ]`.
*   **Memory Management:** Always convert parsed data arrays into `Float64Array`. 
*   **Lifecycle:** Always invoke `uplot.destroy()` in the `ngOnDestroy` hook of the wrapper component to prevent memory leaks. Do not instantiate a new chart on data updates; use `uplot.setData()`.

## 5. Styling Architecture (Tailwind CSS)
*   **Utility-First:** Use Tailwind CSS for all layout, typography, and spacing. Component-scoped SCSS or CSS files should be empty or deleted unless strictly required for a highly specific uPlot canvas override.
*   **PrimeNG Configuration:** Initialize PrimeNG in **Unstyled Mode**. 
*   **Tailwind Preset:** Use the `@primeng/themes/tailwind` preset (or a custom `passthrough` configuration) to apply Tailwind utility classes directly to PrimeNG components.
*   **uPlot Theme:** Target the `.uplot` DOM elements globally inside `styles.scss` using Tailwind's `@apply` directive to match the canvas tooltips and axes to the application's color palette(e.g., `@apply text-slate-800 bg-white border-slate-200`).
*   **Layouts:** Replace PrimeNG structural SCSS with Tailwind's Flexbox (`flex`, `flex-col`) and Grid (`grid`, `grid-cols-12`) utilities for the main dashboard and parameter sidebars.

## 6. Execution Workflow
1.  Generate the base SCSS architecture and PrimeNG theme integration.
2.  Implement the Web Worker for JSON data parsing and `Float64Array` mapping.
3.  Implement the `uplot-chart` standalone wrapper component.
4.  Build the PrimeNG control panel using Reactive Forms.
5.  Wire the dashboard container to manage the state between the parameter inputs, the data worker, and the chart wrapper.
