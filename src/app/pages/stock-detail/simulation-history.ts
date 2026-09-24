import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';

import { SimulationResponse } from '../../core/api/models';
import { formatDate, simulationSummary } from '../../core/format/format';
import { MODELS } from '../../core/simulation/model-catalog';

// Presentational: "Simulaciones guardadas (N)" list with "Cargar más".
@Component({
  selector: 'app-simulation-history',
  imports: [ButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex min-h-0 w-[360px] shrink-0 flex-col gap-3' },
  template: `
    <h2 class="m-0 text-base font-semibold">
      Simulaciones guardadas
      <span class="font-mono font-medium text-muted">({{ rows().length }})</span>
    </h2>
    <div class="flex min-h-0 flex-col gap-2.5 overflow-y-auto p-0.5">
      @for (row of rows(); track row.id) {
        <button
          type="button"
          class="flex w-full flex-col gap-2 rounded-xl border px-[18px] py-4 text-left text-ink transition-colors hover:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          [class]="row.id === selectedId() ? 'border-brand bg-brand-soft' : 'border-line bg-white'"
          [attr.aria-pressed]="row.id === selectedId()"
          (click)="selectSimulation.emit(row.id)"
        >
          <span class="flex w-full items-baseline justify-between gap-3">
            <span class="text-[15px] font-semibold">{{ row.model }}</span>
            <span class="text-[13px] text-muted">{{ row.date }}</span>
          </span>
          <span class="font-mono text-[13px] text-body">{{ row.summary }}</span>
        </button>
      }

      @if (hasMore()) {
        <p-button
          label="Cargar más"
          variant="text"
          size="small"
          styleClass="w-full border! border-dashed! border-line-strong! text-body!"
          [loading]="loading()"
          (onClick)="loadMore.emit()"
        />
      }

      @if (error(); as message) {
        <p class="m-0 text-sm text-danger" role="alert">{{ message }}</p>
      } @else if (!loading() && rows().length === 0) {
        <div class="flex flex-col gap-2 rounded-xl border border-dashed border-line-strong px-5 py-6">
          <span class="text-[15px] font-semibold">Aún no hay simulaciones</span>
          <span class="text-sm text-muted">
            Crea una simulación para esta acción y quedará guardada aquí.
          </span>
        </div>
      }
    </div>
  `,
})
export class SimulationHistory {
  readonly simulations = input.required<SimulationResponse[]>();
  readonly selectedId = input<string | null>(null);
  readonly loading = input(false);
  readonly hasMore = input(false);
  readonly error = input<string | null>(null);

  readonly selectSimulation = output<string>();
  readonly loadMore = output<void>();

  protected readonly rows = computed(() =>
    this.simulations().map((simulation) => ({
      id: simulation.id,
      model: MODELS[simulation.model_type].short,
      date: formatDate(simulation.created_at),
      summary: simulationSummary(simulation),
    })),
  );
}
