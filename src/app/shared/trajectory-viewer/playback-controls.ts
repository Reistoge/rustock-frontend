import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectButtonModule } from 'primeng/selectbutton';

import { formatPlain } from '../../core/format/format';
import { PLAYBACK_SPEEDS, PlaybackSpeed } from '../../core/trajectory/playback.service';

const STEP = 0.05;

// Compact transport bar: reset, play/pause, ±5% steps, tick label and speed.
// The chart fills the view, so there is no scrub slider; seeking happens
// through the step buttons (emitted as absolute progress via `seek`).
@Component({
  selector: 'app-playback-controls',
  imports: [FormsModule, ButtonModule, SelectButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-wrap items-center gap-2 rounded-xl bg-canvas px-4 py-3' },
  template: `
    <p-button
      icon="pi pi-step-backward"
      severity="secondary"
      ariaLabel="Reiniciar"
      (onClick)="reset.emit()"
    />
    <p-button
      [rounded]="true"
      [icon]="playing() ? 'pi pi-pause' : 'pi pi-play'"
      [ariaLabel]="playing() ? 'Pausar' : 'Reproducir'"
      styleClass="w-14!"
      (onClick)="toggle.emit()"
    />
    <p-button
      icon="pi pi-backward"
      severity="secondary"
      ariaLabel="Retroceder un 5%"
      (onClick)="stepBy(-STEP)"
    />
    <p-button
      icon="pi pi-forward"
      severity="secondary"
      ariaLabel="Avanzar un 5%"
      (onClick)="stepBy(STEP)"
    />
    <span class="min-w-0 flex-1 text-right font-mono text-[13px] text-slate-700">
      {{ label() }}
    </span>
    <div role="group" aria-label="Velocidad de reproducción" class="shrink-0">
      <p-selectbutton
        [options]="speedOptions"
        optionLabel="label"
        optionValue="value"
        [allowEmpty]="false"
        [ngModel]="speed()"
        (ngModelChange)="speedChange.emit($event)"
      />
    </div>
  `,
})
export class PlaybackControls {
  readonly playing = input.required<boolean>();
  readonly progress = input.required<number>();
  readonly speed = input.required<PlaybackSpeed>();
  readonly label = input.required<string>();

  readonly reset = output<void>();
  readonly toggle = output<void>();
  readonly seek = output<number>();
  readonly speedChange = output<PlaybackSpeed>();

  protected readonly STEP = STEP;
  protected readonly speedOptions = PLAYBACK_SPEEDS.map((value) => ({
    label: `${formatPlain(value)}×`,
    value,
  }));

  /** Seeks relative to the current progress, clamped to [0, 1]. */
  protected stepBy(delta: number): void {
    this.seek.emit(Math.min(1, Math.max(0, this.progress() + delta)));
  }
}
