import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  CreateStockPayload,
  SimulationResponse,
  StockQueryFilters,
  StockResponse,
  UpdateStockPayload,
} from './models';

export const SIMULATIONS_PAGE_SIZE = 20;

@Injectable({ providedIn: 'root' })
export class StocksApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/stocks`;

  list(filters: StockQueryFilters = {}): Observable<StockResponse[]> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined) {
        params = params.set(key, value);
      }
    }
    return this.http.get<StockResponse[]>(this.baseUrl, { params });
  }

  getById(id: string): Observable<StockResponse> {
    return this.http.get<StockResponse>(`${this.baseUrl}/id/${id}`);
  }

  getByTicker(ticker: string): Observable<StockResponse> {
    return this.http.get<StockResponse>(`${this.baseUrl}/ticker/${encodeURIComponent(ticker)}`);
  }

  create(payload: CreateStockPayload): Observable<StockResponse> {
    return this.http.post<StockResponse>(this.baseUrl, payload);
  }

  update(id: string, payload: UpdateStockPayload): Observable<StockResponse> {
    return this.http.patch<StockResponse>(`${this.baseUrl}/${id}`, payload);
  }

  // 204 No Content.
  delete(id: string): Observable<unknown> {
    return this.http.delete(`${this.baseUrl}/${id}`, { responseType: 'text' });
  }

  simulations(
    id: string,
    offset = 0,
    limit = SIMULATIONS_PAGE_SIZE,
  ): Observable<SimulationResponse[]> {
    const params = new HttpParams().set('limit', limit).set('offset', offset);
    return this.http.get<SimulationResponse[]>(`${this.baseUrl}/${id}/simulations`, { params });
  }
}
