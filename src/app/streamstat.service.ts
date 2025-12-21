import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import humanizeDuration from 'humanize-duration';
import { BehaviorSubject, interval, Observable, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { find } from 'lodash';
import environment from 'src/environment';
import * as _ from 'lodash';
import axios from 'axios';

const url = (name: string) => `${environment.STATS_URL}/channels/${name}`;

const fixTime = (duration: number) =>
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

  openedChannels: string[] = [];

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

    if (this.channel) {
      this.openedChannels.push(this.channel);

      let openedChannelsJson = localStorage.getItem('channels');

      try {
        if (openedChannelsJson) {
          this.openedChannels = [
            ...this.openedChannels,
            ...JSON.parse(openedChannelsJson),
          ];
        }
      } catch (error) {}

      this.openedChannels = _.uniq(this.openedChannels);

      localStorage.setItem('channels', JSON.stringify(this.openedChannels));
    }

    this.fetchStats(this.channel);
    this.fetchChannels();
  }

  async fetchChannels() {
    const onlineChannels: string[] = [];
    const offlineChannels: string[] = [];

    const qualityOnline: QualityEntry[] = [];
    const qualityOffline: QualityEntry[] = [];

    for (const channelName of this.openedChannels) {
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

    this.channels.online = onlineChannels;
    this.channels.offline = offlineChannels;

    try {
      const {
        data: { streams },
      } = await axios.get<Stats>(url(this.channel));

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
          path: `${this.channel}/${stream.protocol}/${stream.app}`,
        };

        if (!_.find(qualityOnline, { label })) {
          qualityOnline.push(qualityEntry);
        }
      }
    } catch (error) {}

    this.channels.qualityOnline = qualityOnline;
    this.channels.qualityOffline = qualityOffline;

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

    source.subscribe((data) => {
      this.stats = {
        channel,
        ...data,
      };
      this.statsSubject.next({
        channel,
        ...data,
      });
    });
  }
}
