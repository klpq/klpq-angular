import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { ProtocolsEnum, StreamStatService, Stats } from '../streamstat.service';
import { createPlayer } from '../utils/channels';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import * as _ from 'lodash';

import environment from '../../environment';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-stream-page',
  templateUrl: './stream-page.component.html',
  styleUrls: ['./stream-page.component.scss'],
})
export class StreamPageComponent implements OnInit, OnDestroy {
  channel: string;
  protocol: ProtocolsEnum;
  app: string;
  edgeUrl: string;

  showChat = false;

  stats: {
    isLive: boolean;
    viewers: number;
    bitrate: number;
    duration: number;
    startTime: Date;
  } = null;

  playerInit = false;
  chatUrl: SafeResourceUrl;
  loginUrl: SafeResourceUrl;

  stopFnc: (() => void) | null = null;

  paramsSubscription = null;
  subscription: Subscription | null = null;

  gotFirstStats = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private streamStats: StreamStatService,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnInit() {
    console.log('ngOnInit');

    this.showChat = localStorage.getItem('showChat') === 'true';

    this.route.params.subscribe((params) => {
      console.log('params', params);

      this.channel = params.channel || 'main';
      this.protocol = params.protocol || ProtocolsEnum.FLV;
      this.app = params.app;
      this.edgeUrl = null;

      this.streamStats.setChannel(this.channel);

      this.playerInit = false;

      this.gotFirstStats = false;

      this.initPlayer();
      this.getChatUrl();
      this.getLoginUrl();
    });

    this.subscription = this.streamStats.statsSubject.subscribe(
      ({ streams, channel }) => {
        console.log(
          'streamStats',
          this.channel,
          this.gotFirstStats,
          streams,
          channel,
        );

        if (channel !== this.channel) {
          return;
        }

        console.log(this.channel, this.protocol, this.app, this.edgeUrl);

        if (streams.length === 0) {
          return;
        }

        if (this.gotFirstStats) {
          return;
        }

        let viewers = 0;

        streams.forEach((s) => {
          viewers += s.viewers;
        });

        for (const stream of streams) {
          if (!this.protocol && [ProtocolsEnum.FLV].includes(stream.protocol)) {
            this.protocol = stream.protocol;
            this.app = stream.app;
            this.edgeUrl = stream.urls.edge;

            this.stats = {
              isLive: true,
              viewers,
              bitrate: stream.bitrate,
              duration: stream.duration,
              startTime: new Date(stream.startTime),
            };

            break;
          }

          if (this.protocol == stream.protocol) {
            this.protocol = stream.protocol;
            this.app = stream.app;
            this.edgeUrl = stream.urls.edge;

            this.stats = {
              isLive: true,
              viewers,
              bitrate: stream.bitrate,
              duration: stream.duration,
              startTime: new Date(stream.startTime),
            };

            break;
          }
        }

        this.gotFirstStats = true;

        this.initPlayer();
      },
    );

    this.route.queryParams.subscribe((query) => {
      console.log('query', query);

      if (query.token) {
        localStorage.setItem('token', query.token);

        this.router.navigate(['/'], {
          queryParams: {},
        });
      }
    });
  }

  ngOnDestroy() {
    console.log('ngOnDestroy');

    if (this.stopFnc) {
      this.stopFnc();

      this.stopFnc = null;
    }
  }

  toggleChat() {
    this.showChat = !this.showChat;
    localStorage.setItem('showChat', String(this.showChat));
  }

  redirectHome() {
    console.log(environment.MAIN_PAGE_URL);

    window.location.href = `${environment.MAIN_PAGE_URL}`;
  }

  getChatUrl() {
    // const url = `${URL}podkolpakom_${this.stream}`;
    const url = environment.CHAT_URL;
    this.chatUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  getLoginUrl() {
    const redirectUri = `${environment.STREAM_PAGE_REDIRECT_URL}/login?token=`;

    this.loginUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
      `${
        environment.STATS_URL
      }/users/auth/google?redirectUri=${encodeURIComponent(redirectUri)}`,
    );
  }

  async initPlayer() {
    console.log(
      'initPlayer',
      !!this.stopFnc,
      this.channel,
      this.protocol,
      this.app,
      this.edgeUrl,
    );

    if (this.stopFnc) {
      this.stopFnc();

      this.stopFnc = null;
    }

    if (this.playerInit) {
      return;
    }

    if (this.protocol && this.app && this.edgeUrl) {
      this.playerInit = true;

      const playerSelector =
        document.getElementsByClassName('player-section')[0];

      const videoPlayer = document.createElement('video');

      videoPlayer.setAttribute('id', 'player');
      videoPlayer.setAttribute('controls', 'true');

      playerSelector.replaceChildren(videoPlayer);

      console.log('player loading...', this.channel, this.app, this.protocol);

      this.stopFnc = await createPlayer(
        this.protocol,
        this.edgeUrl,
        videoPlayer,
      );

      console.log('player created');
    }
  }
}
