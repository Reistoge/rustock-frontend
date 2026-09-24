import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { Observable } from 'rxjs';

import { ProfileStore } from '../../core/stocks/profile.store';

// "Agregar acción" (POST /stocks) and "Editar acción" (PATCH /stocks/{id}).
@Component({
  selector: 'app-stock-form-dialog',
  imports: [ReactiveFormsModule, DialogModule, ButtonModule, InputTextModule],
  templateUrl: './stock-form-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockFormDialog {
  readonly visible = model(false);
  readonly mode = input<'add' | 'edit'>('add');
  readonly stockId = input<string | null>(null);
  readonly currentName = input('');
  readonly saved = output<void>();

  private readonly profile = inject(ProfileStore);

  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly isAdd = computed(() => this.mode() === 'add');
  protected readonly title = computed(() => (this.isAdd() ? 'Agregar acción' : 'Editar acción'));
  protected readonly body = computed(() =>
    this.isAdd()
      ? 'Se crea con POST /stocks (ticker y nombre).'
      : 'Solo el nombre se puede cambiar (PATCH /stocks/{id}).',
  );

  // Column limits from the `stocks` table: ticker varchar(10), name varchar(100).
  protected readonly form = inject(FormBuilder).group({
    ticker: ['', [Validators.required, Validators.maxLength(10)]],
    name: ['', [Validators.required, Validators.maxLength(100)]],
  });

  protected onShow(): void {
    this.error.set(null);
    this.form.reset({ ticker: '', name: this.isAdd() ? '' : this.currentName() });
    // Edit only touches the name.
    if (this.isAdd()) {
      this.form.controls.ticker.enable();
    } else {
      this.form.controls.ticker.disable();
    }
  }

  protected close(): void {
    this.visible.set(false);
  }

  protected submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const name = (value.name ?? '').trim();
    const request: Observable<void> = this.isAdd()
      ? this.profile.create({ ticker: (value.ticker ?? '').trim().toUpperCase(), name })
      : this.profile.rename(this.stockId() ?? '', name);

    this.saving.set(true);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.visible.set(false);
        this.saved.emit();
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.error.set(
          error.status === 400
            ? 'El servidor rechazó los datos (400). Revisa los campos.'
            : 'No se pudo guardar. Inténtalo otra vez.',
        );
      },
    });
  }

  protected invalid(key: 'ticker' | 'name'): boolean {
    const control = this.form.controls[key];
    return control.invalid && control.touched;
  }
}
