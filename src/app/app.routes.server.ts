import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Public pages are static and safe to prerender.
  { path: 'login', renderMode: RenderMode.Prerender },
  { path: 'register', renderMode: RenderMode.Prerender },
  // Everything else needs the JWT from localStorage, uPlot, Web Workers and
  // requestAnimationFrame — all browser-only — so it renders on the client.
  { path: '**', renderMode: RenderMode.Client },
];
