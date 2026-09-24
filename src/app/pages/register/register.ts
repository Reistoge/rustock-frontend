import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';

import { AuthApi } from '../../core/api/auth-api';

// Limits mirror the backend: `RegisterInfo` validation (username ≥ 1,
// password ≥ 6) and the `users` columns (name ≤ 100, email ≤ 320).
@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, ButtonModule, InputTextModule, PasswordModule],
  templateUrl: './register.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Register {
  private readonly authApi = inject(AuthApi);
  private readonly router = inject(Router);

  protected readonly submitting = signal(false);
  protected readonly submitError = signal<string | null>(null);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    username: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(320)]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  protected showError(control: 'username' | 'email' | 'password'): boolean {
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
    this.authApi.register(this.form.getRawValue()).subscribe({
      next: () => {
        this.submitting.set(false);
        this.router.navigate(['/login'], { queryParams: { registered: 1 } });
      },
      error: (error: HttpErrorResponse) => {
        this.submitting.set(false);
        this.submitError.set(
          error.status === 409
            ? 'Ya existe una cuenta con ese correo o nombre de usuario.'
            : error.status === 400
              ? 'Revisa los datos: el correo debe ser válido y la contraseña tener al menos 6 caracteres.'
              : 'No se pudo crear la cuenta. Inténtalo otra vez.',
        );
      },
    });
  }
}
