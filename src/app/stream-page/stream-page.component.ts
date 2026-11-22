import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import environment from '../../environment';
import {
  formatStreamDuration,
  ProtocolsEnum,
  StreamStatService,
} from '../streamstat.service';
import { createPlayer } from '../utils/channels';

const VOLUME_STORAGE_KEY = 'streamVolume';
const MIN_SAVED_VOLUME = 0.1;

const PLAYER_MESSAGES = {
  loading: {
    icon: 'fa-circle-notch',
    title: 'Loading stream',
    description: 'Connecting to the live feed.',
  },
  offline: {
    icon: 'fa-broadcast-tower',
    title: 'Channel offline',
    description: 'This channel is currently off air.',
  },
  unavailable: {
    icon: 'fa-exclamation-circle',
    title: 'Stream unavailable',
    description: 'The live feed could not be loaded.',
  },
};

@Component({
  selector: 'app-stream-page',
  templateUrl: './stream-page.component.html',
  styleUrls: ['./stream-page.component.scss'],
})
export class StreamPageComponent implements OnInit, OnDestroy {
  stream = 'main';
  selectedQuality = '';
  showNavigation = true;
  homeUrl = environment.MAIN_PAGE_URL;
  stats: {
    isLive?: boolean;
    viewers?: number;
    duration?: string;
    bitrate?: number;
  } = {};
  playerState: 'loading' | 'ready' | 'unavailable' = 'loading';

  @ViewChild('playerContainer', { static: true })
  private playerContainer: ElementRef<HTMLDivElement>;

  private edgeUrl: string | null = null;
  private stopPlayer: (() => void) | null = null;
  private playerVideo: HTMLVideoElement | null = null;
  private subscriptions = new Subscription();

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private streamStats: StreamStatService,
  ) {}

  get playerMessage() {
    if (this.playerState === 'ready') {
      return null;
    }
    return PLAYER_MESSAGES[
      this.stats.isLive === false ? 'offline' : this.playerState
    ];
  }

  ngOnInit() {
    this.subscriptions.add(
      this.route.params.subscribe((params) => {
        this.stream = params.channel || params.stream || 'main';
        this.stats = {};
        this.selectedQuality = '';
        this.edgeUrl = null;
        this.clearPlayer();
        this.playerState = 'loading';

        this.streamStats.setChannel(this.stream);
      }),
    );

    this.subscriptions.add(
      this.streamStats.statsSubject.subscribe(({ channel, streams }) => {
        if (channel !== this.stream) {
          return;
        }

        const { app, protocol = ProtocolsEnum.FLV } =
          this.route.snapshot.params;
        const stream = streams.find(
          (entry) =>
            entry.protocol === protocol &&
            (!app || entry.app === app) &&
            entry.urls?.edge,
        );
        if (!stream) {
          this.stats = { isLive: false };
          this.selectedQuality = '';
          return;
        }

        this.stats = {
          isLive: true,
          viewers: streams.reduce((total, entry) => total + entry.viewers, 0),
          bitrate: stream.bitrate,
          duration: formatStreamDuration(stream.duration),
        };
        this.selectedQuality = `${channel}/${stream.protocol}/${stream.app}`;
        if (!this.edgeUrl) {
          this.edgeUrl = stream.urls.edge;
          this.initPlayer(this.edgeUrl, stream.protocol);
        }
      }),
    );

    this.subscriptions.add(
      this.route.queryParams.subscribe((query) => {
        if (query.token) {
          localStorage.setItem('token', query.token);

          this.router.navigate(['/'], {
            queryParams: {},
          });
        }
      }),
    );
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    this.clearPlayer();
  }

  private clearPlayer() {
    this.playerVideo = null;
    this.stopPlayer?.();
    this.stopPlayer = null;
    this.playerContainer.nativeElement.replaceChildren();
  }

  private async initPlayer(edgeUrl: string, protocol: ProtocolsEnum) {
    const videoPlayer = document.createElement('video');
    this.playerVideo = videoPlayer;
    const markReady = () => {
      if (this.playerVideo === videoPlayer) {
        this.playerState = 'ready';
      }
    };
    const markUnavailable = () => {
      if (this.playerVideo === videoPlayer) {
        this.playerState = 'unavailable';
      }
    };
    videoPlayer.addEventListener('loadeddata', markReady);
    videoPlayer.addEventListener('playing', markReady);
    videoPlayer.addEventListener('error', markUnavailable);

    videoPlayer.setAttribute('id', 'player');
    videoPlayer.controls = true;
    const savedVolume = Number(localStorage.getItem(VOLUME_STORAGE_KEY));
    if (savedVolume >= MIN_SAVED_VOLUME && savedVolume <= 1) {
      videoPlayer.volume = savedVolume;
    }
    videoPlayer.addEventListener('volumechange', () => {
      if (
        this.playerVideo === videoPlayer &&
        !videoPlayer.muted &&
        videoPlayer.volume >= MIN_SAVED_VOLUME
      ) {
        localStorage.setItem(VOLUME_STORAGE_KEY, String(videoPlayer.volume));
      }
    });
    videoPlayer.addEventListener(
      'click',
      (event) => {
        if (!videoPlayer.paused && event.detail > 0) {
          event.preventDefault();
        }
      },
      { capture: true },
    );

    // Firefox handles picture clicks inside its native controls without
    // dispatching them to the page. Cover the picture while it is playing.
    const playerSurface = document.createElement('div');
    playerSurface.className = 'stream-player-surface';
    videoPlayer.addEventListener('play', () =>
      playerSurface.classList.add('is-playing'),
    );
    videoPlayer.addEventListener('pause', () =>
      playerSurface.classList.remove('is-playing'),
    );
    playerSurface.append(videoPlayer);
    this.playerContainer.nativeElement.replaceChildren(playerSurface);

    try {
      const stopPlayer = await createPlayer(
        edgeUrl,
        protocol,
        videoPlayer,
        markUnavailable,
      );
      if (this.playerVideo === videoPlayer) {
        this.stopPlayer = stopPlayer;
      } else {
        stopPlayer();
      }
    } catch (error) {
      markUnavailable();
      console.error('Could not start stream', error);
    }
  }
}
