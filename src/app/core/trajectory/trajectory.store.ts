import { HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { Subscription, switchMap } from 'rxjs';

import { SimulationsApi } from '../api/simulations-api';
import { TicksParserService } from './ticks-parser.service';
import { Trajectory, TrajectoryStatus, trajectoryError } from './trajectory.model';

// Loading state of one trajectory viewer. Provided per component instance,
// so the detail page and Nueva simulación never share a trajectory.
@Injectable()
export class TrajectoryStore {
  private readonly api = inject(SimulationsApi);
  private readonly parser = inject(TicksParserService);
  private request?: Subscription;

  readonly simulationId = signal<string | null>(null);
  readonly status = signal<TrajectoryStatus>('idle');
  readonly trajectory = signal<Trajectory | null>(null);
  private readonly errorStatus = signal<number | null>(null);

  readonly error = computed(() => trajectoryError(this.errorStatus()));

  constructor() {
    inject(DestroyRef).onDestroy(() => this.request?.unsubscribe());
  }

  load(simulationId: string | null): void {
    this.request?.unsubscribe();
    this.simulationId.set(simulationId);
    this.trajectory.set(null);
    this.errorStatus.set(null);

    if (!simulationId) {
      this.status.set('idle');
      return;
    }

    this.status.set('loading');
    this.request = this.api
      .ticksJson(simulationId)
      .pipe(switchMap((json) => this.parser.parse(json)))
      .subscribe({
        next: (trajectory) => {
          this.trajectory.set(trajectory);
          this.status.set('ready');
        },
        error: (error: unknown) => {
          this.errorStatus.set(error instanceof HttpErrorResponse ? error.status : null);
          this.status.set('error');
        },
      });
  }

  retry(): void {
    this.load(this.simulationId());
  }
}
