import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';

import { SimulationResponse } from '../../core/api/models';
import { formatDate, formatPlain } from '../../core/format/format';
import { MODELS, parameterTiles } from '../../core/simulation/model-catalog';
import { TrajectoryViewer } from '../../shared/trajectory-viewer/trajectory-viewer';

// Right-hand panel of the detail page: selected simulation + its trajectory.
@Component({
  selector: 'app-saved-simulation-panel',
  imports: [ButtonModule, TrajectoryViewer],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-4' },
  template: `
    <div class="flex items-start justify-between gap-4">
      <div class="flex flex-col gap-1">
        <h2 class="m-0 text-lg font-semibold">{{ title() }}</h2>
        <span class="font-mono text-[13px] text-muted">{{ meta() }}</span>
      </div>
      <p-button
        icon="pi pi-trash"
        severity="danger"
        [outlined]="true"
        size="small"
        ariaLabel="Eliminar simulación"
        (onClick)="deleteSimulation.emit()"
      />
    </div>

    <div class="grid grid-cols-5 gap-2">
      @for (tile of tiles(); track tile.label) {
        <div class="flex flex-col gap-0.5 rounded-[10px] bg-canvas px-3 py-2.5">
          <span class="text-xs text-muted">{{ tile.label }}</span>
          <span class="font-mono text-base font-medium">{{ tile.value }}</span>
        </div>
      }
    </div>

    <app-trajectory-viewer [simulationId]="simulation().id" [suspended]="suspended()" />
  `,
})
export class SavedSimulationPanel {
  readonly simulation = input.required<SimulationResponse>();
  readonly suspended = input(false);
  readonly deleteSimulation = output<void>();

  protected readonly title = computed(() => MODELS[this.simulation().model_type].long);
  protected readonly tiles = computed(() => parameterTiles(this.simulation()));
  protected readonly meta = computed(() => {
    const sim = this.simulation();
    return (
      `T ${formatPlain(sim.time_horizon)} años · ${sim.steps} pasos · ` +
      `seed ${sim.random_seed} · ${formatDate(sim.created_at)}`
    );
  });
}
