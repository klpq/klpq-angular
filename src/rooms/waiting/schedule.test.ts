import { describe, expect, it } from 'vitest';
import { programAt } from './schedule';

describe('programAt', () => {
  it('gives every viewer the same programme for the same second', () => {
    const a = programAt(new Date('2026-11-23T17:20:05Z'));
    const b = programAt(new Date('2026-11-23T17:20:05Z'));
    expect(a).toEqual(b);
  });

  it('only runs events in the first seconds of a slot', () => {
    for (let slot = 0; slot < 200; slot++) {
      const late = new Date((slot * 90 + 40) * 1000);
      expect(programAt(late).event).toBeNull();
    }
  });

  it('runs each kind of event somewhere in a day', () => {
    const seen = new Set<string | null>();
    for (let slot = 0; slot < 960; slot++)
      seen.add(programAt(new Date(slot * 90_000)).event);
    expect(seen).toEqual(new Set(['hijack', 'numbers', null]));
  });

  it('identifies the station at the top of the hour only', () => {
    expect(programAt(new Date('2026-11-23T18:00:03Z')).ident).toBe(true);
    expect(programAt(new Date('2026-11-23T18:00:09Z')).ident).toBe(false);
    expect(programAt(new Date('2026-11-23T18:30:03Z')).ident).toBe(false);
  });

  it('reads five groups of five digits', () => {
    expect(programAt(new Date(0)).digits).toMatch(/^(\d{5} ){4}\d{5}$/);
  });

  it('can be forced for checking', () => {
    expect(programAt(new Date(40_000), 'hijack').event).toBe('hijack');
  });
});
