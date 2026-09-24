/// <reference lib="webworker" />

import { SimulationResultPayload } from './dto/simulation-result.dto';

// Request: raw JSON text, so JSON.parse runs off the main thread too —
// not just the array mapping below.
export interface SimulationDataWorkerRequest {
  json: string;
}

// Response: one Float64Array per uPlot series — [timestamps, path1, path2, ...].
// Their `.buffer`s are passed as transferables for a zero-copy handoff.
export interface SimulationDataWorkerResponse {
  series: Float64Array[];
}

addEventListener('message', ({ data }: MessageEvent<SimulationDataWorkerRequest>) => {
  const payload: SimulationResultPayload = JSON.parse(data.json);

  const pointCount = payload.length;
  const pathCount = pointCount > 0 ? payload[0].paths.length : 0;

  const timestamps = new Float64Array(pointCount);
  const paths: Float64Array[] = Array.from(
    { length: pathCount },
    () => new Float64Array(pointCount),
  );

  for (let i = 0; i < pointCount; i++) {
    const point = payload[i];
    timestamps[i] = point.time;
    for (let p = 0; p < pathCount; p++) {
      paths[p][i] = point.paths[p];
    }
  }

  const series = [timestamps, ...paths];
  const response: SimulationDataWorkerResponse = { series };

  (postMessage as (message: unknown, transfer: Transferable[]) => void)(
    response,
    series.map((typedArray) => typedArray.buffer),
  );
});
