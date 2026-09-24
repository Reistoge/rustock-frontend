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
import { formatPlain } from '../../core/format/format';
import { ProfileStore } from '../../core/stocks/profile.store';
import { TrajectoryViewer } from '../../shared/trajectory-viewer/trajectory-viewer';
import { SimulationDraft, SimulationForm } from './simulation-form';

// /simulation?stock=:id — "Simular y guardar": POST /simulations, then the
// viewer loads GET /simulations/{id}/ticks and plays it back.
@Component({
  selector: 'app-new-simulation',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    SelectModule,
    SplitterModule,
    MessageModule,
    SimulationForm,
    TrajectoryViewer,
  ],
  templateUrl: './new-simulation.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex min-h-0 flex-1 flex-col gap-5' },
})
export class NewSimulation {
  // `?stock=` query param (router input binding).
  readonly stockParam = input<string>(undefined, { alias: 'stock' });

  protected readonly profile = inject(ProfileStore);
  private readonly simulationsApi = inject(SimulationsApi);
  private readonly router = inject(Router);

  protected readonly stockControl = new FormControl<string | null>(null);
  protected readonly run = signal<SimulationResponse | null>(null);
  protected readonly saving = signal(false);
  protected readonly saveError = signal<string | null>(null);

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

  constructor() {
    this.profile.ensureLoaded();

    effect(() => {
      const id = this.stockParam() ?? null;
      untracked(() => this.stockControl.setValue(id, { emitEvent: false }));
    });

    this.stockControl.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((id) => this.router.navigate([], { queryParams: { stock: id } }));
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
        this.profile.invalidate();
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
}
