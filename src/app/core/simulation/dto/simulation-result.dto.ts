// Raw shape returned by a (future) simulation results endpoint — one entry
// per time step, with one price per simulated path at that step. This is
// intentionally "array of objects" shaped: the whole point of the Web Worker
// is to turn this into uPlot's flat, typed-array `AlignedData` format instead.
export interface SimulationPricePoint {
  time: number;
  paths: number[];
}

export type SimulationResultPayload = SimulationPricePoint[];
