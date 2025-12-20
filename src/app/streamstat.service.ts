import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import humanizeDuration from 'humanize-duration';
import { BehaviorSubject, interval, Observable, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { find } from 'lodash';
import environment from 'src/environments/environment';
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
    origin: string;
    protocol: ProtocolsEnum;
    bitrate: number;
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
    qualityLive: QualityEntry[];
    qualityOffline: QualityEntry[];
  } = {
    online: [],
    offline: [],
    qualityLive: [],
    qualityOffline: [],
  };
  currentChannel;
  currentApp;
  currentServer;

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
    this.intervalSource = interval(30000).subscribe(() => {
      this.fetchStats(this.currentChannel);

      this.fetchChannels();
    });
  }

  setChannel(channel: string) {
    this.currentChannel = channel;

    if (this.currentChannel) {
      this.openedChannels.push(this.currentChannel);

      let openedChannelsJson = localStorage.getItem('channels');

      if (openedChannelsJson) {
        this.openedChannels = [
          ...this.openedChannels,
          ...JSON.parse(openedChannelsJson),
        ];
      }

      this.openedChannels = _.uniq(this.openedChannels);

      localStorage.setItem('channels', JSON.stringify(this.openedChannels));
    }

    this.fetchStats(this.currentChannel);
    this.fetchChannels();
  }

  async fetchChannels() {
    const liveChannels: string[] = [];
    const offlineChannels: string[] = [];

    const qualityLive: QualityEntry[] = [];
    const qualityOffline: QualityEntry[] = [];

    for (const channelName of this.openedChannels) {
      try {
        const {
          data: { streams },
        } = await axios.get<Stats>(url(channelName));

        if (streams.length > 0) {
          liveChannels.push(channelName);
        } else {
          offlineChannels.push(channelName);
        }
      } catch (error) {
        offlineChannels.push(channelName);
      }
    }

    const {
      data: { streams },
    } = await axios.get<Stats>(url(this.currentChannel));

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
        path: `${this.currentChannel}/${stream.protocol}/${stream.app}`,
      };

      if (stream?.isLive) {
        qualityLive.push(qualityEntry);
      } else {
        qualityOffline.push(qualityEntry);
      }
    }

    this.channels.online = liveChannels;
    this.channels.offline = offlineChannels;

    this.channels.qualityLive = qualityLive;
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
