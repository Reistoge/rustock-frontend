import {
  ApplicationConfig,
  Provider,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';

import { environment } from '../environments/environment';
import { routes } from './app.routes';
import { authInterceptor } from './core/api/auth.interceptor';
import { AuthApi } from './core/api/auth-api';
import { ProfileApi } from './core/api/profile-api';
import { SimulationsApi } from './core/api/simulations-api';
import { StocksApi } from './core/api/stocks-api';
import { StubAuthApi } from './core/api/stubs/stub-auth-api';
import { StubProfileApi } from './core/api/stubs/stub-profile-api';
import { StubSimulationsApi } from './core/api/stubs/stub-simulations-api';
import { StubStocksApi } from './core/api/stubs/stub-stocks-api';
import { PASSTHROUGH } from './core/primeng/passthrough';

// USE_STUBS (see `.env.example`): the `stubs` build configuration swaps
// `environment.ts` for `environment.stubs.ts`, and these providers replace
// the HTTP APIs with the in-memory stubs. Every consumer injects the class
// tokens, so no call site changes.
const stubApiProviders: Provider[] = environment.useStubs
  ? [
      { provide: AuthApi, useClass: StubAuthApi },
      { provide: ProfileApi, useClass: StubProfileApi },
      { provide: StocksApi, useClass: StubStocksApi },
      { provide: SimulationsApi, useClass: StubSimulationsApi },
    ]
  : [];

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideClientHydration(withEventReplay()),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    // Unstyled mode: no theme CSS at all, every component is styled by the
    // Tailwind pass-through preset. `mergeProps` lets a component-level `pt`
    // add classes on top of the global ones instead of replacing them.
    providePrimeNG({
      unstyled: true,
      pt: PASSTHROUGH,
      ptOptions: { mergeSections: true, mergeProps: true },
      ripple: false,
    }),
    ConfirmationService,
    ...stubApiProviders,
  ],
};
