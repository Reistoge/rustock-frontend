import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { CreateSimulationPayload, SimulationQueryFilters, SimulationResponse } from './models';

@Injectable({ providedIn: 'root' })
export class SimulationsApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/simulations`;

  create(payload: CreateSimulationPayload): Observable<SimulationResponse> {
    return this.http.post<SimulationResponse>(this.baseUrl, payload);
  }

  get(id: string): Observable<SimulationResponse> {
    return this.http.get<SimulationResponse>(`${this.baseUrl}/${id}`);
  }

  list(filters: SimulationQueryFilters = {}): Observable<SimulationResponse[]> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined) {
        params = params.set(key, value);
      }
    }
    return this.http.get<SimulationResponse[]>(this.baseUrl, { params });
  }

  delete(id: string): Observable<unknown> {
    return this.http.delete(`${this.baseUrl}/${id}`, { responseType: 'text' });
  }

  // Raw JSON text of `TicksResponse`: parsing happens in the ticks Web Worker
  // so large paths never block the UI thread.
  ticksJson(id: string): Observable<string> {
    return this.http.get(`${this.baseUrl}/${id}/ticks`, { responseType: 'text' });
  }
}
