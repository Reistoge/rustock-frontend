import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { Trajectory } from './trajectory.model';
import { TicksWorkerRequest, TicksWorkerResponse } from './ticks.worker';

@Injectable({ providedIn: 'root' })
export class TicksParserService {
  // One short-lived worker per payload; unsubscribing terminates it, so a
  // superseded request never delivers a stale trajectory.
  parse(json: string): Observable<Trajectory> {
    return new Observable<Trajectory>((subscriber) => {
      const worker = new Worker(new URL('./ticks.worker', import.meta.url), { type: 'module' });

      worker.onmessage = ({ data }: MessageEvent<TicksWorkerResponse>) => {
        if (data.ok) {
          const { simulationId, times, ticks, timeHorizon, steps, min, max } = data;
          subscriber.next({ simulationId, times, ticks, timeHorizon, steps, min, max });
          subscriber.complete();
        } else {
          subscriber.error(new Error(data.message));
        }
      };
      worker.onerror = (event) => subscriber.error(new Error(event.message));

      const request: TicksWorkerRequest = { json };
      worker.postMessage(request);

      return () => worker.terminate();
    });
  }
}
