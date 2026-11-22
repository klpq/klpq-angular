import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import humanizeDuration from 'humanize-duration';
import { BehaviorSubject, interval, Observable, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { find } from 'lodash';
import environment from 'src/environment';
import * as _ from 'lodash';
import axios from 'axios';

const SAVED_CHANNELS_KEY = 'channels';
const REMOVED_CURRENT_CHANNEL_KEY = 'removedCurrentChannel';

const url = (name: string) => `${environment.STATS_URL}/channels/${name}`;

export const formatStreamDuration = (duration: number) =>
  humanizeDuration(duration * 1000, {
    round: true,
    largest: 2,
    language: 'shortEn',
    spacer: '',
    delimiter: ':',
    languages: {
      shortEn: {
        y: 'y',
        mo: 'mo',
        w: 'w',
        d: 'd',
        h: 'h',
        m: 'm',
        s: 's',
        ms: 'ms',
      },
    },
  });

export enum ProtocolsEnum {
  RTMP = 'rtmp',
  FLV = 'flv',
  MPD = 'mpd',
  HLS = 'hls',
}

export interface Stats {
  channel: string | null;
  streams: {
    app: string;
    duration: number;
    viewers: number;
    isLive: boolean;
    startTime: string;
    protocol: ProtocolsEnum;
    bitrate: number;
    urls: {
      edge: string;
    };
  }[];
}

export interface QualityEntry {
  label: string;
  path: string;
}

@Injectable({
  providedIn: 'root',
})
export class StreamStatService {
  stats: Stats = {
    channel: null,
    streams: [],
  };

  channels: {
    online: string[];
    offline: string[];
    qualityOnline: QualityEntry[];
    qualityOffline: QualityEntry[];
  } = {
    online: [],
    offline: [],
    qualityOnline: [],
    qualityOffline: [],
  };

  channel: string;

  statsSubject = new BehaviorSubject(this.stats);
  onlineChannels = new BehaviorSubject(this.channels);

  intervalSource: Subscription;

  constructor(private http: HttpClient) {
    this.initService();
  }

  ngOnDestroy() {
    console.log('ngOnDestroy');

    if (this.intervalSource) {
      this.intervalSource.unsubscribe();
    }
  }

  initService() {
    this.intervalSource = interval(10000).subscribe(() => {
      this.fetchStats(this.channel);

      this.fetchChannels();
    });
  }

  setChannel(channel: string) {
    this.channel = channel;

    const removedChannel = sessionStorage.getItem(REMOVED_CURRENT_CHANNEL_KEY);
    if (channel && channel !== removedChannel) {
      sessionStorage.removeItem(REMOVED_CURRENT_CHANNEL_KEY);
      const channels = this.readSavedChannels();
      if (!channels.includes(channel)) {
        localStorage.setItem(
          SAVED_CHANNELS_KEY,
          JSON.stringify([channel, ...channels]),
        );
      }
    }

    this.fetchStats(this.channel);
    this.fetchChannels();
  }

  removeChannel(channel: string) {
    const remaining = this.readSavedChannels().filter(
      (name) => name !== channel,
    );
    localStorage.setItem(SAVED_CHANNELS_KEY, JSON.stringify(remaining));
    if (channel === this.channel) {
      sessionStorage.setItem(REMOVED_CURRENT_CHANNEL_KEY, channel);
    }

    this.channels = {
      ...this.channels,
      online: this.channels.online.filter((name) => name !== channel),
      offline: this.channels.offline.filter((name) => name !== channel),
    };
    this.onlineChannels.next(this.channels);
  }

  private readSavedChannels(): string[] {
    try {
      const channels = JSON.parse(
        localStorage.getItem(SAVED_CHANNELS_KEY) || '[]',
      );
      return Array.isArray(channels)
        ? [
            ...new Set<string>(
              channels.filter((name) => typeof name === 'string'),
            ),
          ]
        : [];
    } catch {
      return [];
    }
  }

  async fetchChannels() {
    const channel = this.channel;
    const onlineChannels: string[] = [];
    const offlineChannels: string[] = [];

    const qualityOnline: QualityEntry[] = [];
    const qualityOffline: QualityEntry[] = [];

    for (const channelName of this.readSavedChannels()) {
      try {
        const {
          data: { streams },
        } = await axios.get<Stats>(url(channelName));

        if (streams.length > 0) {
          onlineChannels.push(channelName);
        } else {
          offlineChannels.push(channelName);
        }
      } catch (error) {
        offlineChannels.push(channelName);
      }
    }

    try {
      const {
        data: { streams },
      } = await axios.get<Stats>(url(channel));

      for (const stream of streams) {
        if (
          ![ProtocolsEnum.FLV, ProtocolsEnum.HLS, ProtocolsEnum.MPD].includes(
            stream.protocol,
          )
        ) {
          continue;
        }

        const label = `${stream.protocol}/${stream.app}`;

        const qualityEntry = {
          label,
          path: `${channel}/${stream.protocol}/${stream.app}`,
        };

        if (!_.find(qualityOnline, { label })) {
          qualityOnline.push(qualityEntry);
        }
      }
    } catch (error) {}

    if (channel !== this.channel) {
      return;
    }
    const saved = new Set(this.readSavedChannels());
    this.channels = {
      online: onlineChannels.filter((name) => saved.has(name)),
      offline: offlineChannels.filter((name) => saved.has(name)),
      qualityOnline,
      qualityOffline,
    };
    this.onlineChannels.next(this.channels);
  }

  fetchStats(channel: string) {
    console.log('fetchStats', channel);

    const source = this.http
      .get<{
        streams: Stats['streams'];
      }>(url(channel), {
        headers: {
          'jwt-token': window.localStorage.getItem('token') || '',
        },
      })
      .pipe();

    source.subscribe({
      next: (data) => {
        if (channel === this.channel) {
          this.stats = { channel, ...data };
          this.statsSubject.next(this.stats);
        }
      },
      error: (error) =>
        console.error('Could not load stream statistics', error),
    });
  }
}
