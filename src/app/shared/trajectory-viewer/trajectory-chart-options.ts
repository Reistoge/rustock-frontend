import uPlot from 'uplot';

import { formatPlain } from '../../core/format/format';
import { createViewNavigation } from './trajectory-chart-navigation';

const BRAND = '#2F4FD8';
const BRAND_FAINT = '#2F4FD866';
const HEAD_LINE = 'rgba(22, 24, 29, 0.25)';
const GRID = '#ECEBE6';
const MUTED = '#5A5D66';
const AXIS_FONT = '12px "IBM Plex Mono", monospace';

// Fixed scales for the whole trajectory, so playback (which feeds a growing
// `subarray`) never rescales the axes. User zoom/pan narrows these bounds
// via the navigation helper; a new trajectory resets them (see its `key`).
export interface ChartDomain {
  xMax: number;
  yMin: number;
  yMax: number;
  s0: number;
}

export interface ChartHover {
  index: number;
  // CSS px relative to the chart root.
  left: number;
  top: number;
  width: number;
}

export interface TrajectoryChartHooks {
  /** Current full-trajectory domain; null while nothing is loaded. */
  domain: () => ChartDomain | null;
  /** Receives the hovered tick, or null when the cursor leaves the plot. */
  onHover: (hover: ChartHover | null) => void;
}

export function buildTrajectoryChartOptions(
  hooks: TrajectoryChartHooks,
  height: number,
): uPlot.Options {
  const axis = {
    stroke: MUTED,
    font: AXIS_FONT,
    grid: { stroke: GRID, width: 1 },
    ticks: { show: false },
  };

  // Zoom/pan state lives in the navigation helper: its range functions
  // return the zoomed window so playback `setData()` keeps the user's view.
  const navigation = createViewNavigation(() => {
    const domain = hooks.domain();
    if (!domain) {
      return null;
    }
    return {
      xMin: 0,
      xMax: domain.xMax,
      yMin: domain.yMin,
      yMax: domain.yMax,
      key: `${domain.xMax}|${domain.yMin}|${domain.yMax}|${domain.s0}`,
    };
  });

  return {
    width: 640,
    height,
    legend: { show: false },
    padding: [12, 20, 0, 0],
    cursor: {
      x: true,
      y: false,
      drag: { x: false, y: false, setScale: false },
      points: { size: 8, width: 2 },
    },
    scales: {
      x: { time: false, range: navigation.xRange },
      y: { range: navigation.yRange },
    },
    axes: [
      { ...axis, size: 32, values: (_u, splits) => splits.map((v) => `${formatPlain(round2(v))} a`) },
      { ...axis, size: 60, values: (_u, splits) => splits.map((v) => formatPlain(round2(v))) },
    ],
    series: [{}, { label: 'Precio', stroke: BRAND, width: 2, points: { show: false } }],
    hooks: {
      ready: [navigation.handleReady],
      destroy: [navigation.handleDestroy],
      draw: [(u) => drawOverlay(u, hooks.domain())],
      setCursor: [(u) => hooks.onHover(hoverFrom(u))],
    },
  };
}

function hoverFrom(u: uPlot): ChartHover | null {
  const { idx, left } = u.cursor;
  const price = idx === null || idx === undefined ? null : u.data[1][idx];
  if (idx === null || idx === undefined || left === undefined || left < 0 || price == null) {
    return null;
  }
  const ratio = uPlot.pxRatio;
  return {
    index: idx,
    left: left + u.bbox.left / ratio,
    top: u.valToPos(price, 'y') + u.bbox.top / ratio,
    width: u.width,
  };
}

// Dashed S₀ reference line, plus the playback head: a vertical line and a
// marker on the last rendered tick.
function drawOverlay(u: uPlot, domain: ChartDomain | null): void {
  if (!domain) {
    return;
  }
  const ctx = u.ctx;
  const ratio = uPlot.pxRatio;
  const { left, top, width, height } = u.bbox;

  ctx.save();
  const baseY = u.valToPos(domain.s0, 'y', true);
  ctx.setLineDash([6 * ratio, 5 * ratio]);
  ctx.strokeStyle = BRAND_FAINT;
  ctx.lineWidth = 1.5 * ratio;
  ctx.beginPath();
  ctx.moveTo(left, baseY);
  ctx.lineTo(left + width, baseY);
  ctx.stroke();

  const last = u.data[0].length - 1;
  const price = last >= 0 ? u.data[1][last] : null;
  if (price != null) {
    const headX = u.valToPos(u.data[0][last], 'x', true);
    const headY = u.valToPos(price, 'y', true);

    ctx.setLineDash([]);
    ctx.strokeStyle = HEAD_LINE;
    ctx.lineWidth = ratio;
    ctx.beginPath();
    ctx.moveTo(headX, top);
    ctx.lineTo(headX, top + height);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(headX, headY, 6 * ratio, 0, 2 * Math.PI);
    ctx.fillStyle = BRAND;
    ctx.fill();
    ctx.lineWidth = 3 * ratio;
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();
  }
  ctx.restore();
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
