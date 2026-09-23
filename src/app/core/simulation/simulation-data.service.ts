import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type uPlot from 'uplot';

import { SimulationResultPayload } from './dto/simulation-result.dto';
import {
  SimulationDataWorkerRequest,
  SimulationDataWorkerResponse,
} from './simulation-data.worker';

@Injectable({ providedIn: 'root' })
export class SimulationDataService {
  // Parses a raw simulation result payload into uPlot's `AlignedData` shape
  // ([timestamps, path1, path2, ...] as Float64Arrays) on a Web Worker, so
  // large payloads never block the UI thread.
  toAlignedData(payload: SimulationResultPayload): Observable<uPlot.AlignedData> {
    return new Observable((subscriber) => {
      const worker = new Worker(new URL('./simulation-data.worker', import.meta.url));

      worker.onmessage = ({ data }: MessageEvent<SimulationDataWorkerResponse>) => {
        subscriber.next(data.series as uPlot.AlignedData);
        subscriber.complete();
      };

      worker.onerror = (error) => {
        subscriber.error(error);
      };

      const request: SimulationDataWorkerRequest = { json: JSON.stringify(payload) };
      worker.postMessage(request);

      return () => worker.terminate();
    });
  }
}
