import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { providePrimeNG } from 'primeng/config';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    provideHttpClient(withFetch()),
    // No `theme` preset: components are styled via Tailwind utilities.
    // The global `unstyled` flag is still experimental in this PrimeNG
    // version, so pass `[unstyled]="true"` on each component we use instead.
    providePrimeNG({ ripple: true }),
  ]
};
