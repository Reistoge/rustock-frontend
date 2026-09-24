import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { SIMULATIONS_PAGE_SIZE } from '../stocks-api';
import {
  CreateStockPayload,
  SimulationResponse,
  StockQueryFilters,
  StockResponse,
  UpdateStockPayload,
} from '../models';
import { StubBackend } from './stub-backend';

// Drop-in for `StocksApi` when USE_STUBS is enabled: same public signatures.
@Injectable({ providedIn: 'root' })
export class StubStocksApi {
  private readonly backend = inject(StubBackend);

  list(filters: StockQueryFilters = {}): Observable<StockResponse[]> {
    return this.backend.listStocks(filters);
  }

  getById(id: string): Observable<StockResponse> {
    return this.backend.getStockById(id);
  }

  getByTicker(ticker: string): Observable<StockResponse> {
    return this.backend.getStockByTicker(ticker);
  }

  create(payload: CreateStockPayload): Observable<StockResponse> {
    return this.backend.createStock(payload);
  }

  update(id: string, payload: UpdateStockPayload): Observable<StockResponse> {
    return this.backend.updateStock(id, payload);
  }

  delete(id: string): Observable<unknown> {
    return this.backend.deleteStock(id);
  }

  simulations(
    id: string,
    offset = 0,
    limit = SIMULATIONS_PAGE_SIZE,
  ): Observable<SimulationResponse[]> {
    return this.backend.stockSimulations(id, offset, limit);
  }
}
