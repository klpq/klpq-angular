import { describe, expect, it } from 'vitest';
import {
  countWitnesses,
  createSavedChannels,
  formatTape,
  listQualities,
  orderChannels,
  pickStream,
  type Stream,
} from './channel';

const stream = (over: Partial<Stream>): Stream => ({
  app: 'live',
  duration: 10,
  viewers: 1,
  isLive: true,
  startTime: '',
  protocol: 'flv',
  bitrate: 4000,
  urls: { edge: 'wss://edge/live/stream.flv' },
  ...over,
});

const memory = () => {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  };
};

describe('pickStream', () => {
  const streams = [
    stream({ protocol: 'rtmp', urls: {} }),
    stream({ protocol: 'flv', app: 'live' }),
    stream({ protocol: 'hls', app: 'live_hls' }),
    stream({ protocol: 'flv', app: 'encode' }),
  ];

  it('defaults to FLV', () => {
    expect(pickStream(streams)?.app).toBe('live');
  });
  it('honours protocol and app', () => {
    expect(pickStream(streams, 'hls')?.app).toBe('live_hls');
    expect(pickStream(streams, 'flv', 'encode')?.app).toBe('encode');
  });
  it('ignores streams without an edge url', () => {
    expect(pickStream(streams, 'rtmp')).toBeUndefined();
  });
  it('finds nothing on an empty channel', () => {
    expect(pickStream([])).toBeUndefined();
  });
});

describe('countWitnesses', () => {
  it('sums viewers across every stream of the channel', () => {
    expect(
      countWitnesses([stream({ viewers: 3 }), stream({ viewers: 9 })]),
    ).toBe(12);
  });
});

describe('listQualities', () => {
  it('lists playable protocols once each and skips rtmp', () => {
    const list = listQualities('kino', [
      stream({ protocol: 'rtmp' }),
      stream({ protocol: 'flv' }),
      stream({ protocol: 'flv' }),
      stream({ protocol: 'mpd', app: 'live_mpd' }),
    ]);
    expect(list.map((entry) => entry.path)).toEqual([
      '/kino/flv/live',
      '/kino/mpd/live_mpd',
    ]);
    expect(list[1].label).toBe('DASH · live_mpd');
  });
  it('drops the app from the label when there is only one', () => {
    expect(listQualities('kino', [stream({})])[0].label).toBe('FLV');
  });
});

describe('formatTape', () => {
  it('counts like a tape deck', () => {
    expect(formatTape(5047)).toBe('01:24:07');
    expect(formatTape(0)).toBe('00:00:00');
    expect(formatTape(-4)).toBe('00:00:00');
  });
});

describe('orderChannels', () => {
  it('puts the default channel first, then live by audience, then names', () => {
    const order = orderChannels(
      [
        { name: 'test', live: false, witnesses: 0, listed: true },
        { name: 'kino', live: true, witnesses: 2, listed: true },
        { name: 'stream', live: false, witnesses: 0, listed: true },
        { name: 'nomad', live: true, witnesses: 9, listed: true },
        { name: 'main', live: false, witnesses: 0, listed: true },
      ],
      'stream',
    );
    expect(order.map((entry) => entry.name)).toEqual([
      'stream',
      'nomad',
      'kino',
      'main',
      'test',
    ]);
  });
});

describe('saved channels', () => {
  it('remembers visited channels, newest first, without duplicates', () => {
    const saved = createSavedChannels(memory(), memory());
    saved.visit('stream');
    saved.visit('kino');
    saved.visit('stream');
    expect(saved.read()).toEqual(['kino', 'stream']);
  });

  it('survives a corrupted or foreign value', () => {
    const local = memory();
    local.setItem('channels', '{not json');
    expect(createSavedChannels(local, memory()).read()).toEqual([]);
    local.setItem('channels', JSON.stringify(['a', 3, 'a', null, 'b']));
    expect(createSavedChannels(local, memory()).read()).toEqual(['a', 'b']);
  });

  it('does not re-add the channel you removed while watching it', () => {
    const saved = createSavedChannels(memory(), memory());
    saved.visit('kino');
    saved.remove('kino', 'kino');
    saved.visit('kino');
    expect(saved.read()).toEqual([]);
    // opening another channel clears the flag
    saved.visit('stream');
    saved.visit('kino');
    expect(saved.read()).toEqual(['kino', 'stream']);
  });
});
