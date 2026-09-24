// Number and date formatting for the UI (es-CL: decimal comma).

const LOCALE = 'es-CL';

const priceFormat = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const plainFormat = new Intl.NumberFormat(LOCALE, {
  maximumFractionDigits: 6,
  useGrouping: false,
});

const dateFormat = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

// 108.214 → "108,21"
export function formatPrice(value: number): string {
  return priceFormat.format(value);
}

// 0.4 → "0,4" (parameters as the user typed them)
export function formatPlain(value: number | null | undefined): string {
  return value === null || value === undefined || Number.isNaN(value)
    ? '—'
    : plainFormat.format(value);
}

// 0.48 → "0,480" (tooltip / legend time)
export function formatYears(value: number, digits = 3): string {
  return value.toFixed(digits).replace('.', ',');
}

// 0.0821 → "+8,2%"
export function formatReturn(ratio: number): string {
  const percent = ratio * 100;
  return `${percent >= 0 ? '+' : ''}${percent.toFixed(1).replace('.', ',')}%`;
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : dateFormat.format(date);
}

export function simulationSummary(sim: {
  time_horizon: number;
  steps: number;
  random_seed: number;
}): string {
  return `T ${formatPlain(sim.time_horizon)} a · ${sim.steps} pasos · seed ${sim.random_seed}`;
}
