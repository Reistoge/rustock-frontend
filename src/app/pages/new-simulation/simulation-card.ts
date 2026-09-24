import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { SimulationResponse } from '../../core/api/models';
import { formatDate, formatPlain, simulationSummary } from '../../core/format/format';
import { MODELS } from '../../core/simulation/model-catalog';

// Card of the "Simulaciones" grid. Same visual language as `StockCard`:
// title + badges on top, key parameters at the bottom. It is a <button>
// (with aria-pressed) because selection shows the charts in the same page.
@Component({
  selector: 'app-simulation-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0' },
  template: `
    <button
      type="button"
      class="flex h-full min-h-[196px] w-full flex-col justify-between gap-4 rounded-[14px] border bg-white px-6 py-6 text-left text-ink transition-[border-color,box-shadow] hover:border-brand hover:shadow-[0_6px_20px_rgba(22,24,29,0.08)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:px-8 sm:py-[26px]"
      [class]="selected() ? 'border-brand bg-brand-soft' : 'border-line'"
      [attr.aria-pressed]="selected()"
      [attr.aria-label]="ariaLabel()"
    >
      <div class="flex w-full items-start justify-between gap-4">
        <div class="flex min-w-0 flex-col gap-1">
          <span class="truncate text-[22px] font-semibold tracking-tight sm:text-[28px]">
            {{ modelShort() }}
          </span>
          <div class="flex flex-wrap items-center gap-2.5">
            <span class="font-mono text-[15px] text-muted">{{ stockLabel() }}</span>
            <span
              class="flex h-[22px] items-center rounded-md bg-canvas px-2 font-mono text-xs font-medium text-body"
            >
              {{ modelTag() }}
            </span>
          </div>
        </div>
        <span
          class="flex h-[30px] shrink-0 items-center gap-1.5 rounded-full bg-brand-soft px-3 text-[13px] font-medium text-brand-dark"
        >
          <i class="pi pi-chart-line text-sm" aria-hidden="true"></i>
          {{ date() }}
        </span>
      </div>
      <div class="flex w-full flex-wrap items-baseline gap-x-8 gap-y-1 text-base">
        <span
          >S₀: <span class="font-mono font-medium">{{ s0() }}</span></span
        >
        <span
          >Volatilidad: <span class="font-mono font-medium">{{ volatility() }}</span></span
        >
        <span
          >Tendencia: <span class="font-mono font-medium">{{ drift() }}</span></span
        >
        <span class="ml-auto text-sm font-medium text-brand">Ver charts →</span>
      </div>
      <span class="font-mono text-[13px] text-muted">{{ summary() }}</span>
    </button>
  `,
})
export class SimulationCard {
  readonly simulation = input.required<SimulationResponse>();
  readonly stockLabel = input<string>('Sin acción');
  readonly selected = input(false);

  protected readonly modelShort = computed(() => MODELS[this.simulation().model_type].short);
  protected readonly modelTag = computed(() => MODELS[this.simulation().model_type].short);
  protected readonly date = computed(() => formatDate(this.simulation().created_at));
  protected readonly summary = computed(() => simulationSummary(this.simulation()));
  protected readonly s0 = computed(() => formatPlain(this.simulation().parameters.initial_price));
  protected readonly volatility = computed(() => formatPlain(this.simulation().parameters.volatility));
  protected readonly drift = computed(() => formatPlain(this.simulation().parameters.drift));
  protected readonly ariaLabel = computed(() => {
    const sim = this.simulation();
    return `Ver simulación ${MODELS[sim.model_type].short} del ${formatDate(sim.created_at)}`;
  });
}
