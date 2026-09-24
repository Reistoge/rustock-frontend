import { HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { Observable, Subscription, map, tap } from 'rxjs';

import { ModelType, SimulationResponse } from '../../core/api/models';
import { SimulationsApi } from '../../core/api/simulations-api';
import { ProfileStore } from '../../core/stocks/profile.store';

export const ALL_SIMULATIONS_PAGE_SIZE = 20;

// Paginated `GET /simulations` for the simulations page. Mirrors
// `SimulationHistoryStore` but lists every simulation, optionally filtered
// by `model_type` (the only server-side filter in openapi.json).
@Injectable()
export class AllSimulationsStore {
  private readonly simulationsApi = inject(SimulationsApi);
  private readonly profile = inject(ProfileStore);
  private pageRequest?: Subscription;

  readonly items = signal<SimulationResponse[]>([]);
  readonly loading = signal(false);
  readonly hasMore = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    inject(DestroyRef).onDestroy(() => this.pageRequest?.unsubscribe());
  }

  reload(model: ModelType | null): void {
    this.loadPage(model, 0);
  }

  loadMore(model: ModelType | null): void {
    this.loadPage(model, this.items().length);
  }

  prepend(simulation: SimulationResponse, model: ModelType | null): void {
    if (model && simulation.model_type !== model) return;
    this.items.update((items) =>
      items.some((item) => item.id === simulation.id) ? items : [simulation, ...items],
    );
  }

  // Deletes on the server, drops the simulation from the page and marks
  // the profile cache stale so the per-stock counters refetch on next visit.
  remove(id: string): Observable<void> {
    return this.simulationsApi.delete(id).pipe(
      tap(() => {
        this.items.update((items) => items.filter((simulation) => simulation.id !== id));
        this.profile.invalidate();
      }),
      map(() => undefined),
    );
  }

  private loadPage(model: ModelType | null, offset: number): void {
    this.pageRequest?.unsubscribe();
    this.loading.set(true);
    this.error.set(null);
    this.pageRequest = this.simulationsApi
      .list({
        ...(model ? { model_type: model } : {}),
        limit: ALL_SIMULATIONS_PAGE_SIZE,
        offset,
      })
      .subscribe({
        next: (page) => {
          this.items.update((items) => (offset === 0 ? page : [...items, ...page]));
          this.hasMore.set(page.length === ALL_SIMULATIONS_PAGE_SIZE);
          this.loading.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.loading.set(false);
          this.error.set(
            error.status === 401
              ? 'No estás autorizado para ver las simulaciones.'
              : 'No se pudieron cargar las simulaciones.',
          );
        },
      });
  }
}
