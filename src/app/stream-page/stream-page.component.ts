import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import {
  MPD_STATS_SERVER,
  ProtocolsEnum,
  STATS_SERVER,
  StreamstatService,
} from '../streamstat.service';
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
  app = 'live';
  stream = 'main';
  protocol: ProtocolsEnum | string | null = null;
  server: string | null = null;
  showChat = false;

  stats = {
    isLive: false,
    viewers: 0,
    bitrate: 0,
    lastBitrate: 0,
    duration: 0,
    startTime: 0,
  };

  playerInit = false;
  chatUrl: SafeResourceUrl;
  loginUrl: SafeResourceUrl;
  stopFnc: (() => void) | null = null;

  paramsSubscription = null;
  subscription: Subscription | null = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private streamStats: StreamstatService,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnInit() {
    this.route.params.subscribe((params) => {
      this.app = params.app || 'live';
      this.stream = params.stream || 'main';

      this.showChat = localStorage.getItem('showChat') === 'true';

      const [, protocol] = (params.app || '').split('_');

      switch (protocol) {
        case 'mpd': {
          this.protocol = ProtocolsEnum.MPD;
          this.server = MPD_STATS_SERVER;

          break;
        }
        case 'hls': {
          this.protocol = ProtocolsEnum.HLS;
          this.server = MPD_STATS_SERVER;

          break;
        }
        case 'wss': {
          this.protocol = ProtocolsEnum.WSS;
          this.server = STATS_SERVER;

          break;
        }
        default: {
          this.protocol = null;
          this.server = STATS_SERVER;

          break;
        }
      }

      this.streamStats.setChannel(this.stream, this.app, this.server);

      this.playerInit = false;

      this.initPlayer();
      this.getChatUrl();
      this.getLoginUrl();
    });

    this.subscription = this.streamStats.statsSubject.subscribe((stats) => {
      this.stats = stats as any;
    });

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
    console.log('initPlayer', !!this.stopFnc);

    if (this.stopFnc) {
      this.stopFnc();

      this.stopFnc = null;
    }

    if (this.playerInit) {
      return;
    }

    this.playerInit = true;

    const playerSelector = document.getElementsByClassName('player-section')[0];

    const videoPlayer = document.createElement('video');

    videoPlayer.setAttribute('id', 'player');
    videoPlayer.setAttribute('controls', 'true');

    playerSelector.replaceChildren(videoPlayer);

    console.log('player loading...', this.app, this.stream, this.protocol);

    this.stopFnc = await createPlayer(
      this.app.split('_')[0],
      this.stream,
      this.protocol as string,
      videoPlayer,
    );

    console.log('player created');
  }
}
