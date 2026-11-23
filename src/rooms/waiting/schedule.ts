// The station's programme. It is computed from the clock alone, so everyone
// in the Waiting Room sees the same thing in the same second with no server.

export type Program = {
  /** Something has taken over the room. */
  event: 'hijack' | 'numbers' | null;
  /** Top of the hour: the station identifies itself. */
  ident: boolean;
  /** Between three and four in the morning, local time. */
  deadHour: boolean;
  /** What the voice reads during `numbers`. */
  digits: string;
};

const SLOT_SECONDS = 90;
const EVENT_SECONDS = 14;

const hash = (n: number) => {
  let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  return (x ^ (x >>> 16)) >>> 0;
};

export function programAt(now: Date, forced?: string | null): Program {
  const seconds = Math.floor(now.getTime() / 1000);
  const slot = Math.floor(seconds / SLOT_SECONDS);
  const within = seconds % SLOT_SECONDS;
  const roll = hash(slot) % 4;
  const kinds = ['hijack', null, 'numbers', null] as const;
  const scheduled = within < EVENT_SECONDS ? kinds[roll] : null;

  const digits = Array.from({ length: 5 }, (_, group) =>
    String(hash(slot * 7 + group) % 100000).padStart(5, '0'),
  ).join(' ');

  return {
    event: forced === 'hijack' || forced === 'numbers' ? forced : scheduled,
    ident:
      forced === 'ident' ||
      (now.getUTCMinutes() === 0 && now.getUTCSeconds() < 6),
    deadHour: forced === 'deadhour' || now.getHours() === 3,
    digits,
  };
}

/** Shared between the scene and the page without threading props through the 3D tree. */
export const room = {
  hijacked: false,
  onArc: null as null | (() => void),
  /** Somebody touched the guest. */
  onTouch: null as null | (() => void),
};
