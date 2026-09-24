import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ProfileWithData } from './models';

@Injectable({ providedIn: 'root' })
export class ProfileApi {
  private readonly http = inject(HttpClient);

  get(): Observable<ProfileWithData> {
    return this.http.get<ProfileWithData>(`${environment.apiBaseUrl}/profile`);
  }
}
