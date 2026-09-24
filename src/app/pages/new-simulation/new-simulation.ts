import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { SplitterModule } from 'primeng/splitter';

import { SimulationResponse } from '../../core/api/models';
import { SimulationsApi } from '../../core/api/simulations-api';
import { SIMULATIONS_PAGE_SIZE } from '../../core/api/stocks-api';
import { formatPlain } from '../../core/format/format';
import { ProfileStore } from '../../core/stocks/profile.store';
import { TrajectoryViewer } from '../../shared/trajectory-viewer/trajectory-viewer';
import { SimulationHistory } from '../stock-detail/simulation-history';
import { SimulationDraft, SimulationForm } from './simulation-form';

// /simulation?stock=:id&sim=:simId — left: global `GET /simulations` list
// (includes `stock_id = null` runs invisible on stock detail); right:
// "Simular y guardar" (POST /simulations) with the trajectory viewer.
@Component({
  selector: 'app-new-simulation',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    SelectModule,
    SplitterModule,
    MessageModule,
    SimulationForm,
    SimulationHistory,
    TrajectoryViewer,
  ],
  templateUrl: './new-simulation.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex min-h-0 flex-1 flex-col gap-5' },
})
export class NewSimulation {
  // Router input bindings (`withComponentInputBinding`).
  readonly stockParam = input<string>(undefined, { alias: 'stock' });
  readonly simParam = input<string>(undefined, { alias: 'sim' });

  protected readonly profile = inject(ProfileStore);
  private readonly simulationsApi = inject(SimulationsApi);
  private readonly router = inject(Router);

  protected readonly stockControl = new FormControl<string | null>(null);
  protected readonly run = signal<SimulationResponse | null>(null);
  protected readonly saving = signal(false);
  protected readonly saveError = signal<string | null>(null);

  // Global list state (`GET /simulations`, paginated by limit/offset).
  protected readonly all = signal<SimulationResponse[]>([]);
  protected readonly allLoading = signal(false);
  protected readonly allHasMore = signal(false);
  protected readonly allError = signal<string | null>(null);
  protected readonly selectedId = signal<string | null>(null);

  protected readonly stock = computed(() => this.profile.stockById(this.stockParam() ?? null));
  protected readonly stockOptions = computed(() => [
    { label: 'Sin acción', value: null },
    ...this.profile.stocks().map((stock) => ({
      label: `${stock.ticker} · ${stock.name}`,
      value: stock.id,
    })),
  ]);

  // Just-created run wins; otherwise the row selected from the global list.
  protected readonly viewerId = computed(() => this.run()?.id ?? this.selectedId());
  protected readonly viewed = computed(
    () => this.run() ?? this.all().find((simulation) => simulation.id === this.selectedId()) ?? null,
  );
  protected readonly ticker = computed(
    () =>
      (this.viewed()?.stock_id
        ? this.profile.stockById(this.viewed()?.stock_id ?? null)?.ticker
        : null) ??
      this.stock()?.ticker ??
      'Sin acción',
  );
  protected readonly runMeta = computed(() => {
    const viewed = this.viewed();
    return viewed
      ? `seed ${viewed.random_seed} · ${viewed.steps} pasos · T ${formatPlain(viewed.time_horizon)} a`
      : '';
  });
  protected readonly savedText = computed(() => {
    const run = this.run();
    if (!run) return '';
    return run.stock_id
      ? `Simulación guardada en ${this.profile.stockById(run.stock_id)?.ticker ?? 'la acción'}.`
      : 'Simulación guardada sin acción asociada.';
  });

  // Badge resolver for the global list rows.
  protected readonly stockLabelFor = (stockId: string | null | undefined): string =>
    (stockId ? this.profile.stockById(stockId)?.ticker : null) ?? 'Sin acción';

  constructor() {
    this.profile.ensureLoaded();
    this.loadAll(0);

    effect(() => {
      const id = this.stockParam() ?? null;
      untracked(() => this.stockControl.setValue(id, { emitEvent: false }));
    });

    // Deep-link `?sim=`: select once the id is known (list may still load).
    effect(() => {
      const id = this.simParam() ?? null;
      untracked(() => {
        if (id && id !== this.selectedId()) {
          this.selectedId.set(id);
        }
      });
    });

    this.stockControl.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((id) =>
        this.router.navigate([], {
          queryParams: { stock: id },
          queryParamsHandling: 'merge',
        }),
      );
  }

  protected loadMoreAll(): void {
    this.loadAll(this.all().length);
  }

  protected selectAll(id: string): void {
    this.run.set(null);
    this.selectedId.set(id);
    this.router.navigate([], { queryParams: { sim: id }, queryParamsHandling: 'merge' });
  }

  protected onEdited(): void {
    this.run.set(null);
    this.saveError.set(null);
  }

  protected onSimulate(draft: SimulationDraft): void {
    this.saving.set(true);
    this.saveError.set(null);
    this.simulationsApi.create({ ...draft, stock_id: this.stockParam() ?? null }).subscribe({
      next: (simulation) => {
        this.saving.set(false);
        this.run.set(simulation);
        this.selectedId.set(simulation.id);
        this.all.update((items) =>
          items.some((item) => item.id === simulation.id)
            ? items
            : [simulation, ...items],
        );
        this.profile.invalidate();
        this.router.navigate([], {
          queryParams: { sim: simulation.id },
          queryParamsHandling: 'merge',
        });
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.saveError.set(
          error.status === 400 || error.status === 422
            ? 'El servidor rechazó los parámetros (400).'
            : 'No se pudo crear la simulación. Inténtalo otra vez.',
        );
      },
    });
  }

  private loadAll(offset: number): void {
    this.allLoading.set(true);
    this.allError.set(null);
    this.simulationsApi.list({ limit: SIMULATIONS_PAGE_SIZE, offset }).subscribe({
      next: (page) => {
        this.all.update((items) => (offset === 0 ? page : [...items, ...page]));
        this.allHasMore.set(page.length === SIMULATIONS_PAGE_SIZE);
        this.allLoading.set(false);
      },
      error: () => {
        this.allLoading.set(false);
        this.allError.set('No se pudo cargar el historial global.');
      },
    });
  }
}
