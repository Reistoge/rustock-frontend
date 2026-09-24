import { ChangeDetectionStrategy, Component, afterNextRender, inject, signal } from '@angular/core';
import type uPlot from 'uplot';

import { MockSimulationService } from '../../core/simulation/mock-simulation.service';
import { SimulationDataService } from '../../core/simulation/simulation-data.service';
import { SimulationParameters } from '../../features/simulation/dto/simulation-parameters.dto';
import { ParameterPanel } from '../../features/simulation/parameter-panel/parameter-panel';
import { UplotChart } from '../../shared/uplot-chart/uplot-chart';

const PATH_COLORS = ['#4f46e5', '#059669', '#dc2626'];

const DEFAULT_PARAMETERS: SimulationParameters = {
  drift: 0.05,
  volatility: 0.2,
  steps: 1000,
};

@Component({
  selector: 'app-dashboard',
  imports: [ParameterPanel, UplotChart],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard {
  private readonly mockSimulationService = inject(MockSimulationService);
  private readonly simulationDataService = inject(SimulationDataService);

  protected readonly chartOptions: uPlot.Options = {
    width: 800,
    height: 400,
    series: [
      {},
      ...PATH_COLORS.map((color, i) => ({ label: `Path ${i + 1}`, stroke: color, width: 2 })),
    ],
  };

  protected readonly chartData = signal<uPlot.AlignedData>([[0], [100], [100], [100]]);

  constructor() {
    // The data service spawns a real browser Worker, which doesn't exist
    // during SSR/prerendering — defer the initial load to the browser only.
    afterNextRender(() => this.onParametersChange(DEFAULT_PARAMETERS));
  }

  protected onParametersChange(parameters: SimulationParameters): void {
    const payload = this.mockSimulationService.generate(parameters, { pathCount: PATH_COLORS.length });
    this.simulationDataService.toAlignedData(payload).subscribe((data) => this.chartData.set(data));
  }
}
