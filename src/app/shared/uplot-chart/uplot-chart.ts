import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  effect,
  input,
  viewChild,
} from '@angular/core';
import uPlot from 'uplot';

@Component({
  selector: 'app-uplot-chart',
  template: '<div #container class="w-full"></div>',
  styleUrl: './uplot-chart.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UplotChart {
  // `options` is only read once, at chart creation — uPlot doesn't support
  // reconfiguring series/axes on an existing instance, only its data.
  readonly options = input.required<uPlot.Options>();
  readonly data = input.required<uPlot.AlignedData>();

  private readonly container = viewChild.required<ElementRef<HTMLDivElement>>('container');
  private chart: uPlot | undefined;

  constructor() {
    afterNextRender(() => {
      this.chart = new uPlot(this.options(), this.data(), this.container().nativeElement);
    });

    effect(() => {
      this.chart?.setData(this.data());
    });
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }
}
