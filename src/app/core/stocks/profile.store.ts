import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, finalize, map, tap } from 'rxjs';

import { ProfileApi } from '../api/profile-api';
import { StocksApi } from '../api/stocks-api';
import { CreateStockPayload, StockWithSimulations } from '../api/models';

// Cached `GET /profile` data shared by the stock grid, the stock detail and
// the "Acción" selector in Nueva simulación.
@Injectable({ providedIn: 'root' })
export class ProfileStore {
  private readonly profileApi = inject(ProfileApi);
  private readonly stocksApi = inject(StocksApi);

  private readonly stocksState = signal<StockWithSimulations[]>([]);
  private loaded = false;

  readonly stocks = this.stocksState.asReadonly();
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly hasStocks = computed(() => this.stocksState().length > 0);

  stockById(id: string | null): StockWithSimulations | undefined {
    return id ? this.stocksState().find((stock) => stock.id === id) : undefined;
  }

  // Loads once per session; `reload()` forces a refresh after a mutation.
  ensureLoaded(): void {
    if (!this.loaded && !this.loading()) {
      this.reload();
    }
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.profileApi
      .get()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (profile) => {
          this.loaded = true;
          this.stocksState.set(profile.stocks ?? []);
        },
        error: (error: HttpErrorResponse) =>
          this.error.set(
            error.status === 404
              ? 'Tu perfil aún no existe en el servidor.'
              : 'No se pudieron cargar tus acciones.',
          ),
      });
  }

  create(payload: CreateStockPayload): Observable<void> {
    return this.stocksApi.create(payload).pipe(
      tap(() => this.reload()),
      map(() => undefined),
    );
  }

  rename(id: string, name: string): Observable<void> {
    return this.stocksApi.update(id, { name }).pipe(
      tap((updated) =>
        this.stocksState.update((stocks) =>
          stocks.map((stock) => (stock.id === id ? { ...stock, name: updated.name } : stock)),
        ),
      ),
      map(() => undefined),
    );
  }

  remove(id: string): Observable<void> {
    return this.stocksApi.delete(id).pipe(
      tap(() => this.stocksState.update((stocks) => stocks.filter((stock) => stock.id !== id))),
      map(() => undefined),
    );
  }

  // Called after a simulation is created or deleted, so the "N simulaciones"
  // badges are refetched on the next visit to the grid.
  invalidate(): void {
    this.loaded = false;
  }

  clear(): void {
    this.loaded = false;
    this.stocksState.set([]);
  }
}
