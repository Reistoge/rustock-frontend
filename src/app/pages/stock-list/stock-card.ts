import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { StockWithSimulations } from '../../core/api/models';
import { formatPlain } from '../../core/format/format';
import { MODELS } from '../../core/simulation/model-catalog';

// One tile of the "Mis simulaciones" grid; the whole card links to the detail.
@Component({
  selector: 'app-stock-card',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a
      [routerLink]="['/stock', stock().id]"
      class="flex h-[196px] flex-col justify-between rounded-[14px] border border-line bg-white px-8 py-[26px] text-ink no-underline transition-[border-color,box-shadow] hover:border-brand hover:text-ink hover:shadow-[0_6px_20px_rgba(22,24,29,0.08)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      <div class="flex w-full items-start justify-between gap-4">
        <div class="flex min-w-0 flex-col gap-1">
          <span class="truncate text-[28px] font-semibold tracking-tight">{{ stock().name }}</span>
          <div class="flex items-center gap-2.5">
            <span class="font-mono text-[15px] text-muted">{{ stock().ticker }}</span>
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
          {{ countText() }}
        </span>
      </div>
      <div class="flex w-full items-baseline gap-8 whitespace-nowrap text-base">
        <span>S₀: <span class="font-mono font-medium">{{ s0() }}</span></span>
        <span>Volatilidad: <span class="font-mono font-medium">{{ volatility() }}</span></span>
        <span>Tendencia: <span class="font-mono font-medium">{{ drift() }}</span></span>
        <span class="ml-auto text-sm font-medium text-brand">Ver →</span>
      </div>
    </a>
  `,
})
export class StockCard {
  readonly stock = input.required<StockWithSimulations>();

  // A stock created with POST /stocks has no model yet (HANDOFF.md §7.4).
  protected readonly modelTag = computed(() => {
    const model = this.stock().model_type;
    return model ? MODELS[model].short : 'Sin modelo';
  });

  protected readonly countText = computed(() => {
    const count = this.stock().simulations?.length ?? 0;
    return count === 1 ? '1 simulación' : `${count} simulaciones`;
  });

  protected readonly s0 = computed(() => formatPlain(this.stock().initial_price));
  protected readonly volatility = computed(() => formatPlain(this.stock().volatility));
  protected readonly drift = computed(() => formatPlain(this.stock().drift));
}
