import { Routes } from '@angular/router';

import { authGuard, guestGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/login/login').then((m) => m.Login),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/register/register').then((m) => m.Register),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/app-shell').then((m) => m.AppShell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'stock' },
      {
        path: 'stock',
        loadComponent: () => import('./pages/stock-list/stock-list').then((m) => m.StockList),
      },
      {
        path: 'stock/:id',
        loadComponent: () =>
          import('./pages/stock-detail/stock-detail').then((m) => m.StockDetail),
      },
      {
        path: 'simulation',
        loadComponent: () =>
          import('./pages/new-simulation/new-simulation').then((m) => m.NewSimulation),
      },
    ],
  },
  { path: '**', redirectTo: '/login' },
];
