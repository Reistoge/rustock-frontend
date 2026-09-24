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
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import type uPlot from 'uplot';

import { formatPrice, formatReturn, formatYears } from '../../core/format/format';
import { PlaybackService } from '../../core/trajectory/playback.service';
import { TrajectoryStore } from '../../core/trajectory/trajectory.store';
import { UplotChart } from '../uplot-chart/uplot-chart';
import { PlaybackControls } from './playback-controls';
import { ChartDomain, ChartHover, buildTrajectoryChartOptions } from './trajectory-chart-options';

const EMPTY_DATA: uPlot.AlignedData = [new Float64Array(0), new Float64Array(0)];

const IDLE_MESSAGE =
  'Configura el modelo y presiona «Simular y guardar». El servidor calcula la trayectoria ' +
  'y aquí se reproduce en tiempo real.';

// Shared trajectory viewer (HANDOFF.md §5): loads `GET /simulations/{id}/ticks`
// through the worker, then plays it back on uPlot.
@Component({
  selector: 'app-trajectory-viewer',
  imports: [UplotChart, PlaybackControls, ButtonModule, ProgressSpinnerModule],
  templateUrl: './trajectory-viewer.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [TrajectoryStore, PlaybackService],
  host: { class: 'block' },
})
export class TrajectoryViewer {
  readonly simulationId = input<string | null>(null);
  readonly size = input<'compact' | 'large'>('compact');
  readonly showStats = input(false);
  // Pauses playback, e.g. while a dialog is open.
  readonly suspended = input(false);

  protected readonly store = inject(TrajectoryStore);
  protected readonly playback = inject(PlaybackService);
  protected readonly idleMessage = IDLE_MESSAGE;
  protected readonly hover = signal<ChartHover | null>(null);

  private readonly trajectory = this.store.trajectory;
  private readonly lastIndex = computed(() => (this.trajectory()?.ticks.length ?? 1) - 1);

  // Index of the tick under the playback head.
  protected readonly cursor = computed(() => {
    const last = this.lastIndex();
    return last < 1 ? 0 : Math.min(last, Math.max(1, Math.round(this.playback.progress() * last)));
  });

  protected readonly chartData = computed<uPlot.AlignedData>(() => {
    const trajectory = this.trajectory();
    if (!trajectory) {
      return EMPTY_DATA;
    }
    const end = this.cursor() + 1;
    return [trajectory.times.subarray(0, end), trajectory.ticks.subarray(0, end)];
  });

  private readonly domain = computed<ChartDomain | null>(() => {
    const trajectory = this.trajectory();
    if (!trajectory) {
      return null;
    }
    const s0 = trajectory.ticks[0];
    const low = Math.min(trajectory.min, s0);
    const high = Math.max(trajectory.max, s0);
    const pad = (high - low) * 0.08 || Math.max(1, s0 * 0.05);
    const xMax = trajectory.timeHorizon || trajectory.times[trajectory.times.length - 1] || 1;
    return { xMax, yMin: low - pad, yMax: high + pad, s0 };
  });

  // Computed only so `size` is available; app-uplot-chart reads it once.
  protected readonly chartOptions = computed(() =>
    buildTrajectoryChartOptions(
      { domain: () => this.domain(), onHover: (hover) => this.hover.set(hover) },
      this.size() === 'large' ? 380 : 300,
    ),
  );

  protected readonly boxHeight = computed(() =>
    this.size() === 'large' ? 'h-[560px]' : 'h-[420px]',
  );

  protected readonly stats = computed(() => {
    const trajectory = this.trajectory();
    if (!trajectory) {
      return [];
    }
    const first = trajectory.ticks[0];
    const final = trajectory.ticks[trajectory.ticks.length - 1];
    return [
      { label: 'Precio final', value: formatPrice(final) },
      { label: 'Retorno', value: formatReturn(final / first - 1) },
      { label: 'Mínimo', value: formatPrice(trajectory.min) },
      { label: 'Máximo', value: formatPrice(trajectory.max) },
    ];
  });

  // Live legend: follows the mouse when hovering, the playback head otherwise.
  protected readonly legend = computed(() => {
    const trajectory = this.trajectory();
    if (!trajectory) {
      return null;
    }
    const at = this.hover()?.index ?? this.cursor();
    return {
      tick: at,
      time: formatYears(trajectory.times[at]),
      price: formatPrice(trajectory.ticks[at]),
      s0: formatPrice(trajectory.ticks[0]),
    };
  });

  protected readonly tooltip = computed(() => {
    const hover = this.hover();
    const trajectory = this.trajectory();
    if (!hover || !trajectory) {
      return null;
    }
    const i = hover.index;
    return {
      text: `Tick ${i} · t ${formatYears(trajectory.times[i])} a · S ${formatPrice(trajectory.ticks[i])}`,
      left: hover.left,
      top: Math.max(0, hover.top - 44),
      flip: hover.left > hover.width * 0.65,
    };
  });

  protected readonly playbackLabel = computed(() => {
    const trajectory = this.trajectory();
    const at = this.cursor();
    return trajectory
      ? `Tick ${at}/${this.lastIndex()} · S ${formatPrice(trajectory.ticks[at])}`
      : '';
  });

  constructor() {
    effect(() => {
      const id = this.simulationId();
      untracked(() => {
        this.hover.set(null);
        this.store.load(id);
      });
    });

    // Auto-play every newly loaded trajectory.
    effect(() => {
      if (this.store.status() === 'ready') {
        untracked(() => this.playback.restart());
      }
    });

    effect(() => {
      const suspended = this.suspended() || this.store.status() !== 'ready';
      this.playback.suspended.set(suspended);
    });
  }
}
