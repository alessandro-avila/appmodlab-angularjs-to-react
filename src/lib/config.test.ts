/**
 * CONFIG — the API base URL comes from the environment (finding A-5).
 */
import { describe, it, expect } from 'vitest';
import { readApiBaseUrl, MissingConfigError } from './config';

describe('config — VITE_API_URL', () => {
  it('reads the base URL from the environment', () => {
    expect(readApiBaseUrl({ VITE_API_URL: '/api' })).toBe('/api');
  });

  it('accepts an absolute origin', () => {
    expect(readApiBaseUrl({ VITE_API_URL: 'http://localhost:3000/api' })).toBe(
      'http://localhost:3000/api',
    );
  });

  it('strips a trailing slash so callers can always join with "/path"', () => {
    expect(readApiBaseUrl({ VITE_API_URL: 'http://localhost:3000/api/' })).toBe(
      'http://localhost:3000/api',
    );
  });

  it('THROWS when unset — there is deliberately no hardcoded fallback', () => {
    // A silent default is how a hardcoded origin creeps back in. app/app.js:14
    // and auth.service.js:18 are exactly that mistake, made twice.
    expect(() => readApiBaseUrl({})).toThrow(MissingConfigError);
  });

  it('THROWS on an empty or whitespace value', () => {
    expect(() => readApiBaseUrl({ VITE_API_URL: '' })).toThrow(MissingConfigError);
    expect(() => readApiBaseUrl({ VITE_API_URL: '   ' })).toThrow(MissingConfigError);
  });

  it('names the variable in the error, so the failure is actionable', () => {
    expect(() => readApiBaseUrl({})).toThrow(/VITE_API_URL/);
  });
});
