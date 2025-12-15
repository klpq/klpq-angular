import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { ProtocolsEnum, StreamStatService, Stats } from '../streamstat.service';
import { createPlayer } from '../utils/channels';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import * as _ from 'lodash';

import environment from '../../environments/environment';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-stream-page',
  templateUrl: './stream-page.component.html',
  styleUrls: ['./stream-page.component.scss'],
})
export class StreamPageComponent implements OnInit, OnDestroy {
  stream = 'main';
  app: string;
  server: string;
  protocol: ProtocolsEnum;

  showChat = false;

  stats: Stats['streams'][0];

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
    this.route.params.subscribe((params) => {
      console.log(params);

      this.stream = params.stream || 'main';
      this.app = params.app;
      this.protocol = null;
      this.server = null;

      this.showChat = localStorage.getItem('showChat') === 'true';

      this.streamStats.setChannel(this.stream);

      this.playerInit = false;

      this.gotFirstStats = false;

      this.initPlayer();
      this.getChatUrl();
      this.getLoginUrl();
    });

    this.subscription = this.streamStats.statsSubject.subscribe(
      ({ streams }) => {
        console.log('gotFirstStats', this.stream, this.gotFirstStats, streams);

        console.log(this.stream, this.app, this.protocol, this.server);

        if (streams.length === 0) {
          return;
        }

        if (this.gotFirstStats) {
          return;
        }

        if (this.app && this.protocol && this.server) {
          const stream = _.find(streams, {
            app: this.app,
            server: this.server,
            protocol: this.protocol,
          });

          this.stats = stream;
        } else {
          const stream = streams[0];

          this.app = stream?.app;

          this.server = stream?.server;

          this.protocol = stream?.protocol;

          this.stats = stream;
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
      this.app,
      this.protocol,
      this.server,
    );

    if (this.stopFnc) {
      this.stopFnc();

      this.stopFnc = null;
    }

    if (this.playerInit) {
      return;
    }

    if (this.app && this.protocol && this.server) {
      this.playerInit = true;

      const playerSelector =
        document.getElementsByClassName('player-section')[0];

      const videoPlayer = document.createElement('video');

      videoPlayer.setAttribute('id', 'player');
      videoPlayer.setAttribute('controls', 'true');

      playerSelector.replaceChildren(videoPlayer);

      console.log('player loading...', this.app, this.stream, this.protocol);

      this.stopFnc = await createPlayer(
        this.server,
        this.app,
        this.stream,
        this.protocol as ProtocolsEnum,
        videoPlayer,
      );

      console.log('player created');
    }
  }
}
