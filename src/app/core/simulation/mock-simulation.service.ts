import { Injectable } from '@angular/core';

import { SimulationParameters } from '../../features/simulation/dto/simulation-parameters.dto';
import { SimulationResultPayload } from './dto/simulation-result.dto';

export interface MockSimulationOptions {
  initialPrice?: number;
  pathCount?: number;
  seed?: number;
}

// Stand-in for the backend's (not yet built) simulation-results endpoint.
// Generates deterministic Geometric Brownian Motion paths client-side, using
// the same discretization the backend's `Gbm` model type is expected to use,
// so this can be swapped for a real HTTP call without changing its shape.
@Injectable({ providedIn: 'root' })
export class MockSimulationService {
  generate(
    parameters: SimulationParameters,
    { initialPrice = 100, pathCount = 3, seed = 42 }: MockSimulationOptions = {},
  ): SimulationResultPayload {
    const { drift, volatility, steps } = parameters;
    const dt = 1 / steps;
    const nextGaussian = createGaussianGenerator(seed);

    const paths: number[][] = Array.from({ length: pathCount }, () => [initialPrice]);

    for (let step = 1; step <= steps; step++) {
      for (const path of paths) {
        const previous = path[step - 1];
        const shock = (drift - 0.5 * volatility ** 2) * dt + volatility * Math.sqrt(dt) * nextGaussian();
        path.push(previous * Math.exp(shock));
      }
    }

    return Array.from({ length: steps + 1 }, (_, i) => ({
      time: i * dt,
      paths: paths.map((path) => path[i]),
    }));
  }
}

function createGaussianGenerator(seed: number): () => number {
  const nextUniform = createMulberry32(seed);
  return () => {
    // Box-Muller transform.
    const u1 = nextUniform() || Number.EPSILON;
    const u2 = nextUniform();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  };
}

function createMulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
