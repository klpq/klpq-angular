import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  QueryList,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import { EngineService, SCREEN_VIDEOS } from './engine.service';

const TRANSMISSION = 'THE STATION REMEMBERS YOU';

@Component({
  selector: 'app-index-page',
  templateUrl: './index-page.component.html',
  styleUrls: ['./index-page.component.scss'],
  providers: [EngineService],
})
export class IndexPageComponent implements AfterViewInit, OnDestroy {
  readonly screenVideos = SCREEN_VIDEOS;
  transmission = '';
  crossing = false;
  soundOn = false;

  @ViewChild('rendererCanvas') private canvas: ElementRef<HTMLCanvasElement>;
  @ViewChild('ambience') private ambience: ElementRef<HTMLAudioElement>;
  @ViewChildren('feed') private feeds: QueryList<ElementRef<HTMLVideoElement>>;

  private transmissionTimer: number;

  constructor(private engine: EngineService) {}

  ngAfterViewInit() {
    this.engine.start(
      this.canvas.nativeElement,
      this.feeds.map((feed) => feed.nativeElement),
      (crossing) => (this.crossing = crossing),
    );
  }

  ngOnDestroy() {
    window.clearTimeout(this.transmissionTimer);
  }

  receiveTransmission() {
    window.clearTimeout(this.transmissionTimer);
    this.transmission = TRANSMISSION;
    this.engine.syncScreens(TRANSMISSION);
    this.transmissionTimer = window.setTimeout(() => {
      this.transmission = '';
      this.engine.resumeFeeds();
    }, 4800);
  }

  async toggleSound() {
    const audio = this.ambience.nativeElement;
    if (!audio.paused) {
      audio.pause();
      this.soundOn = false;
      return;
    }

    try {
      audio.volume = 0.35;
      await audio.play();
      this.soundOn = true;
    } catch {
      this.soundOn = false;
    }
  }
}
