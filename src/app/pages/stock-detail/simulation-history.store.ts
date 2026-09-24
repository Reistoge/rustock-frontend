import { HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { Observable, Subscription, map, tap } from 'rxjs';

import { SimulationResponse } from '../../core/api/models';
import { SimulationsApi } from '../../core/api/simulations-api';
import { SIMULATIONS_PAGE_SIZE, StocksApi } from '../../core/api/stocks-api';
import { ProfileStore } from '../../core/stocks/profile.store';

// Paginated `GET /stocks/{id}/simulations` for the detail page, plus the
// selected simulation (which may come from `?sim=` before its page loads).
@Injectable()
export class SimulationHistoryStore {
  private readonly stocksApi = inject(StocksApi);
  private readonly simulationsApi = inject(SimulationsApi);
  private readonly profile = inject(ProfileStore);
  private pageRequest?: Subscription;
  private selectedRequest?: Subscription;
  private stockId: string | null = null;

  readonly items = signal<SimulationResponse[]>([]);
  readonly loading = signal(false);
  readonly hasMore = signal(false);
  readonly error = signal<string | null>(null);
  // Fallback for a `?sim=` that is not in the loaded pages.
  private readonly fetchedSelected = signal<SimulationResponse | null>(null);
  readonly selectedId = signal<string | null>(null);

  readonly selected = computed(() => {
    const id = this.selectedId();
    if (!id) return null;
    const fromList = this.items().find((simulation) => simulation.id === id);
    const fetched = this.fetchedSelected();
    return fromList ?? (fetched?.id === id ? fetched : null);
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.pageRequest?.unsubscribe();
      this.selectedRequest?.unsubscribe();
    });
  }

  reset(stockId: string): void {
    this.stockId = stockId;
    this.items.set([]);
    this.hasMore.set(false);
    this.loadPage(0);
  }

  loadMore(): void {
    this.loadPage(this.items().length);
  }

  select(id: string | null): void {
    this.selectedId.set(id);
    this.selectedRequest?.unsubscribe();
    if (id && !this.items().some((simulation) => simulation.id === id)) {
      this.selectedRequest = this.simulationsApi
        .get(id)
        .subscribe({ next: (simulation) => this.fetchedSelected.set(simulation), error: () => {} });
    }
  }

  // Deletes and returns the id to select next (or null).
  remove(id: string): Observable<string | null> {
    return this.simulationsApi.delete(id).pipe(
      tap(() => {
        this.items.update((items) => items.filter((simulation) => simulation.id !== id));
        this.profile.invalidate();
      }),
      map(() => this.items()[0]?.id ?? null),
    );
  }

  private loadPage(offset: number): void {
    const stockId = this.stockId;
    if (!stockId) return;

    this.pageRequest?.unsubscribe();
    this.loading.set(true);
    this.error.set(null);
    this.pageRequest = this.stocksApi.simulations(stockId, offset).subscribe({
      next: (page) => {
        this.items.update((items) => (offset === 0 ? page : [...items, ...page]));
        this.hasMore.set(page.length === SIMULATIONS_PAGE_SIZE);
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.loading.set(false);
        this.error.set(
          error.status === 404
            ? 'El historial de esta acción no está disponible.'
            : 'No se pudo cargar el historial.',
        );
      },
    });
  }
}
