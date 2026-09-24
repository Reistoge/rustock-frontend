import uPlot from 'uplot';

// Full view bounds for the current dataset. `key` fingerprints the dataset
// so loading a new trajectory drops the previous zoom/pan instead of
// reapplying a stale window to unrelated data.
export interface ViewBounds {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  key: string;
}

export interface ViewNavigation {
  /** Scale range for the x axis: zoomed window, or the full bounds. */
  xRange: () => [number, number];
  /** Scale range for the y axis: zoomed window, or the full bounds. */
  yRange: () => [number, number];
  /** Attaches wheel/dblclick/pointer listeners; use as a uPlot `ready` hook. */
  handleReady: (u: uPlot) => void;
  /** Detaches listeners and resets state; use as a uPlot `destroy` hook. */
  handleDestroy: () => void;
}

interface ViewWindow {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

// Wheel zoom + drag pan for a uPlot chart. The zoomed window is returned by
// the range functions so streaming `setData()` calls (e.g. trajectory
// playback feeding a growing subarray) keep the user's view instead of
// snapping back to the full bounds on every frame.
export function createViewNavigation(getFull: () => ViewBounds | null): ViewNavigation {
  let zoom: ViewWindow | null = null;
  let lastKey: string | null = null;

  let target: HTMLElement | null = null;
  let wheelHandler: ((event: WheelEvent) => void) | null = null;
  let dblClickHandler: (() => void) | null = null;
  let pointerDownHandler: ((event: PointerEvent) => void) | null = null;
  let pointerMoveHandler: ((event: PointerEvent) => void) | null = null;
  let pointerUpHandler: ((event: PointerEvent) => void) | null = null;

  // A new dataset has a new key: drop the old view.
  function sync(): ViewBounds | null {
    const full = getFull();
    const key = full?.key ?? null;
    if (key !== lastKey) {
      lastKey = key;
      zoom = null;
    }
    return full;
  }

  function currentOrFull(full: ViewBounds): ViewWindow {
    return zoom ?? { xMin: full.xMin, xMax: full.xMax, yMin: full.yMin, yMax: full.yMax };
  }

  function apply(u: uPlot, next: ViewWindow | null, full: ViewBounds): void {
    zoom = next;
    const view = next ?? { xMin: full.xMin, xMax: full.xMax, yMin: full.yMin, yMax: full.yMax };
    u.batch(() => {
      u.setScale('x', { min: view.xMin, max: view.xMax });
      u.setScale('y', { min: view.yMin, max: view.yMax });
    });
  }

  function handleReady(u: uPlot): void {
    const onWheel = (event: WheelEvent): void => {
      const full = getFull();
      if (!full) {
        return;
      }
      event.preventDefault();
      const cur = currentOrFull(full);

      const rect = u.over.getBoundingClientRect();
      const cursorX = event.clientX - rect.left;
      const cursorY = event.clientY - rect.top;
      const centerX =
        cursorX >= 0 && cursorX <= rect.width ? u.posToVal(cursorX, 'x') : (cur.xMin + cur.xMax) / 2;
      const centerY =
        cursorY >= 0 && cursorY <= rect.height ? u.posToVal(cursorY, 'y') : (cur.yMin + cur.yMax) / 2;

      const delta =
        event.deltaMode === 1 ? event.deltaY * 33 : event.deltaMode === 2 ? event.deltaY * 400 : event.deltaY;
      const factor = Math.exp(delta * 0.0012);
      apply(
        u,
        clampZoom(
          {
            xMin: centerX + (cur.xMin - centerX) * factor,
            xMax: centerX + (cur.xMax - centerX) * factor,
            yMin: centerY + (cur.yMin - centerY) * factor,
            yMax: centerY + (cur.yMax - centerY) * factor,
          },
          full,
        ),
        full,
      );
    };

    const onDblClick = (): void => {
      const full = getFull();
      if (!full) {
        return;
      }
      apply(u, null, full);
    };

    // Drag-to-pan: grabs the data under the cursor and follows the pointer.
    let panning = false;
    let startX = 0;
    let startY = 0;
    let startView: ViewWindow | null = null;

    const onPointerDown = (event: PointerEvent): void => {
      const full = getFull();
      if (event.button !== 0 || !full) {
        return;
      }
      panning = true;
      startX = event.clientX;
      startY = event.clientY;
      startView = currentOrFull(full);
      u.over.setPointerCapture(event.pointerId);
      u.over.style.cursor = 'grabbing';
    };

    const onPointerMove = (event: PointerEvent): void => {
      const full = getFull();
      if (!panning || !startView || !full) {
        return;
      }
      const rect = u.over.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        return;
      }
      // Ignore tiny jitter so plain clicks don't shift the view.
      if (Math.abs(event.clientX - startX) < 3 && Math.abs(event.clientY - startY) < 3) {
        return;
      }
      const dx = u.posToVal(startX - rect.left, 'x') - u.posToVal(event.clientX - rect.left, 'x');
      const dy = u.posToVal(startY - rect.top, 'y') - u.posToVal(event.clientY - rect.top, 'y');
      apply(u, panView(startView, dx, dy, full), full);
    };

    const onPointerUp = (event: PointerEvent): void => {
      if (!panning) {
        return;
      }
      panning = false;
      startView = null;
      u.over.style.cursor = '';
      if (u.over.hasPointerCapture(event.pointerId)) {
        u.over.releasePointerCapture(event.pointerId);
      }
    };

    wheelHandler = onWheel;
    dblClickHandler = onDblClick;
    pointerDownHandler = onPointerDown;
    pointerMoveHandler = onPointerMove;
    pointerUpHandler = onPointerUp;
    target = u.over;
    u.over.addEventListener('wheel', onWheel, { passive: false });
    u.over.addEventListener('dblclick', onDblClick);
    u.over.addEventListener('pointerdown', onPointerDown);
    u.over.addEventListener('pointermove', onPointerMove);
    u.over.addEventListener('pointerup', onPointerUp);
    u.over.addEventListener('pointercancel', onPointerUp);
  }

  function handleDestroy(): void {
    if (target) {
      if (wheelHandler) {
        target.removeEventListener('wheel', wheelHandler);
      }
      if (dblClickHandler) {
        target.removeEventListener('dblclick', dblClickHandler);
      }
      if (pointerDownHandler) {
        target.removeEventListener('pointerdown', pointerDownHandler);
      }
      if (pointerMoveHandler) {
        target.removeEventListener('pointermove', pointerMoveHandler);
      }
      if (pointerUpHandler) {
        target.removeEventListener('pointerup', pointerUpHandler);
        target.removeEventListener('pointercancel', pointerUpHandler);
      }
    }
    target = null;
    wheelHandler = dblClickHandler = pointerDownHandler = pointerMoveHandler = pointerUpHandler = null;
    zoom = null;
  }

  return {
    xRange: () => {
      const full = sync();
      if (!full) {
        return [0, 1];
      }
      return zoom ? [zoom.xMin, zoom.xMax] : [full.xMin, full.xMax];
    },
    yRange: () => {
      const full = sync();
      if (!full) {
        return [0, 1];
      }
      return zoom ? [zoom.yMin, zoom.yMax] : [full.yMin, full.yMax];
    },
    handleReady,
    handleDestroy,
  };
}

function clampZoom(next: ViewWindow, full: ViewBounds): ViewWindow | null {
  const minSpanX = Math.max((full.xMax - full.xMin) / 500, 1e-9);
  const minSpanY = Math.max((full.yMax - full.yMin) / 500, 1e-9);

  let { xMin, xMax, yMin, yMax } = next;

  if (xMax - xMin < minSpanX) {
    const center = (xMin + xMax) / 2;
    xMin = center - minSpanX / 2;
    xMax = center + minSpanX / 2;
  }
  if (yMax - yMin < minSpanY) {
    const center = (yMin + yMax) / 2;
    yMin = center - minSpanY / 2;
    yMax = center + minSpanY / 2;
  }

  // Zoomed out past the full view: reset.
  if (xMin <= full.xMin && xMax >= full.xMax && yMin <= full.yMin && yMax >= full.yMax) {
    return null;
  }

  return {
    xMin: Math.max(full.xMin, Math.min(xMin, full.xMax - minSpanX)),
    xMax: Math.min(full.xMax, Math.max(xMax, full.xMin + minSpanX)),
    yMin: Math.max(full.yMin, Math.min(yMin, full.yMax - minSpanY)),
    yMax: Math.min(full.yMax, Math.max(yMax, full.yMin + minSpanY)),
  };
}

// Shifts a zoom window by a data delta, clamped so the view never leaves
// the full bounds. Returns null when the result covers the full view.
function panView(start: ViewWindow, dx: number, dy: number, full: ViewBounds): ViewWindow | null {
  const spanX = start.xMax - start.xMin;
  const spanY = start.yMax - start.yMin;

  let xMin = spanX >= full.xMax - full.xMin ? full.xMin : start.xMin + dx;
  let yMin = spanY >= full.yMax - full.yMin ? full.yMin : start.yMin + dy;
  xMin = Math.max(full.xMin, Math.min(xMin, full.xMax - spanX));
  yMin = Math.max(full.yMin, Math.min(yMin, full.yMax - spanY));

  const xMax = spanX >= full.xMax - full.xMin ? full.xMax : xMin + spanX;
  const yMax = spanY >= full.yMax - full.yMin ? full.yMax : yMin + spanY;

  if (xMin <= full.xMin && xMax >= full.xMax && yMin <= full.yMin && yMax >= full.yMax) {
    return null;
  }
  return { xMin, xMax, yMin, yMax };
}
