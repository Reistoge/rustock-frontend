import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/dashboard/dashboard').then((m) => m.Dashboard),
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then((m) => m.Login),
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register').then((m) => m.Register),
  },
  {path: '**', redirectTo: '/login'},
];
