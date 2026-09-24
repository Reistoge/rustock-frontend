// Derived from docs/api/openapi.json (components.schemas).

export type ModelType = 'gbm' | 'merton' | 'ou' | 'heston';

export const MODEL_TYPES: readonly ModelType[] = ['gbm', 'merton', 'ou', 'heston'];

export interface GbmParams {
  model: 'gbm';
}

export interface MertonParams {
  model: 'merton';
  jump_intensity: number;
  jump_mean: number;
  jump_volatility: number;
}

export interface OuParams {
  model: 'ou';
  mean_reversion: number;
  reversion_level: number;
}

export interface HestonParams {
  model: 'heston';
  initial_variance: number;
  mean_reversion: number;
  reversion_level: number;
  vol_of_vol: number;
  correlation: number;
}

// Serde `#[serde(tag = "model")]` enum: the `model` field is the discriminator.
export type ModelParams = GbmParams | MertonParams | OuParams | HestonParams;

// `SimulationParamsPayload`: the parameters snapshot inside a SimulationResponse.
export interface SimulationParams {
  initial_price: number;
  drift: number;
  volatility: number;
  extra_params: ModelParams;
}

// Flat body of `POST /simulations`; `extra_params.model` must match `model_type`.
export interface CreateSimulationPayload extends SimulationParams {
  model_type: ModelType;
  time_horizon: number;
  steps: number;
  random_seed: number;
  stock_id?: string | null;
}

// Summary used in `StockWithSimulations.simulations` (no parameters).
export interface SimulationBasic {
  id: string;
  model_type: ModelType;
  time_horizon: number;
  steps: number;
  random_seed: number;
  created_at: string;
  updated_at: string;
}

export interface SimulationResponse extends SimulationBasic {
  stock_id?: string | null;
  parameters: SimulationParams;
}

export interface SimulationQueryFilters {
  model_type?: ModelType;
  limit?: number;
  offset?: number;
}

// `GET /simulations/{id}/ticks` — the engine replays seed + parameters and
// returns the full path (413 when it is too large). Parsed off the main
// thread by the ticks worker.
export interface TicksResponse {
  simulation_id: string;
  model_type: ModelType;
  time_horizon: number;
  steps: number;
  random_seed: number;
  ticks: number[];
  times: number[];
}
