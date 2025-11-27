import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import humanizeDuration from 'humanize-duration';
import { BehaviorSubject, interval, Observable, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { find } from 'lodash';
import environment from 'src/environments/environment';
import * as _ from 'lodash';
import axios from 'axios';

export const STATS_SERVER = new URL(environment.WSS_URL).hostname;
export const MPD_STATS_SERVER = new URL(environment.MPD_URL).hostname;

const url = (name, app, host) =>
  `${environment.STATS_URL}/channels/${host}/${app}/${name}`;

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
  WSS = 'wss',
  MPD = 'mpd',
  HLS = 'hls',
}

interface Stats {
  duration: number;
  viewers: number;
  isLive: boolean;
  startTime: string;
  name: string;
}

interface IListResponse {
  channels: string[];
  live: {
    app: string;
    channel: string;
  }[];
}

@Injectable({
  providedIn: 'root',
})
export class StreamstatService {
  stats = {};

  openedChannels: string[] = [];

  channels: {
    online: string[];
    offline: string[];
    qualityLive: string[];
    qualityOffline: string[];
  } = {
    online: [],
    offline: [],
    qualityLive: [],
    qualityOffline: [],
  };
  currentChannel = '';
  currentApp = '';
  currentServer = '';

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
      this.fetchStats(this.currentChannel, this.currentApp, this.currentServer);

      this.fetchChannels();
    });
  }

  setChannel(channel: string, app: string, server: string) {
    this.stats = {};

    this.currentChannel = channel;
    this.currentApp = app;
    this.currentServer = server;

    console.log('currentChannel', this.currentChannel);

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

    this.fetchStats(this.currentChannel, this.currentApp, this.currentServer);
    this.fetchChannels();
  }

  async fetchChannels() {
    const liveChannels: string[] = [];
    const offlineChannels: string[] = [];

    const qualityLive: string[] = [];
    const qualityOffline: string[] = [];

    for (const channelName of this.openedChannels) {
      try {
        const {
          data: { isLive },
        } = await axios.get<Stats>(
          url(channelName, 'live', this.currentServer),
        );

        if (isLive) {
          liveChannels.push(channelName);
        } else {
          offlineChannels.push(channelName);
        }
      } catch (error) {
        offlineChannels.push(channelName);
      }
    }

    for (const qualityName of [
      {
        server: STATS_SERVER,
        app: 'live',
      },
      {
        server: STATS_SERVER,
        app: 'encode',
      },
      {
        server: MPD_STATS_SERVER,
        app: 'live_mpd',
      },
      {
        server: MPD_STATS_SERVER,
        app: 'live_hls',
      },
    ]) {
      try {
        const {
          data: { isLive },
        } = await axios.get<Stats>(
          url(this.currentChannel, qualityName.app, qualityName.server),
        );

        if (isLive) {
          qualityLive.push(`${qualityName.app}/${this.currentChannel}`);
        } else {
          qualityOffline.push(`${qualityName.app}/${this.currentChannel}`);
        }
      } catch (error) {
        qualityOffline.push(`${qualityName.app}/${this.currentChannel}`);
      }
    }

    this.channels.online = liveChannels;
    this.channels.offline = offlineChannels;

    this.channels.qualityLive = qualityLive;
    this.channels.qualityOffline = qualityOffline;

    this.onlineChannels.next(this.channels);
  }

  fetchStats(channel: string, app: string, server: string) {
    if (!channel || !app || !server) {
      this.stats = {};

      return;
    }

    const source = this.http
      .get(url(channel, app, server), {
        headers: {
          'jwt-token': window.localStorage.getItem('token') ?? '',
        },
      })
      .pipe(
        map((resp) => ({
          ...resp,
          name: channel,
          duration: fixTime((resp as Stats).duration),
        })),
      );

    source.subscribe((data) => {
      this.stats = data;
      this.statsSubject.next(data);
    });
  }
}
