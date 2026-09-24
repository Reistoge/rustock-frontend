import { formatPlain, formatPrice, formatReturn, simulationSummary } from '../format/format';
import { BASE_FIELDS, EXTRA_FIELDS, buildExtraParams, isValidValue } from './model-catalog';

const base = (key: string) => BASE_FIELDS.find((field) => field.key === key)!;
const heston = (key: string) => EXTRA_FIELDS.heston.find((field) => field.key === key)!;

describe('model catalog validation', () => {
  it('requires S₀ and T strictly positive', () => {
    expect(isValidValue(base('initial_price'), 0)).toBe(false);
    expect(isValidValue(base('initial_price'), 0.01)).toBe(true);
    expect(isValidValue(base('time_horizon'), 0)).toBe(false);
  });

  it('requires integer steps ≥ 1 and seed ≥ 0', () => {
    expect(isValidValue(base('steps'), 0)).toBe(false);
    expect(isValidValue(base('steps'), 2.5)).toBe(false);
    expect(isValidValue(base('steps'), 252)).toBe(true);
    expect(isValidValue(base('random_seed'), -1)).toBe(false);
    expect(isValidValue(base('random_seed'), 0)).toBe(true);
  });

  it('allows σ = 0, negative drift, and ρ only within [−1, 1]', () => {
    expect(isValidValue(base('volatility'), 0)).toBe(true);
    expect(isValidValue(base('drift'), -0.3)).toBe(true);
    expect(isValidValue(heston('correlation'), -1)).toBe(true);
    expect(isValidValue(heston('correlation'), 1.2)).toBe(false);
  });

  it('rejects empty inputs', () => {
    expect(isValidValue(base('drift'), null)).toBe(false);
  });
});

describe('buildExtraParams', () => {
  it('builds the tagged ModelParams the backend expects', () => {
    expect(buildExtraParams('gbm', {})).toEqual({ model: 'gbm' });
    expect(buildExtraParams('ou', { mean_reversion: 3, reversion_level: 120 })).toEqual({
      model: 'ou',
      mean_reversion: 3,
      reversion_level: 120,
    });
  });

  it('only includes the fields of the selected model', () => {
    const params = buildExtraParams('merton', {
      jump_intensity: 5,
      jump_mean: -0.05,
      jump_volatility: 0.1,
      correlation: 0.5,
    });
    expect(Object.keys(params).sort()).toEqual(
      ['jump_intensity', 'jump_mean', 'jump_volatility', 'model'].sort(),
    );
  });
});

describe('es-CL formatting', () => {
  it('uses a decimal comma', () => {
    expect(formatPrice(108.214)).toBe('108,21');
    expect(formatPlain(0.4)).toBe('0,4');
    expect(formatPlain(null)).toBe('—');
    expect(formatReturn(0.0821)).toBe('+8,2%');
    expect(formatReturn(-0.05)).toBe('-5,0%');
  });

  it('summarises a simulation for the history list', () => {
    expect(simulationSummary({ time_horizon: 0.5, steps: 126, random_seed: 2024 })).toBe(
      'T 0,5 a · 126 pasos · seed 2024',
    );
  });
});
