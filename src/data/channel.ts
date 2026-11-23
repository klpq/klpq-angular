// Pure logic over what the stats API returns. No React, no network, no DOM.

export const PLAYABLE = ['flv', 'hls', 'mpd'] as const;
export type Protocol = (typeof PLAYABLE)[number];

export type Stream = {
  app: string;
  duration: number;
  viewers: number;
  isLive: boolean;
  startTime: string;
  protocol: string;
  bitrate: number;
  urls?: { edge?: string };
};

export type Quality = {
  label: string;
  protocol: string;
  app: string;
  path: string;
};

/** The stream a route asks for: protocol defaults to FLV, app is optional. */
export function pickStream(streams: Stream[], protocol = 'flv', app?: string) {
  return streams.find(
    (entry) =>
      entry.protocol === protocol &&
      (!app || entry.app === app) &&
      Boolean(entry.urls?.edge),
  );
}

/** Everyone watching the channel, across all of its streams. */
export function countWitnesses(streams: Stream[]) {
  return streams.reduce((total, entry) => total + (entry.viewers || 0), 0);
}

/** One entry per playable protocol and app the channel currently offers. */
export function listQualities(channel: string, streams: Stream[]): Quality[] {
  const seen = new Set<string>();
  const playable = streams.filter((entry) =>
    (PLAYABLE as readonly string[]).includes(entry.protocol),
  );
  const apps = new Set(playable.map((entry) => entry.app));
  const qualities: Quality[] = [];
  for (const entry of playable) {
    const key = `${entry.protocol}/${entry.app}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const name =
      entry.protocol === 'mpd' ? 'DASH' : entry.protocol.toUpperCase();
    qualities.push({
      label: apps.size > 1 ? `${name} · ${entry.app}` : name,
      protocol: entry.protocol,
      app: entry.app,
      path: `/${channel}/${entry.protocol}/${entry.app}`,
    });
  }
  return qualities;
}

/** Seconds as a tape counter: 01:24:07. */
export function formatTape(seconds: number) {
  const whole = Math.max(0, Math.floor(seconds));
  return [whole / 3600, (whole / 60) % 60, whole % 60]
    .map((part) => String(Math.floor(part)).padStart(2, '0'))
    .join(':');
}

export type ChannelState = {
  name: string;
  live: boolean;
  witnesses: number;
  listed: boolean;
};

/** The default channel first, then whatever is on air, busiest first, then the rest by name. */
export function orderChannels(channels: ChannelState[], here: string) {
  return [...channels].sort((a, b) => {
    if ((a.name === here) !== (b.name === here))
      return a.name === here ? -1 : 1;
    if (a.live !== b.live) return a.live ? -1 : 1;
    if (a.witnesses !== b.witnesses) return b.witnesses - a.witnesses;
    return a.name.localeCompare(b.name);
  });
}

/* ---------- saved channels: same storage keys and rules as the old site ---------- */

const SAVED_KEY = 'channels';
const REMOVED_CURRENT_KEY = 'removedCurrentChannel';

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function createSavedChannels(local: Store, session: Store) {
  const read = (): string[] => {
    try {
      const parsed = JSON.parse(local.getItem(SAVED_KEY) || '[]');
      return Array.isArray(parsed)
        ? [
            ...new Set(
              parsed.filter((name): name is string => typeof name === 'string'),
            ),
          ]
        : [];
    } catch {
      return [];
    }
  };

  return {
    read,
    /** Remember a channel you opened, unless you just removed it while watching it. */
    visit(channel: string) {
      if (!channel || channel === session.getItem(REMOVED_CURRENT_KEY)) return;
      session.removeItem(REMOVED_CURRENT_KEY);
      const saved = read();
      if (!saved.includes(channel)) {
        local.setItem(SAVED_KEY, JSON.stringify([channel, ...saved]));
      }
    },
    remove(channel: string, current?: string) {
      local.setItem(
        SAVED_KEY,
        JSON.stringify(read().filter((name) => name !== channel)),
      );
      if (channel === current) session.setItem(REMOVED_CURRENT_KEY, channel);
    },
  };
}
