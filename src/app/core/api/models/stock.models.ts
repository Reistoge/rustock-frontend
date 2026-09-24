import { ModelParams, ModelType, SimulationBasic } from './simulation.models';

// Derived from docs/api/openapi.json (components.schemas).

export interface CreateStockPayload {
  ticker: string;
  name: string;
}

export interface UpdateStockPayload {
  name?: string | null;
}

export interface StockResponse {
  id: string;
  ticker: string;
  name: string;
  profile_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface StockWithSimulations {
  id: string;
  ticker: string;
  name: string;
  model_type: ModelType;
  initial_price: number;
  drift: number;
  volatility: number;
  extra_params: ModelParams;
  simulations: SimulationBasic[];
}

export interface ProfileWithData {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  stocks: StockWithSimulations[];
}

export interface StockQueryFilters {
  limit?: number;
  offset?: number;
}
