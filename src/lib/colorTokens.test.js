import { describe, it, expect } from 'vitest';
import { HUE_TOKENS, snapUserColor } from './colorTokens';

describe('HUE_TOKENS', () => {
  it('exposes the ten Astryx hue families', () => {
    expect(HUE_TOKENS.map((t) => t.name)).toEqual([
      'red',
      'orange',
      'yellow',
      'green',
      'teal',
      'cyan',
      'blue',
      'purple',
      'pink',
      'gray',
    ]);
  });

  it('references each hue through its -vivid CSS variable and a hex value', () => {
    for (const token of HUE_TOKENS) {
      expect(token.cssVar).toBe(`var(--color-${token.name}-vivid)`);
      expect(token.hex).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});

describe('snapUserColor', () => {
  it('round-trips every token hex to its own token', () => {
    for (const token of HUE_TOKENS) {
      expect(snapUserColor(token.hex)).toBe(token);
    }
  });

  it('is case-insensitive and tolerates surrounding whitespace', () => {
    expect(snapUserColor('  #FF6F6C ').name).toBe('red');
  });

  it('snaps legacy preset colors to sensible hue families', () => {
    expect(snapUserColor('#E8942A').name).toBe('orange'); // Amber
    expect(snapUserColor('#3B6ED6').name).toBe('blue');
    expect(snapUserColor('#1FA7A7').name).toBe('teal');
    expect(snapUserColor('#888888').name).toBe('gray'); // Graphite
    expect(snapUserColor('#06B6D4').name).toBe('cyan');
  });

  it('snaps saturated primaries to their hue family', () => {
    expect(snapUserColor('#ff0000').name).toBe('red');
    expect(snapUserColor('#0000ff').name).toBe('blue');
  });

  it('parses #rgb shorthand', () => {
    expect(snapUserColor('#f00').name).toBe('red');
    expect(snapUserColor('#888').name).toBe('gray');
  });

  it('parses rgb() and rgba() inputs', () => {
    expect(snapUserColor('rgb(255, 111, 108)').name).toBe('red');
    expect(snapUserColor('rgb(109 156 254)').name).toBe('blue');
    expect(snapUserColor('rgba(242, 115, 170, 0.5)').name).toBe('pink');
  });

  it('falls back to gray for unknown or invalid input', () => {
    const gray = HUE_TOKENS.find((t) => t.name === 'gray');
    expect(snapUserColor(undefined)).toBe(gray);
    expect(snapUserColor(null)).toBe(gray);
    expect(snapUserColor('')).toBe(gray);
    expect(snapUserColor('not-a-color')).toBe(gray);
    expect(snapUserColor('#12')).toBe(gray);
    expect(snapUserColor('rgb(a, b, c)')).toBe(gray);
    expect(snapUserColor({ hex: '#ff0000' })).toBe(gray);
  });

  it('memoizes results for the same normalized input (reference-equal)', () => {
    const first = snapUserColor('#3B6ED6');
    const second = snapUserColor('#3B6ED6');
    expect(second).toBe(first);
  });

  it('memoizes case/whitespace variants of the same input under one cache entry', () => {
    const first = snapUserColor('#3b6ed6');
    const second = snapUserColor('  #3B6ED6 ');
    expect(second).toBe(first);
  });

  it('memoizes invalid/nullish inputs consistently', () => {
    const first = snapUserColor(undefined);
    const second = snapUserColor(null);
    expect(second).toBe(first);
  });
});
