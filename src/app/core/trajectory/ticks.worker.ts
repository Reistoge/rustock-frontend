/// <reference lib="webworker" />

// Parses the raw JSON text of `GET /simulations/{id}/ticks` off the main
// thread and hands back `Float64Array`s (as transferables, zero-copy) in
// uPlot's `AlignedData` order: [times, ticks]. It never simulates prices —
// the path always comes from the Rust engine.

export interface TicksWorkerRequest {
  json: string;
}

export type TicksWorkerResponse =
  | {
      ok: true;
      simulationId: string;
      times: Float64Array;
      ticks: Float64Array;
      timeHorizon: number;
      steps: number;
      min: number;
      max: number;
    }
  | { ok: false; message: string };

interface RawTicks {
  simulation_id?: unknown;
  time_horizon?: unknown;
  steps?: unknown;
  ticks?: unknown;
  times?: unknown;
}

addEventListener('message', ({ data }: MessageEvent<TicksWorkerRequest>) => {
  try {
    const response = parse(data.json);
    postMessage(response, [response.times.buffer, response.ticks.buffer]);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Respuesta inválida';
    postMessage({ ok: false, message } satisfies TicksWorkerResponse);
  }
});

function parse(json: string): Extract<TicksWorkerResponse, { ok: true }> {
  const raw = JSON.parse(json) as RawTicks;
  if (!Array.isArray(raw.ticks) || raw.ticks.length === 0) {
    throw new Error('La respuesta no contiene ticks');
  }

  const count = raw.ticks.length;
  const timeHorizon = toNumber(raw.time_horizon, 1);
  const rawTimes = Array.isArray(raw.times) && raw.times.length === count ? raw.times : null;

  const times = new Float64Array(count);
  const ticks = new Float64Array(count);
  let min = Infinity;
  let max = -Infinity;

  for (let i = 0; i < count; i++) {
    const price = toNumber(raw.ticks[i], NaN);
    ticks[i] = price;
    // Without `times`, ticks are evenly spaced over the horizon.
    times[i] = rawTimes ? toNumber(rawTimes[i], 0) : count > 1 ? (timeHorizon * i) / (count - 1) : 0;
    if (price < min) min = price;
    if (price > max) max = price;
  }

  return {
    ok: true,
    simulationId: String(raw.simulation_id ?? ''),
    times,
    ticks,
    timeHorizon,
    steps: toNumber(raw.steps, count - 1),
    min,
    max,
  };
}

function toNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}
