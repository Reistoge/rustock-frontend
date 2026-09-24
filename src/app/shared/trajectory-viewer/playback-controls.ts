import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SliderModule } from 'primeng/slider';

import { formatPlain } from '../../core/format/format';
import { PLAYBACK_SPEEDS, PlaybackSpeed } from '../../core/trajectory/playback.service';

const SLIDER_MAX = 1000;

// Presentational: reset, play/pause, position slider, tick label and speed.
@Component({
  selector: 'app-playback-controls',
  imports: [FormsModule, ButtonModule, SliderModule, SelectButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex items-center gap-3' },
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
    <div class="flex min-w-0 flex-1 items-center px-2">
      <p-slider
        class="w-full"
        [min]="0"
        [max]="sliderMax"
        [animate]="false"
        ariaLabel="Posición de la simulación"
        [ngModel]="position()"
        (ngModelChange)="seek.emit($event / sliderMax)"
      />
    </div>
    <span class="min-w-[170px] shrink-0 text-right font-mono text-[13px] text-slate-700">
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

  protected readonly sliderMax = SLIDER_MAX;
  protected readonly position = computed(() => Math.round(this.progress() * SLIDER_MAX));
  protected readonly speedOptions = PLAYBACK_SPEEDS.map((value) => ({
    label: `${formatPlain(value)}×`,
    value,
  }));
}
