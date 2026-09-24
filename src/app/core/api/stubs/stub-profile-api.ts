import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ProfileWithData } from '../models';
import { StubBackend } from './stub-backend';

// Drop-in for `ProfileApi` when USE_STUBS is enabled.
@Injectable({ providedIn: 'root' })
export class StubProfileApi {
  private readonly backend = inject(StubBackend);

  get(): Observable<ProfileWithData> {
    return this.backend.getProfile();
  }
}
