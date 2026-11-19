import { describe, expect, it } from 'vitest';
import { directionOf, resolveLocale } from './locale';

describe('resolveLocale', () => {
  it('C-03 English is shown unless the cookie says Arabic', () => {
    expect(resolveLocale(undefined)).toBe('en');
    expect(resolveLocale('')).toBe('en');
    expect(resolveLocale('fr')).toBe('en');
    expect(resolveLocale('AR')).toBe('en');
    expect(resolveLocale('en')).toBe('en');
    expect(resolveLocale('ar')).toBe('ar');
  });

  it('C-03 Arabic is laid out right to left and English left to right', () => {
    expect(directionOf('ar')).toBe('rtl');
    expect(directionOf('en')).toBe('ltr');
  });
});
