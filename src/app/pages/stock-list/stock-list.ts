import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

import { ProfileStore } from '../../core/stocks/profile.store';
import { StockFormDialog } from '../../shared/stock-form-dialog/stock-form-dialog';
import { StockCard } from './stock-card';

// "Mis simulaciones": the profile's stocks (GET /profile), filtered client-side.
@Component({
  selector: 'app-stock-list',
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    ProgressSpinnerModule,
    StockCard,
    StockFormDialog,
  ],
  templateUrl: './stock-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-6' },
})
export class StockList {
  protected readonly profile = inject(ProfileStore);
  protected readonly addOpen = signal(false);

  protected readonly search = new FormControl('', { nonNullable: true });
  private readonly query = toSignal(this.search.valueChanges, { initialValue: '' });

  protected readonly stocks = computed(() => {
    const query = this.query().trim().toLowerCase();
    const stocks = this.profile.stocks();
    return query
      ? stocks.filter(
          (stock) =>
            stock.name.toLowerCase().includes(query) || stock.ticker.toLowerCase().includes(query),
        )
      : stocks;
  });

  constructor() {
    this.profile.ensureLoaded();
  }
}
