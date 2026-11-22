import { Injectable, NgZone, OnDestroy } from '@angular/core';

const CYCLE_MS = 26_000;
const MESSAGES = [
  'THE FOREST IS LISTENING',
  'YOU ARE EARLY. THE BOARS ARE NOT.',
  'THE SECOND BOAR IS A REPEAT',
];
const THIRD_BOAR_MESSAGE = 'IF YOU SEE THREE, COUNT AGAIN';
const SCREENS = [
  { id: 7, x: 0, y: 0, width: 370, slant: 0 },
  { id: 1, x: -305, y: 22, width: 218, slant: 0.13 },
  { id: 3, x: 305, y: 22, width: 218, slant: -0.13 },
  { id: 8, x: -486, y: 39, width: 142, slant: 0.18 },
  { id: 10, x: 486, y: 39, width: 142, slant: -0.18 },
];
const PINE =
  'M-7 0V-22H-45L-23-58H-35L-16-91H-23L0-155L23-91H16L35-58H23L45-22H7V0Z';

export const SCREEN_VIDEOS = SCREENS.map(({ id }) => id);

@Injectable()
export class EngineService implements OnDestroy {
  private readonly motion = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  );
  private readonly pine = new Path2D(PINE);
  private readonly boar = new Image();
  private readonly signal = document.createElement('canvas');
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private observer?: ResizeObserver;
  private feeds: HTMLVideoElement[] = [];
  private started = 0;
  private lastDraw = 0;
  private frame?: number;
  private phase = 0;
  private message = '';
  private synchronized = false;
  private notifyCrossing: (crossing: boolean) => void;
  private crossing = false;

  constructor(private zone: NgZone) {}

  start(
    canvas: HTMLCanvasElement,
    feeds: HTMLVideoElement[],
    notifyCrossing: (crossing: boolean) => void,
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    if (!this.ctx) {
      return;
    }

    this.feeds = feeds;
    this.notifyCrossing = notifyCrossing;
    this.signal.width = 768;
    this.signal.height = 432;

    this.zone.runOutsideAngular(() => {
      this.boar.onload = () => this.draw();
      this.boar.src = '/assets/images/index/boar.png';
      this.observer = new ResizeObserver(() => this.resize());
      this.observer.observe(canvas);
      this.resize();
      this.motion.addEventListener('change', this.applyMotion);
      this.applyMotion();
    });
  }

  syncScreens(message: string) {
    if (!this.ctx) {
      return;
    }
    this.synchronized = true;
    this.paintSignal(message, this.feeds[0]);
    this.draw();
  }

  resumeFeeds() {
    this.synchronized = false;
    this.message = '';
    if (this.motion.matches && this.ctx) {
      this.showMessage(MESSAGES[0]);
      this.draw();
    }
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.frame);
    this.observer?.disconnect();
    this.motion.removeEventListener('change', this.applyMotion);
    this.boar.onload = null;
    this.feeds.forEach((feed) => feed.pause());
  }

  private readonly applyMotion = () => {
    cancelAnimationFrame(this.frame);
    this.phase = 0;
    this.setCrossing(false);
    if (this.motion.matches) {
      this.feeds.forEach((feed) => feed.pause());
      if (!this.synchronized) {
        this.showMessage(MESSAGES[0]);
      }
      this.draw();
      return;
    }

    this.feeds.forEach((feed) => feed.play().catch(() => {}));
    this.started = performance.now();
    this.frame = requestAnimationFrame(this.animate);
  };

  private readonly animate = (now: number) => {
    if (now - this.lastDraw >= 32) {
      this.lastDraw = now;
      const elapsed = now - this.started;
      this.phase = elapsed % CYCLE_MS;
      this.setCrossing(this.phase >= 6200 && this.phase < 16_900);
      if (!this.synchronized) {
        const cycle = Math.floor(elapsed / CYCLE_MS);
        if (this.phase >= 16_900 && this.phase < 21_500) {
          this.showMessage(THIRD_BOAR_MESSAGE);
        } else if (this.phase >= 1800 && this.phase < 6200) {
          this.showMessage(MESSAGES[cycle % MESSAGES.length]);
        } else {
          this.showMessage('');
        }
      }
      this.draw();
    }
    this.frame = requestAnimationFrame(this.animate);
  };

  private setCrossing(crossing: boolean) {
    if (crossing !== this.crossing) {
      this.crossing = crossing;
      this.zone.run(() => this.notifyCrossing(crossing));
    }
  }

  private resize() {
    const ratio = Math.min(window.devicePixelRatio, 1.75);
    this.canvas.width = Math.round(this.canvas.clientWidth * ratio);
    this.canvas.height = Math.round(this.canvas.clientHeight * ratio);
    this.draw();
  }

  private draw() {
    const { width, height } = this.canvas;
    if (!width || !height) {
      return;
    }
    const ctx = this.ctx;
    const narrow = width / height < 0.85;
    const scale = Math.min(width / (narrow ? 730 : 1140), height / 410);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.setTransform(
      scale,
      0,
      0,
      scale,
      width / 2,
      height * (narrow ? 0.4 : 0.53),
    );

    this.drawForest(width / scale);
    this.drawBoar(6200, 5300, 148, 1);
    this.drawBoar(11_900, 5000, 112, -1);
    SCREENS.forEach((screen, index) => this.drawScreen(screen, index));
  }

  private drawForest(viewWidth: number) {
    const ctx = this.ctx;
    ['#17302a', '#102720', '#0c1b19'].forEach((color, layer) => {
      ctx.fillStyle = color;
      ctx.fillRect(
        -viewWidth / 2,
        112 + layer * 12,
        viewWidth,
        58 - layer * 12,
      );
      for (
        let x = -Math.ceil(viewWidth / 156);
        x <= Math.ceil(viewWidth / 156);
        x++
      ) {
        const height = 0.72 + (Math.abs(x * 7 + layer * 3) % 11) / 8;
        ctx.save();
        ctx.translate(x * 78 + layer * 26, 115 + layer * 12);
        ctx.scale(1.2, height);
        ctx.fill(this.pine);
        ctx.restore();
      }
    });
    const ground = ctx.createLinearGradient(0, 127, 0, 176);
    ground.addColorStop(0, '#09161300');
    ground.addColorStop(0.68, '#091613');
    ground.addColorStop(1, '#09161300');
    ctx.fillStyle = ground;
    ctx.fillRect(-viewWidth / 2, 127, viewWidth, 49);
  }

  private drawBoar(
    start: number,
    duration: number,
    size: number,
    direction: number,
  ) {
    const progress = (this.phase - start) / duration;
    if (progress < 0 || progress >= 1 || !this.boar.naturalWidth) {
      return;
    }
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(
      direction * (-620 + 1240 * progress),
      134 + Math.sin(progress * 54) * 5,
    );
    ctx.scale(direction, 1);
    ctx.filter =
      'brightness(0.65) sepia(0.35) drop-shadow(0px 0px 5px #6ac9a080)';
    ctx.drawImage(this.boar, -size / 2, -size / 2, size, size);
    ctx.restore();
  }

  private drawScreen(
    { x, y, width, slant }: typeof SCREENS[number],
    index: number,
  ) {
    const ctx = this.ctx;
    const height = (width * 9) / 16;
    const left = -width / 2;
    const top = -height / 2;
    ctx.save();
    ctx.translate(x, y);
    ctx.transform(1, slant, 0, 1, 0, 0);
    ctx.shadowColor = '#000a';
    ctx.shadowBlur = 13;
    ctx.fillStyle = '#0a1515';
    ctx.beginPath();
    ctx.roundRect(left - 13, top - 12, width + 26, height + 32, 9);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#3c5b53';
    ctx.strokeRect(left - 3, top - 3, width + 6, height + 6);
    ctx.fillStyle = '#0d2320';
    ctx.fillRect(left, top, width, height);

    const feed = this.feeds[index];
    if (this.synchronized || (index === 0 && this.message)) {
      ctx.drawImage(this.signal, left, top, width, height);
    } else if (feed.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      ctx.drawImage(feed, left, top, width, height);
      ctx.fillStyle = '#071e2344';
      ctx.fillRect(left, top, width, height);
    }

    ctx.fillStyle = '#8affc8';
    ctx.shadowColor = '#6dffb3';
    ctx.shadowBlur = 6;
    ctx.fillRect(width / 2 - 9, height / 2 + 10, 6, 2);
    ctx.restore();
  }

  private showMessage(message: string) {
    if (message !== this.message) {
      this.message = message;
      if (message) {
        this.paintSignal(message);
      }
    }
  }

  private paintSignal(message: string, still?: HTMLVideoElement) {
    const { width, height } = this.signal;
    const ctx = this.signal.getContext('2d');
    ctx.fillStyle = '#0b251e';
    ctx.fillRect(0, 0, width, height);
    if (still && still.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      ctx.drawImage(still, 0, 0, width, height);
      ctx.fillStyle = '#102420ba';
      ctx.fillRect(0, 0, width, height);
    }
    ctx.fillStyle = '#0003';
    for (let y = 0; y < height; y += 5) {
      ctx.fillRect(0, y, width, 2);
    }
    ctx.strokeStyle = '#78c0a1';
    ctx.lineWidth = 2;
    ctx.strokeRect(24, 24, width - 48, height - 48);
    ctx.fillStyle = '#d0ffea';
    ctx.shadowColor = '#56efad';
    ctx.shadowBlur = 14;
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(message, width / 2, height / 2, width - 90);
    ctx.shadowBlur = 0;
  }
}
