import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { PasswordModule } from 'primeng/password';

import { AuthApi } from '../../core/api/auth-api';
import { ProfileStore } from '../../core/stocks/profile.store';

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    InputTextModule,
    PasswordModule,
    MessageModule,
  ],
  templateUrl: './login.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  // `?registered=1` after a successful sign-up (router input binding).
  readonly registered = input<string>();

  private readonly authApi = inject(AuthApi);
  private readonly profile = inject(ProfileStore);
  private readonly router = inject(Router);

  protected readonly submitting = signal(false);
  protected readonly submitError = signal<string | null>(null);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  protected showError(control: 'email' | 'password'): boolean {
    const field = this.form.controls[control];
    return field.invalid && field.touched;
  }

  protected onSubmit(): void {
    this.submitError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.authApi.login(this.form.getRawValue()).subscribe({
      next: () => {
        this.submitting.set(false);
        this.profile.clear();
        this.router.navigateByUrl('/stock');
      },
      error: (error: HttpErrorResponse) => {
        this.submitting.set(false);
        this.submitError.set(
          error.status === 401
            ? 'Correo o contraseña incorrectos.'
            : 'No se pudo iniciar sesión. Inténtalo otra vez.',
        );
      },
    });
  }
}
