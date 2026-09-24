import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidatorFn,
} from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { map, startWith } from 'rxjs';

import {
  CreateSimulationPayload,
  MODEL_TYPES,
  ModelType,
  StockWithSimulations,
} from '../../core/api/models';
import {
  BASE_FIELDS,
  BaseKey,
  EXTRA_FIELDS,
  ExtraKey,
  FieldSpec,
  MODELS,
  buildExtraParams,
  isValidValue,
  randomSeed,
} from '../../core/simulation/model-catalog';

export type SimulationDraft = Omit<CreateSimulationPayload, 'stock_id'>;

type NumberGroup<K extends string> = FormGroup<Record<K, FormControl<number | null>>>;

function specValidator(spec: FieldSpec): ValidatorFn {
  return (control: AbstractControl) =>
    isValidValue(spec, control.value as number | null) ? null : { spec: true };
}

function numberGroup<K extends string>(specs: FieldSpec<K>[]): NumberGroup<K> {
  const controls = {} as Record<K, FormControl<number | null>>;
  for (const spec of specs) {
    controls[spec.key] = new FormControl<number | null>(spec.default, specValidator(spec));
  }
  return new FormGroup(controls);
}

// Reactive form for `CreateSimulationPayload` (HANDOFF.md §3, Nueva simulación).
@Component({
  selector: 'app-simulation-form',
  imports: [ReactiveFormsModule, SelectModule, InputNumberModule, ButtonModule],
  templateUrl: './simulation-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex min-h-0 flex-1 flex-col' },
})
export class SimulationForm {
  // Base parameters are prefilled from the selected stock.
  readonly stock = input<StockWithSimulations | undefined>();
  readonly busy = input(false);

  readonly simulate = output<SimulationDraft>();
  // Any edit invalidates the current trajectory.
  readonly edited = output<void>();

  protected readonly baseFields = BASE_FIELDS;
  protected readonly modelOptions = MODEL_TYPES.map((value) => ({
    value,
    label: MODELS[value].option,
  }));

  protected readonly form = new FormGroup({
    model: new FormControl<ModelType>('gbm', { nonNullable: true }),
    base: numberGroup<BaseKey>(BASE_FIELDS),
    merton: numberGroup<ExtraKey>(EXTRA_FIELDS.merton),
    ou: numberGroup<ExtraKey>(EXTRA_FIELDS.ou),
    heston: numberGroup<ExtraKey>(EXTRA_FIELDS.heston),
  });

  protected readonly model = toSignal(this.form.controls.model.valueChanges, {
    initialValue: this.form.controls.model.value,
  });
  protected readonly formula = computed(() => MODELS[this.model()].formula);
  protected readonly extraFields = computed(() => EXTRA_FIELDS[this.model()]);
  protected readonly invalid = toSignal(
    this.form.statusChanges.pipe(
      startWith(this.form.status),
      map((status) => status === 'INVALID'),
    ),
    { initialValue: false },
  );

  constructor() {
    this.form.valueChanges
      .pipe(takeUntilDestroyed(inject(DestroyRef)))
      .subscribe(() => this.edited.emit());

    // Only the selected model's extra_params take part in validation.
    effect(() => {
      const active = this.model();
      untracked(() => {
        for (const model of ['merton', 'ou', 'heston'] as const) {
          const group = this.form.controls[model];
          if (model === active) group.enable({ emitEvent: false });
          else group.disable({ emitEvent: false });
        }
        this.form.updateValueAndValidity();
      });
    });

    effect(() => {
      const stock = this.stock();
      untracked(() => this.applyStockDefaults(stock));
    });
  }

  protected extraGroup(): NumberGroup<ExtraKey> {
    const model = this.model();
    return this.form.controls[model === 'gbm' ? 'merton' : model];
  }

  protected isInvalid(group: 'base' | 'extra', key: string): boolean {
    const target: AbstractControl =
      group === 'base' ? this.form.controls.base : this.extraGroup();
    return target.get(key)?.invalid ?? false;
  }

  protected newSeed(): void {
    this.form.controls.base.controls.random_seed.setValue(randomSeed());
  }

  protected submit(): void {
    if (this.form.invalid || this.busy()) {
      return;
    }
    const model = this.form.controls.model.value;
    const base = this.form.controls.base.getRawValue();
    const extras = model === 'gbm' ? {} : this.form.controls[model].getRawValue();

    this.simulate.emit({
      model_type: model,
      time_horizon: base.time_horizon ?? 1,
      steps: base.steps ?? 1,
      random_seed: base.random_seed ?? 0,
      initial_price: base.initial_price ?? 0,
      drift: base.drift ?? 0,
      volatility: base.volatility ?? 0,
      extra_params: buildExtraParams(model, extras),
    });
  }

  // Keeps the seed, like the design's "Nueva simulación" for a stock.
  private applyStockDefaults(stock: StockWithSimulations | undefined): void {
    const defaults = (key: BaseKey) => BASE_FIELDS.find((field) => field.key === key)!.default;
    const { model: stockModel, ...stockExtras } = stock?.extra_params ?? { model: 'gbm' };
    if (stockModel !== 'gbm') {
      this.form.controls[stockModel].patchValue(stockExtras);
    }
    this.form.patchValue({
      model: stock?.model_type ?? 'gbm',
      base: {
        initial_price: stock?.initial_price ?? defaults('initial_price'),
        drift: stock?.drift ?? defaults('drift'),
        volatility: stock?.volatility ?? defaults('volatility'),
        time_horizon: defaults('time_horizon'),
        steps: defaults('steps'),
      },
    });
  }
}
