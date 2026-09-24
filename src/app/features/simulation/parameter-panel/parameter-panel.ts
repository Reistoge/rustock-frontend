import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { InputNumber } from 'primeng/inputnumber';
import { Slider } from 'primeng/slider';
import { debounceTime } from 'rxjs';

import { SimulationParameters } from '../dto/simulation-parameters.dto';

// Unstyled PrimeNG components render with no built-in CSS at all — these
// pass-through classes are what make the slider track/handle actually visible.
const SLIDER_PT = {
  root: 'relative h-2 w-full rounded-full bg-slate-200',
  range: 'absolute h-2 rounded-full bg-indigo-500',
  handle: 'absolute h-4 w-4 -mt-1.5 rounded-full border-2 border-indigo-500 bg-white shadow cursor-pointer',
};

const INPUT_NUMBER_PT = {
  pcInputText: {
    root: 'w-28 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200',
  },
};

@Component({
  selector: 'app-parameter-panel',
  imports: [ReactiveFormsModule, Slider, InputNumber],
  templateUrl: './parameter-panel.html',
  styleUrl: './parameter-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParameterPanel {
  protected readonly sliderPt = SLIDER_PT;
  protected readonly inputNumberPt = INPUT_NUMBER_PT;

  readonly parametersChange = output<SimulationParameters>();

  private readonly formBuilder = new FormBuilder();

  protected readonly form = this.formBuilder.nonNullable.group({
    drift: [0.05],
    volatility: [0.2],
    steps: [1000],
  });

  constructor() {
    this.form.valueChanges
      .pipe(debounceTime(150), takeUntilDestroyed())
      .subscribe((value) => this.parametersChange.emit(value as SimulationParameters));
  }
}
