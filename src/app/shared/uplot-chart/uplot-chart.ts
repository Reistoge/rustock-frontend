import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  effect,
  input,
  viewChild,
} from '@angular/core';
import uPlot from 'uplot';

// The only place uPlot is instantiated (RULES.md §4). The chart is created
// once; later data changes go through `setData()`, and width follows the
// container through a ResizeObserver.
@Component({
  selector: 'app-uplot-chart',
  template: '<div #container class="w-full overflow-hidden"></div>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-full' },
})
export class UplotChart implements OnDestroy {
  // Read once, at creation: uPlot can't reconfigure series/axes in place.
  readonly options = input.required<uPlot.Options>();
  readonly data = input.required<uPlot.AlignedData>();

  private readonly container = viewChild.required<ElementRef<HTMLDivElement>>('container');
  private chart: uPlot | undefined;
  private resizeObserver: ResizeObserver | undefined;

  constructor() {
    // Browser only: afterNextRender never runs during SSR/prerendering.
    afterNextRender(() => {
      const element = this.container().nativeElement;
      const options = this.options();
      this.chart = new uPlot(
        { ...options, width: element.clientWidth || options.width },
        this.data(),
        element,
      );

      this.resizeObserver = new ResizeObserver(([entry]) => {
        const width = Math.floor(entry.contentRect.width);
        // Width is 0 while the chart is hidden (loading/error states).
        if (this.chart && width > 0 && width !== this.chart.width) {
          this.chart.setSize({ width, height: this.chart.height });
        }
      });
      this.resizeObserver.observe(element);
    });

    effect(() => {
      const data = this.data();
      this.chart?.setData(data);
    });
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.chart?.destroy();
  }
}
