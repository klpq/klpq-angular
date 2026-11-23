import { useMemo, useSyncExternalStore } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { env, HERE } from '../env';
import {
  countWitnesses,
  createSavedChannels,
  orderChannels,
  type ChannelState,
  type Stream,
} from './channel';

const POLL_MS = 10_000;

async function fetchChannel(
  name: string,
  signal?: AbortSignal,
): Promise<Stream[]> {
  const response = await fetch(
    `${env.STATS_URL}/channels/${encodeURIComponent(name)}`,
    {
      signal,
      headers: { 'jwt-token': localStorage.getItem('token') || '' },
    },
  );
  if (!response.ok) throw new Error(`stats ${response.status}`);
  const body = (await response.json()) as { streams?: Stream[] };
  return body.streams ?? [];
}

export type Station = {
  channels: string[];
  transmissions: number;
  daysOnAir: number;
};

/** The broadcast history endpoint also carries every known channel and the station totals. */
async function fetchStation(signal?: AbortSignal): Promise<Station> {
  const response = await fetch(`${env.STATS_URL}/streams?limit=1`, { signal });
  if (!response.ok) throw new Error(`stats ${response.status}`);
  const body = await response.json();
  return {
    channels: Array.isArray(body?.options?.channels)
      ? body.options.channels
      : [],
    transmissions: Number(body?.total) || 0,
    daysOnAir: Math.round((Number(body?.info?.totalDuration) || 0) / 86_400),
  };
}

const channelQuery = (name: string) => ({
  queryKey: ['channel', name] as const,
  queryFn: ({ signal }: { signal: AbortSignal }) => fetchChannel(name, signal),
  refetchInterval: POLL_MS,
  staleTime: POLL_MS / 2,
});

/** Live streams of one channel, polled. */
export function useChannelStats(name: string) {
  return useQuery(channelQuery(name));
}

export function useStation() {
  return useQuery({
    queryKey: ['station'],
    queryFn: ({ signal }) => fetchStation(signal),
    staleTime: 5 * 60_000,
  });
}

/* ---------- saved channels ---------- */

const saved = createSavedChannels(localStorage, sessionStorage);
const listeners = new Set<() => void>();
let snapshot = saved.read();
const publish = () => {
  snapshot = saved.read();
  listeners.forEach((listener) => listener());
};
window.addEventListener('storage', publish);

export const savedChannels = {
  visit(channel: string) {
    saved.visit(channel);
    publish();
  },
  remove(channel: string, current?: string) {
    saved.remove(channel, current);
    publish();
  },
};

export function useSavedChannels() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    () => snapshot,
  );
}

/**
 * Every channel worth showing: whatever the API knows about, plus channels you
 * opened that it does not list, plus the default. Never a hard-coded list.
 */
export function useChannels(alsoInclude?: string): ChannelState[] {
  const station = useStation();
  const mine = useSavedChannels();
  const listed = station.data?.channels;

  const names = useMemo(() => {
    const all = new Set<string>([HERE, ...(listed ?? []), ...mine]);
    if (alsoInclude) all.add(alsoInclude);
    return [...all];
  }, [listed, mine, alsoInclude]);

  const results = useQueries({ queries: names.map(channelQuery) });
  const signature = results.map((result) => result.dataUpdatedAt).join();

  return useMemo(
    () =>
      orderChannels(
        names.map((name, index) => {
          const streams = results[index]?.data ?? [];
          return {
            name,
            live: streams.length > 0,
            witnesses: countWitnesses(streams),
            listed: !listed || listed.includes(name) || name === HERE,
          };
        }),
        HERE,
      ),
    [names, signature, listed], // eslint-disable-line react-hooks/exhaustive-deps
  );
}
