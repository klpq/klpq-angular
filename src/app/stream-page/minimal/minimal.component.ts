import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  MPD_STATS_SERVER,
  ProtocolsEnum,
  STATS_SERVER,
  StreamstatService,
} from 'src/app/streamstat.service';
import {
  createPlayer,
  getHlsLink,
  getLink,
  getMpdLink,
} from '../../utils/channels';
import { SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-minimal',
  templateUrl: './minimal.component.html',
  styleUrls: ['./minimal.component.scss'],
})
export class MinimalComponent implements OnInit, OnDestroy {
  app = 'live';
  stream = 'main';
  protocol: ProtocolsEnum = null;
  server = null;

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
  stopFnc: () => void = null;

  paramsSubscription = null;
  subscription = null;

  constructor(
    private route: ActivatedRoute,
    private streamStats: StreamstatService,
  ) {}

  ngOnInit() {
    this.route.params.subscribe((params) => {
      this.app = params.app || 'live';
      this.stream = params.stream || 'main';

      this.streamStats.setChannel(this.stream, this.app, this.server);

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

      this.playerInit = false;
      this.initPlayer();
    });

    this.subscription = this.streamStats.statsSubject.subscribe((stats) => {
      this.stats = stats as any;
    });
  }

  ngOnDestroy() {
    console.log('ngOnDestroy');

    if (this.stopFnc) {
      this.stopFnc();
    }
  }

  async initPlayer() {
    if (this.stopFnc) {
      this.stopFnc();
    }

    console.log('initPlayer');

    if (this.playerInit) {
      return;
    }

    this.playerInit = true;

    const playerSelector = document.getElementsByClassName('player-section')[0];

    const videoPlayer = document.createElement('video');

    videoPlayer.setAttribute('id', 'player');
    videoPlayer.setAttribute('controls', 'true');

    (playerSelector as any).replaceChildren(videoPlayer);

    console.log('loading player', this.app, this.stream, this.protocol);

    this.stopFnc = await createPlayer(
      this.app.split('_')[0],
      this.stream,
      this.protocol,
      videoPlayer,
    );
  }
}
