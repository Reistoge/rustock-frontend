import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { catchError, of } from 'rxjs';

import { AuthApi } from '../core/api/auth-api';
import { SessionStore } from '../core/auth/session.store';
import { ProfileStore } from '../core/stocks/profile.store';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ButtonModule, ConfirmDialogModule],
  templateUrl: './app-shell.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex h-screen overflow-hidden' },
})
export class AppShell {
  private readonly authApi = inject(AuthApi);
  private readonly session = inject(SessionStore);
  private readonly profile = inject(ProfileStore);
  private readonly router = inject(Router);

  protected readonly sideOpen = signal(true);
  protected readonly email = this.session.email;

  // `GET /user/info` answers text; fall back to the email's local part.
  private readonly info = toSignal(this.authApi.info().pipe(catchError(() => of(''))), {
    initialValue: '',
  });

  protected readonly displayName = computed(
    () => this.info().trim() || this.email().split('@')[0] || 'Usuario',
  );

  protected readonly initials = computed(() =>
    this.displayName()
      .replace(/[^\p{L}\p{N}]/gu, '')
      .slice(0, 2)
      .toUpperCase(),
  );

  protected readonly navItems = [
    { path: '/stock', label: 'Stock', icon: 'pi pi-th-large' },
    { path: '/simulation', label: 'Simulation', icon: 'pi pi-chart-line' },
  ];

  protected toggleSide(): void {
    this.sideOpen.update((open) => !open);
  }

  protected logout(): void {
    this.authApi.logout();
    this.profile.clear();
    this.router.navigateByUrl('/login');
  }
}
