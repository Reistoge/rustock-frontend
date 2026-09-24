import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, delay, of, throwError } from 'rxjs';

import {
  CreateSimulationPayload,
  CreateStockPayload,
  LoginInfo,
  LoginResponse,
  ModelType,
  ProfileWithData,
  RegisterInfo,
  RegisterResponse,
  SimulationBasic,
  SimulationQueryFilters,
  SimulationResponse,
  StockQueryFilters,
  StockResponse,
  StockWithSimulations,
  TicksResponse,
  UpdateStockPayload,
} from '../models';

// Simulated latency so loading states stay visible while developing offline.
const STUB_LATENCY_MS = 250;
// Guards the UI thread: trajectories replay through the ticks worker, but a
// hostile `steps` value would still allocate a huge array here.
const MAX_STUB_STEPS = 20_000;

interface SeedSimulation {
  id: string;
  model: ModelType;
  seed: number;
  steps: number;
  horizon: number;
  createdDaysAgo: number;
}

// In-memory stand-in for the Rust backend (USE_STUBS, see `.env.example`).
// Keeps the same shapes, pagination (`limit`/`offset`), `model_type` filter
// and `HttpErrorResponse` statuses as the real HTTP APIs, so every consumer
// (stores, guards, viewers) behaves identically with stubs enabled.
@Injectable({ providedIn: 'root' })
export class StubBackend {
  private counter = 0;
  private readonly profileId = 'stub-profile-1';
  private readonly userId = 'stub-user-1';
  private readonly stocks: StockWithSimulations[] = [];
  private readonly simulations = new Map<string, SimulationResponse>();

  constructor() {
    this.seedStock({
      id: 'stub-stock-1',
      ticker: 'ACME',
      name: 'Acme Corp',
      model: 'gbm',
      initialPrice: 100,
      drift: 0.08,
      volatility: 0.2,
      extra: { model: 'gbm' },
      createdDaysAgo: 12,
      simulations: [
        { id: 'stub-sim-1', model: 'gbm', seed: 42, steps: 252, horizon: 1, createdDaysAgo: 2 },
        { id: 'stub-sim-2', model: 'gbm', seed: 7, steps: 252, horizon: 1, createdDaysAgo: 5 },
        { id: 'stub-sim-3', model: 'gbm', seed: 99, steps: 126, horizon: 0.5, createdDaysAgo: 9 },
      ],
    });
    this.seedStock({
      id: 'stub-stock-2',
      ticker: 'LAB',
      name: 'Mean Reversion Lab',
      model: 'ou',
      initialPrice: 120,
      drift: 0.02,
      volatility: 0.15,
      extra: { model: 'ou', mean_reversion: 3, reversion_level: 120 },
      createdDaysAgo: 20,
      simulations: [
        { id: 'stub-sim-4', model: 'ou', seed: 13, steps: 252, horizon: 1, createdDaysAgo: 3 },
        { id: 'stub-sim-5', model: 'ou', seed: 21, steps: 252, horizon: 2, createdDaysAgo: 7 },
      ],
    });
    // Unlinked run: visible only in the global `GET /simulations` list.
    this.addSimulation({
      id: 'stub-sim-6',
      model_type: 'merton',
      time_horizon: 1,
      steps: 252,
      random_seed: 5,
      stock_id: null,
      parameters: {
        initial_price: 80,
        drift: 0.05,
        volatility: 0.3,
        extra_params: { model: 'merton', jump_intensity: 5, jump_mean: -0.05, jump_volatility: 0.1 },
      },
      created_at: daysAgo(1),
      updated_at: daysAgo(1),
    });
  }

  login(info: LoginInfo): Observable<LoginResponse> {
    if (!info.email || !info.password) {
      return this.fail<LoginResponse>(400, 'Email y contraseña son requeridos.');
    }
    return this.respond({ token: fakeJwt(info.email) });
  }

  register(info: RegisterInfo): Observable<RegisterResponse> {
    if (!info.username || !info.email || !info.password) {
      return this.fail<RegisterResponse>(400, 'Usuario, email y contraseña son requeridos.');
    }
    return this.respond({ id: this.userId });
  }

  userInfo(): Observable<string> {
    return this.respond('Stub User');
  }

  getProfile(): Observable<ProfileWithData> {
    return this.respond({
      id: this.profileId,
      user_id: this.userId,
      created_at: daysAgo(30),
      updated_at: new Date().toISOString(),
      stocks: structuredClone(this.stocks),
    });
  }

  listStocks(filters: StockQueryFilters = {}): Observable<StockResponse[]> {
    const { limit = this.stocks.length, offset = 0 } = filters;
    return this.respond(this.stocks.slice(offset, offset + limit).map(toStockResponse));
  }

  getStockById(id: string): Observable<StockResponse> {
    const stock = this.stocks.find((item) => item.id === id);
    return stock ? this.respond(toStockResponse(stock)) : this.fail<StockResponse>(404);
  }

  getStockByTicker(ticker: string): Observable<StockResponse> {
    const stock = this.stocks.find(
      (item) => item.ticker.toLowerCase() === ticker.toLowerCase(),
    );
    return stock ? this.respond(toStockResponse(stock)) : this.fail<StockResponse>(404);
  }

  createStock(payload: CreateStockPayload): Observable<StockResponse> {
    if (!payload.ticker?.trim() || !payload.name?.trim()) {
      return this.fail<StockResponse>(400, 'Ticker y nombre son requeridos.');
    }
    const stock: StockWithSimulations = {
      id: `stub-stock-${++this.counter + 10}`,
      ticker: payload.ticker.trim().toUpperCase(),
      name: payload.name.trim(),
      model_type: 'gbm',
      initial_price: 100,
      drift: 0.1,
      volatility: 0.2,
      extra_params: { model: 'gbm' },
      simulations: [],
    };
    this.stocks.unshift(stock);
    return this.respond(toStockResponse(stock));
  }

  updateStock(id: string, payload: UpdateStockPayload): Observable<StockResponse> {
    const stock = this.stocks.find((item) => item.id === id);
    if (!stock) {
      return this.fail<StockResponse>(404);
    }
    if (payload.name !== undefined && payload.name !== null) {
      stock.name = payload.name;
    }
    return this.respond(toStockResponse(stock));
  }

  deleteStock(id: string): Observable<void> {
    const index = this.stocks.findIndex((item) => item.id === id);
    if (index < 0) {
      return this.fail<void>(404);
    }
    for (const summary of this.stocks[index].simulations) {
      this.simulations.delete(summary.id);
    }
    this.stocks.splice(index, 1);
    return this.respond(undefined);
  }

  stockSimulations(
    id: string,
    offset = 0,
    limit = 20,
  ): Observable<SimulationResponse[]> {
    if (!this.stocks.some((item) => item.id === id)) {
      return this.fail<SimulationResponse[]>(404);
    }
    const page = [...this.simulations.values()]
      .filter((simulation) => simulation.stock_id === id)
      .sort(byCreatedDesc)
      .slice(offset, offset + limit);
    return this.respond(structuredClone(page));
  }

  listSimulations(filters: SimulationQueryFilters = {}): Observable<SimulationResponse[]> {
    const { model_type, limit = this.simulations.size, offset = 0 } = filters;
    const page = [...this.simulations.values()]
      .filter((simulation) => !model_type || simulation.model_type === model_type)
      .sort(byCreatedDesc)
      .slice(offset, offset + limit);
    return this.respond(structuredClone(page));
  }

  createSimulation(payload: CreateSimulationPayload): Observable<SimulationResponse> {
    if (!(payload.initial_price > 0) || !(payload.time_horizon > 0) || payload.steps < 1) {
      return this.fail<SimulationResponse>(400, 'Parámetros inválidos.');
    }
    if (payload.stock_id && !this.stocks.some((item) => item.id === payload.stock_id)) {
      return this.fail<SimulationResponse>(404);
    }
    const now = new Date().toISOString();
    const simulation: SimulationResponse = {
      id: `stub-sim-${++this.counter + 10}`,
      model_type: payload.model_type,
      time_horizon: payload.time_horizon,
      steps: Math.min(Math.floor(payload.steps), MAX_STUB_STEPS),
      random_seed: payload.random_seed,
      stock_id: payload.stock_id ?? null,
      parameters: {
        initial_price: payload.initial_price,
        drift: payload.drift,
        volatility: payload.volatility,
        extra_params: payload.extra_params,
      },
      created_at: now,
      updated_at: now,
    };
    this.addSimulation(simulation);
    return this.respond(structuredClone(simulation));
  }

  getSimulation(id: string): Observable<SimulationResponse> {
    const simulation = this.simulations.get(id);
    return simulation
      ? this.respond(structuredClone(simulation))
      : this.fail<SimulationResponse>(404);
  }

  deleteSimulation(id: string): Observable<void> {
    const simulation = this.simulations.get(id);
    if (!simulation) {
      return this.fail<void>(404);
    }
    this.simulations.delete(id);
    const stock = this.stocks.find((item) => item.id === simulation.stock_id);
    stock?.simulations.splice(
      stock.simulations.findIndex((summary) => summary.id === id),
      1,
    );
    return this.respond(undefined);
  }

  // Raw JSON text of `TicksResponse`, like `SimulationsApi.ticksJson`: the
  // ticks worker parses it off the UI thread. The path replays the stored
  // seed deterministically (GBM discretization; other models reuse it as an
  // approximation — stub limitation, not engine behavior).
  ticksJson(id: string): Observable<string> {
    const simulation = this.simulations.get(id);
    if (!simulation) {
      return this.fail<string>(404);
    }
    const { parameters } = simulation;
    const steps = simulation.steps;
    const dt = simulation.time_horizon / steps;
    const nextGaussian = createGaussianGenerator(simulation.random_seed);
    const ticks = new Array<number>(steps + 1);
    const times = new Array<number>(steps + 1);
    ticks[0] = parameters.initial_price;
    times[0] = 0;
    for (let i = 1; i <= steps; i++) {
      const shock =
        (parameters.drift - 0.5 * parameters.volatility ** 2) * dt +
        parameters.volatility * Math.sqrt(dt) * nextGaussian();
      ticks[i] = ticks[i - 1] * Math.exp(shock);
      times[i] = i * dt;
    }
    const response: TicksResponse = {
      simulation_id: simulation.id,
      model_type: simulation.model_type,
      time_horizon: simulation.time_horizon,
      steps: simulation.steps,
      random_seed: simulation.random_seed,
      ticks,
      times,
    };
    return this.respond(JSON.stringify(response));
  }

  private seedStock(seed: {
    id: string;
    ticker: string;
    name: string;
    model: ModelType;
    initialPrice: number;
    drift: number;
    volatility: number;
    extra: SimulationResponse['parameters']['extra_params'];
    createdDaysAgo: number;
    simulations: SeedSimulation[];
  }): void {
    const stock: StockWithSimulations = {
      id: seed.id,
      ticker: seed.ticker,
      name: seed.name,
      model_type: seed.model,
      initial_price: seed.initialPrice,
      drift: seed.drift,
      volatility: seed.volatility,
      extra_params: seed.extra,
      simulations: [],
    };
    this.stocks.push(stock);
    for (const item of seed.simulations) {
      this.addSimulation({
        id: item.id,
        model_type: item.model,
        time_horizon: item.horizon,
        steps: item.steps,
        random_seed: item.seed,
        stock_id: seed.id,
        parameters: {
          initial_price: seed.initialPrice,
          drift: seed.drift,
          volatility: seed.volatility,
          extra_params: seed.extra,
        },
        created_at: daysAgo(item.createdDaysAgo),
        updated_at: daysAgo(item.createdDaysAgo),
      });
    }
  }

  private addSimulation(simulation: SimulationResponse): void {
    this.simulations.set(simulation.id, simulation);
    if (simulation.stock_id) {
      const summary: SimulationBasic = {
        id: simulation.id,
        model_type: simulation.model_type,
        time_horizon: simulation.time_horizon,
        steps: simulation.steps,
        random_seed: simulation.random_seed,
        created_at: simulation.created_at,
        updated_at: simulation.updated_at,
      };
      this.stocks
        .find((stock) => stock.id === simulation.stock_id)
        ?.simulations.unshift(summary);
    }
  }

  private respond<T>(value: T): Observable<T> {
    return of(value).pipe(delay(STUB_LATENCY_MS));
  }

  private fail<T>(status: number, message?: string): Observable<T> {
    return throwError(
      () =>
        new HttpErrorResponse({
          status,
          statusText: message ?? (status === 404 ? 'Not Found' : 'Error'),
        }),
    ).pipe(delay(STUB_LATENCY_MS));
  }
}

// `StockWithSimulations` carries no timestamps, so the `StockResponse`
// projection stamps them at read time; stubs never sort on them.
function toStockResponse(stock: StockWithSimulations): StockResponse {
  return {
    id: stock.id,
    ticker: stock.ticker,
    name: stock.name,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function byCreatedDesc(a: SimulationResponse, b: SimulationResponse): number {
  return b.created_at.localeCompare(a.created_at);
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

// Unsigned JWT the `SessionStore` accepts (`sub` + future `exp`); the
// signature is a placeholder since stubs never verify it.
function fakeJwt(sub: string): string {
  const encode = (value: object): string =>
    btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode({ sub, exp: Math.floor(Date.now() / 1000) + 3600 })}.stub`;
}

function createGaussianGenerator(seed: number): () => number {
  const nextUniform = createMulberry32(seed);
  return () => {
    // Box-Muller transform.
    const u1 = nextUniform() || Number.EPSILON;
    const u2 = nextUniform();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  };
}

function createMulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
