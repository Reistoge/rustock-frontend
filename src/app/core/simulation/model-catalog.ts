import { ModelParams, ModelType, SimulationResponse } from '../api/models';
import { formatPlain } from '../format/format';

export interface ModelInfo {
  short: string;
  long: string;
  option: string;
  // Informational only (HANDOFF.md §4): the engine does the math.
  formula: string;
}

export const MODELS: Record<ModelType, ModelInfo> = {
  gbm: {
    short: 'GBM',
    long: 'Browniano geométrico (GBM)',
    option: 'GBM · Browniano geométrico',
    formula: 'dS = μ·S dt + σ·S dW',
  },
  merton: {
    short: 'Merton',
    long: 'Merton · difusión con saltos',
    option: 'Merton · Saltos',
    formula: 'dS = μ·S dt + σ·S dW + S·(J − 1) dN\nN ~ Poisson(λ),  ln J ~ N(m, δ²)',
  },
  ou: {
    short: 'Ornstein-Uhlenbeck',
    long: 'Ornstein-Uhlenbeck · reversión a la media',
    option: 'OU · Reversión a la media',
    formula: 'dS = κ·(L − S) dt + σ·S dW',
  },
  heston: {
    short: 'Heston',
    long: 'Heston · volatilidad estocástica',
    option: 'Heston · Volatilidad estocástica',
    formula: 'dS = μ·S dt + √v·S dW₁\ndv = κ·(θ − v) dt + ξ·√v dW₂,  ρ = corr(W₁, W₂)',
  },
};

export type ExtraKey =
  | 'jump_intensity'
  | 'jump_mean'
  | 'jump_volatility'
  | 'mean_reversion'
  | 'reversion_level'
  | 'initial_variance'
  | 'vol_of_vol'
  | 'correlation';

export interface FieldSpec<K extends string = string> {
  key: K;
  label: string;
  default: number;
  min?: number;
  max?: number;
  integer?: boolean;
  exclusiveMin?: boolean;
}

// `extra_params` per model, matching the backend's tagged `ModelParams` enum.
export const EXTRA_FIELDS: Record<ModelType, FieldSpec<ExtraKey>[]> = {
  gbm: [],
  merton: [
    { key: 'jump_intensity', label: 'Intensidad λ', default: 5, min: 0 },
    { key: 'jump_mean', label: 'Media salto m', default: -0.05 },
    { key: 'jump_volatility', label: 'Vol. salto δ', default: 0.1, min: 0 },
  ],
  ou: [
    { key: 'mean_reversion', label: 'Reversión κ', default: 3, min: 0 },
    { key: 'reversion_level', label: 'Nivel L', default: 120 },
  ],
  heston: [
    { key: 'initial_variance', label: 'Varianza v₀', default: 0.04, min: 0 },
    { key: 'mean_reversion', label: 'Reversión κ', default: 2, min: 0 },
    { key: 'reversion_level', label: 'Nivel θ', default: 0.04, min: 0 },
    { key: 'vol_of_vol', label: 'Vol. de vol ξ', default: 0.5, min: 0 },
    { key: 'correlation', label: 'Correlación ρ', default: -0.7, min: -1, max: 1 },
  ],
};

export type BaseKey =
  | 'initial_price'
  | 'drift'
  | 'volatility'
  | 'time_horizon'
  | 'steps'
  | 'random_seed';

// Validation from HANDOFF.md §3: S₀ > 0, T > 0, pasos entero ≥ 1,
// semilla entero ≥ 0, σ ≥ 0.
export const BASE_FIELDS: FieldSpec<BaseKey>[] = [
  { key: 'initial_price', label: 'Precio inicial S₀', default: 100, min: 0, exclusiveMin: true },
  { key: 'drift', label: 'Tendencia μ', default: 0.1 },
  { key: 'volatility', label: 'Volatilidad σ', default: 0.2, min: 0 },
  { key: 'time_horizon', label: 'Horizonte T (años)', default: 1, min: 0, exclusiveMin: true },
  { key: 'steps', label: 'Pasos', default: 252, min: 1, integer: true },
  { key: 'random_seed', label: 'Semilla', default: 42, min: 0, integer: true },
];

export function isValidValue(spec: FieldSpec, value: number | null): boolean {
  if (value === null || !Number.isFinite(value)) return false;
  if (spec.integer && !Number.isInteger(value)) return false;
  if (spec.min !== undefined && (spec.exclusiveMin ? value <= spec.min : value < spec.min)) {
    return false;
  }
  return spec.max === undefined || value <= spec.max;
}

export function buildExtraParams(
  model: ModelType,
  values: Partial<Record<ExtraKey, number | null>>,
): ModelParams {
  const params: Record<string, number | string> = { model };
  for (const field of EXTRA_FIELDS[model]) {
    params[field.key] = values[field.key] ?? field.default;
  }
  return params as unknown as ModelParams;
}

// Tiles for a saved simulation: S₀, μ, σ and the model's extra_params.
export function parameterTiles(sim: SimulationResponse): { label: string; value: string }[] {
  const { parameters } = sim;
  const extras = parameters.extra_params as unknown as Record<string, number | undefined>;
  return [
    { label: 'S₀', value: formatPlain(parameters.initial_price) },
    { label: 'μ', value: formatPlain(parameters.drift) },
    { label: 'σ', value: formatPlain(parameters.volatility) },
    ...EXTRA_FIELDS[sim.model_type].map((field) => ({
      label: field.label,
      value: formatPlain(extras[field.key]),
    })),
  ];
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 1_000_000);
}
