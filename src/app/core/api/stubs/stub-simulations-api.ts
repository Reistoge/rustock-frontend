import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import {
  CreateSimulationPayload,
  SimulationQueryFilters,
  SimulationResponse,
} from '../models';
import { StubBackend } from './stub-backend';

// Drop-in for `SimulationsApi` when USE_STUBS is enabled: same public
// signatures, including raw `TicksResponse` JSON text for the ticks worker.
@Injectable({ providedIn: 'root' })
export class StubSimulationsApi {
  private readonly backend = inject(StubBackend);

  create(payload: CreateSimulationPayload): Observable<SimulationResponse> {
    return this.backend.createSimulation(payload);
  }

  get(id: string): Observable<SimulationResponse> {
    return this.backend.getSimulation(id);
  }

  list(filters: SimulationQueryFilters = {}): Observable<SimulationResponse[]> {
    return this.backend.listSimulations(filters);
  }

  delete(id: string): Observable<unknown> {
    return this.backend.deleteSimulation(id);
  }

  ticksJson(id: string): Observable<string> {
    return this.backend.ticksJson(id);
  }
}
