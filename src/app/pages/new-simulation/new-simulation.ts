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
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SelectModule } from 'primeng/select';

import { MODEL_TYPES, ModelType, SimulationResponse } from '../../core/api/models';
import { SimulationsApi } from '../../core/api/simulations-api';
import { formatPlain } from '../../core/format/format';
import { MODELS as MODEL_CATALOG } from '../../core/simulation/model-catalog';
import { ProfileStore } from '../../core/stocks/profile.store';
import { TrajectoryViewer } from '../../shared/trajectory-viewer/trajectory-viewer';
import { SavedSimulationPanel } from '../stock-detail/saved-simulation-panel';
import { SimulationCard } from './simulation-card';
import { SimulationDraft, SimulationForm } from './simulation-form';
import { AllSimulationsStore } from './simulations.store';

// /simulation?stock=:stockId&sim=:simId — combined view:
// every simulation (GET /simulations) as cards like the stock grid, the
// "Nueva simulación" flow (POST /simulations + ticks viewer) and the
// selected simulation charts, all in one responsive page.
@Component({
  selector: 'app-new-simulation',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    SelectModule,
    ButtonModule,
    InputTextModule,
    MessageModule,
    ProgressSpinnerModule,
    SimulationForm,
    TrajectoryViewer,
    SimulationCard,
    SavedSimulationPanel,
  ],
  templateUrl: './new-simulation.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [AllSimulationsStore],
  host: { class: 'flex min-h-0 flex-1 flex-col gap-6' },
})
export class NewSimulation {
  // Router input bindings.
  readonly stockParam = input<string>(undefined, { alias: 'stock' });
  readonly simParam = input<string>(undefined, { alias: 'sim' });

  protected readonly profile = inject(ProfileStore);
  protected readonly store = inject(AllSimulationsStore);
  private readonly simulationsApi = inject(SimulationsApi);
  private readonly confirmation = inject(ConfirmationService);
  private readonly router = inject(Router);

  // List toolbar: client-side search + server-side model filter.
  protected readonly search = new FormControl('', { nonNullable: true });
  protected readonly modelControl = new FormControl<ModelType | null>(null);
  private readonly query = toSignal(this.search.valueChanges, { initialValue: '' });
  private readonly modelFilter = toSignal(this.modelControl.valueChanges, {
    initialValue: null,
  });

  protected readonly modelOptions = [
    { label: 'Todos los modelos', value: null },
    ...MODEL_TYPES.map((value) => ({ label: MODEL_CATALOG[value].option, value })),
  ];

  // Creation flow state (the previous "Nueva simulación" splitter).
  protected readonly creating = signal(false);
  protected readonly stockControl = new FormControl<string | null>(null);
  protected readonly run = signal<SimulationResponse | null>(null);
  protected readonly saving = signal(false);
  protected readonly saveError = signal<string | null>(null);

  // Selected card → charts. Falls back to a single GET when the id is not
  // in the loaded pages (deep link before its page loads).
  protected readonly selectedId = signal<string | null>(null);
  private readonly fetchedSelected = signal<SimulationResponse | null>(null);
  private readonly confirming = signal(false);

  protected readonly stock = computed(() => this.profile.stockById(this.stockParam() ?? null));
  protected readonly stockOptions = computed(() => [
    { label: 'Sin acción', value: null },
    ...this.profile.stocks().map((stock) => ({
      label: `${stock.ticker} · ${stock.name}`,
      value: stock.id,
    })),
  ]);

  protected readonly ticker = computed(() => this.stock()?.ticker ?? 'Sin acción');
  protected readonly runMeta = computed(() => {
    const run = this.run();
    return run
      ? `seed ${run.random_seed} · ${run.steps} pasos · T ${formatPlain(run.time_horizon)} a`
      : '';
  });
  protected readonly savedText = computed(() => {
    const run = this.run();
    if (!run) return '';
    return run.stock_id
      ? `Simulación guardada en ${this.profile.stockById(run.stock_id)?.ticker ?? 'la acción'}.`
      : 'Simulación guardada sin acción asociada.';
  });

  protected readonly simulations = computed(() => {
    const query = this.query().trim().toLowerCase();
    const items = this.store.items();
    if (!query) return items;
    return items.filter((sim) => {
      const stock = sim.stock_id ? this.profile.stockById(sim.stock_id) : undefined;
      const haystack = [
        MODEL_CATALOG[sim.model_type].short,
        MODEL_CATALOG[sim.model_type].long,
        stock?.ticker ?? '',
        stock?.name ?? '',
        String(sim.random_seed),
        sim.id,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  });

  protected readonly selected = computed(() => {
    const id = this.selectedId();
    if (!id) return null;
    const fromRun = this.run()?.id === id ? this.run() : null;
    const fromList = this.store.items().find((simulation) => simulation.id === id) ?? null;
    const fetched = this.fetchedSelected();
    return fromRun ?? fromList ?? (fetched?.id === id ? fetched : null);
  });

  protected readonly selectedStockTicker = computed(() => {
    const selected = this.selected();
    if (!selected?.stock_id) return null;
    return this.profile.stockById(selected.stock_id)?.ticker ?? null;
  });

  protected readonly dialogSuspended = computed(() => this.confirming());

  constructor() {
    this.profile.ensureLoaded();

    // Server-side model filter drives the paginated list.
    effect(() => {
      const model = this.modelFilter() ?? null;
      untracked(() => this.store.reload(model));
    });

    effect(() => {
      const id = this.stockParam() ?? null;
      untracked(() => this.stockControl.setValue(id, { emitEvent: false }));
    });

    // Deep link `?sim=`: open creation when absent, detail when present.
    effect(() => {
      const sim = this.simParam() ?? null;
      untracked(() => {
        this.selectedId.set(sim);
        if (sim) this.creating.set(false);
        this.fetchIfMissing(sim);
      });
    });

    this.stockControl.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((id) =>
        this.router.navigate([], {
          queryParams: { stock: id, sim: this.selectedId() },
        }),
      );
  }

  protected stockLabelFor(simulation: SimulationResponse): string {
    if (!simulation.stock_id) return 'Sin acción';
    return this.profile.stockById(simulation.stock_id)?.ticker ?? 'Sin acción';
  }

  protected isSelected(simulation: SimulationResponse): boolean {
    return this.selectedId() === simulation.id;
  }

  protected selectSimulation(simId: string): void {
    this.selectedId.set(simId);
    this.fetchIfMissing(simId);
    this.router.navigate([], {
      queryParams: { stock: this.stockParam() ?? null, sim: simId },
    });
  }

  protected backToList(): void {
    this.selectedId.set(null);
    this.creating.set(false);
    this.router.navigate([], {
      queryParams: { stock: this.stockParam() ?? null, sim: null },
    });
  }

  protected startCreate(): void {
    this.creating.set(true);
    this.selectedId.set(null);
    this.router.navigate([], {
      queryParams: { stock: this.stockParam() ?? null, sim: null },
    });
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
        this.fetchedSelected.set(simulation);
        this.store.prepend(simulation, this.modelFilter() ?? null);
        this.profile.invalidate();
        this.selectSimulation(simulation.id);
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

  protected confirmDeleteSimulation(): void {
    const selected = this.selected();
    if (!selected) return;
    this.confirming.set(true);
    this.confirmation.confirm({
      header: 'Eliminar simulación',
      message: 'Se eliminará esta simulación guardada (DELETE /simulations/{id}).',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonProps: { severity: 'danger' },
      rejectButtonProps: { severity: 'secondary' },
      defaultFocus: 'reject',
      accept: () => {
        this.confirming.set(false);
        this.store.remove(selected.id).subscribe(() => {
          if (this.run()?.id === selected.id) this.run.set(null);
          this.fetchedSelected.set(null);
          this.backToList();
        });
      },
      reject: () => this.confirming.set(false),
    });
  }

  protected retryList(): void {
    this.store.reload(this.modelFilter() ?? null);
  }

  private fetchIfMissing(id: string | null): void {
    if (!id || this.store.items().some((simulation) => simulation.id === id)) return;
    if (this.run()?.id === id || this.fetchedSelected()?.id === id) return;
    this.simulationsApi.get(id).subscribe({
      next: (simulation) => this.fetchedSelected.set(simulation),
      error: () => {},
    });
  }
}
