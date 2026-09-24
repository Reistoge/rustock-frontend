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
import { Router, RouterLink } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';

import { ProfileStore } from '../../core/stocks/profile.store';
import { StockFormDialog } from '../../shared/stock-form-dialog/stock-form-dialog';
import { SavedSimulationPanel } from './saved-simulation-panel';
import { SimulationHistory } from './simulation-history';
import { SimulationHistoryStore } from './simulation-history.store';

// /stock/:id?sim=:simId — stock header, saved simulations and the viewer.
@Component({
  selector: 'app-stock-detail',
  imports: [RouterLink, ButtonModule, StockFormDialog, SimulationHistory, SavedSimulationPanel],
  templateUrl: './stock-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [SimulationHistoryStore],
  host: { class: 'flex min-h-0 flex-1 flex-col gap-6' },
})
export class StockDetail {
  // Router input binding: `:id` path param and `?sim=` query param.
  readonly id = input.required<string>();
  readonly sim = input<string>();

  protected readonly profile = inject(ProfileStore);
  protected readonly history = inject(SimulationHistoryStore);
  private readonly confirmation = inject(ConfirmationService);
  private readonly router = inject(Router);

  protected readonly editOpen = signal(false);
  private readonly confirming = signal(false);
  protected readonly dialogOpen = computed(() => this.editOpen() || this.confirming());

  protected readonly stock = computed(() => this.profile.stockById(this.id()));
  protected readonly notFound = computed(
    () => !this.profile.loading() && !this.profile.error() && !this.stock(),
  );

  constructor() {
    this.profile.ensureLoaded();

    effect(() => {
      const id = this.id();
      untracked(() => this.history.reset(id));
    });

    effect(() => {
      const sim = this.sim() ?? null;
      untracked(() => this.history.select(sim));
    });

    // Without `?sim=`, open the most recent simulation once the list arrives.
    effect(() => {
      const first = this.history.items()[0];
      if (!this.sim() && first) {
        untracked(() => this.selectSimulation(first.id, true));
      }
    });
  }

  protected selectSimulation(simId: string | null, replaceUrl = false): void {
    this.router.navigate([], { queryParams: { sim: simId }, replaceUrl });
  }

  protected newSimulation(): void {
    this.router.navigate(['/simulation'], { queryParams: { stock: this.id() } });
  }

  protected confirmDeleteStock(): void {
    const stock = this.stock();
    if (!stock) return;
    this.ask({
      header: `Eliminar ${stock.ticker}`,
      message: 'Se eliminará la acción de tu perfil. Esta acción no se puede deshacer.',
      accept: () =>
        this.profile.remove(stock.id).subscribe(() => this.router.navigateByUrl('/stock')),
    });
  }

  protected confirmDeleteSimulation(): void {
    const selected = this.history.selected();
    if (!selected) return;
    this.ask({
      header: 'Eliminar simulación',
      message: 'Se eliminará esta simulación guardada (DELETE /simulations/{id}).',
      accept: () =>
        this.history.remove(selected.id).subscribe((next) => this.selectSimulation(next, true)),
    });
  }

  private ask(options: { header: string; message: string; accept: () => void }): void {
    this.confirming.set(true);
    this.confirmation.confirm({
      ...options,
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonProps: { severity: 'danger' },
      rejectButtonProps: { severity: 'secondary' },
      defaultFocus: 'reject',
      accept: () => {
        this.confirming.set(false);
        options.accept();
      },
      reject: () => this.confirming.set(false),
    });
  }
}
