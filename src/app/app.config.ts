import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';

import { routes } from './app.routes';
import { authInterceptor } from './core/api/auth.interceptor';
import { PASSTHROUGH } from './core/primeng/passthrough';

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
  ],
};
