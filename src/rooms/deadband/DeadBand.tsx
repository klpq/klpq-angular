import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { murmurOfTheDay } from '../../data/murmurs';
import { Snow } from '../../design/ui';
import { sound } from '../waiting/sound';

const MIN = 1800;
const MAX = 5400;
const KLPQ = 4625;
const PX_PER_KHZ = 1.5;
const REACH = 120;

const clip = (id: string) => `/assets/images/index/${id}.mp4`;

type Apparition = { at: number } & (
  | { kind: 'video'; src: string; from?: number; filter?: string }
  | { kind: 'image'; src: string; className: string; filter?: string }
  | { kind: 'web'; card: ReactNode }
  | { kind: 'words'; text: string }
);

const photo = 'inset-0 h-full w-full object-cover';

/** What the dial passes on the way in. Order is the order you meet them. */
const BAND: Apparition[] = [
  {
    at: 1960,
    kind: 'web',
    card: (
      <>
        <b>Sign in to continue</b>
        <p className="my-2">You must be signed in to view this content.</p>
        <div className="flex gap-2">
          <span className="border-2 border-white bg-white px-10 py-0.5 [border-style:inset]">
            &nbsp;
          </span>
          <span className="border-2 border-white px-3 [border-style:outset]">
            OK
          </span>
        </div>
      </>
    ),
  },
  {
    at: 2150,
    kind: 'video',
    src: clip('2'),
    from: 4,
    filter: 'sepia(0.5) contrast(1.3)',
  },
  {
    at: 2340,
    kind: 'image',
    src: '/assets/images/stream/kaban.png',
    className: `${photo} [image-rendering:pixelated]`,
    filter: 'contrast(1.5) saturate(0.4)',
  },
  { at: 2530, kind: 'words', text: 'who is feeding the pig' },
  {
    at: 2720,
    kind: 'video',
    src: clip('4'),
    from: 8,
    filter: 'contrast(1.3) hue-rotate(-12deg)',
  },
  {
    at: 2910,
    kind: 'image',
    src: '/stock/lynch-1990.jpg',
    className: `${photo} object-[50%_18%]`,
    filter: 'grayscale(1) contrast(1.7) brightness(0.9)',
  },
  {
    at: 3100,
    kind: 'image',
    src: '/assets/images/index/bg.jpg',
    className: photo,
    filter: 'contrast(1.6) brightness(1.5) hue-rotate(160deg)',
  },
  {
    at: 3290,
    kind: 'video',
    src: clip('6'),
    from: 5,
    filter: 'contrast(1.25) saturate(1.5)',
  },
  {
    at: 3480,
    kind: 'image',
    src: '/stock/diner.jpg',
    className: photo,
    filter: 'sepia(0.9) contrast(1.5) hue-rotate(-28deg) saturate(1.8)',
  },
  {
    at: 3670,
    kind: 'video',
    src: clip('10'),
    from: 8,
    filter: 'saturate(0.5) contrast(1.4)',
  },
  { at: 3860, kind: 'words', text: 'you left the television on' },
  {
    at: 4050,
    kind: 'image',
    src: '/stock/road.jpg',
    className: photo,
    filter: 'grayscale(1) contrast(1.8) brightness(0.7) invert(1)',
  },
  {
    at: 4230,
    kind: 'image',
    src: '/stock/maclachlan.jpg',
    className: `${photo} object-[70%_30%]`,
    filter:
      'grayscale(1) contrast(2.1) brightness(0.85) sepia(1) hue-rotate(175deg) saturate(2.4)',
  },
  {
    at: 4410,
    kind: 'video',
    src: clip('3'),
    from: 1,
    filter: 'contrast(1.4) saturate(1.3)',
  },
];

/** The needle stops at each one long enough to see it. */
const STOPS = [...BAND.map((entry) => entry.at), KLPQ];
const TRAVEL = 520;
const HOLD = 1050;

const nearness = (at: number, freq: number) =>
  Math.max(0, 1 - Math.abs(at - freq) / REACH);

export function DeadBand({ onEnter }: { onEnter: () => void }) {
  const [freq, setFreq] = useState(MIN + 60);
  const [locked, setLocked] = useState(false);
  const videos = useRef(new Map<number, HTMLVideoElement>());
  const state = useRef({
    freq: MIN + 60,
    auto: true,
    start: 0,
    heldSince: 0,
    drag: null as null | { x: number; f: number },
  });

  useEffect(() => {
    let frame = 0;
    const s = state.current;
    s.start = performance.now();
    const tick = (now: number) => {
      if (s.auto) {
        const elapsed = Math.max(0, now - s.start);
        const index = Math.min(
          STOPS.length - 1,
          Math.floor(elapsed / (TRAVEL + HOLD)),
        );
        const within = elapsed - index * (TRAVEL + HOLD);
        const from = index === 0 ? MIN + 60 : STOPS[index - 1];
        const to = STOPS[index];
        if (within < TRAVEL) {
          const t = within / TRAVEL;
          s.freq = from + (to - from) * (t * t * (3 - 2 * t));
        } else {
          // the hand on the dial is not perfectly steady
          s.freq = to + (to === KLPQ ? 0 : Math.sin(now / 130) * 5);
        }
      }
      const signal = Math.max(0, 1 - Math.abs(s.freq - KLPQ) / 110);
      sound.tune(signal);
      if (signal > 0.9) {
        s.heldSince ||= now;
        if (now - s.heldSince > 350) setLocked(true);
      } else {
        s.heldSince = 0;
        setLocked(false);
      }
      videos.current.forEach((video, at) => {
        const near = nearness(at, s.freq) > 0;
        if (near && video.paused) video.play().catch(() => {});
        if (!near && !video.paused) video.pause();
      });
      setFreq(s.freq);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const skip = () => onEnter();
    window.addEventListener('keydown', skip);
    return () => window.removeEventListener('keydown', skip);
  }, [onEnter]);

  const signal = Math.max(0, 1 - Math.abs(freq - KLPQ) / 110);
  const bars = Math.round(signal * 12);
  const strongest = Math.max(...BAND.map((entry) => nearness(entry.at, freq)));

  const onPointerDown = (event: React.PointerEvent) => {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    state.current.auto = false;
    state.current.drag = { x: event.clientX, f: state.current.freq };
  };
  const onPointerMove = (event: React.PointerEvent) => {
    const drag = state.current.drag;
    if (!drag) return;
    const next = drag.f - (event.clientX - drag.x) / PX_PER_KHZ;
    state.current.freq = Math.min(MAX, Math.max(MIN, next));
  };
  const onPointerUp = () => (state.current.drag = null);

  const labels = [];
  for (let f = MIN; f <= MAX; f += 200) labels.push(f);

  return (
    <div
      className="grain vignette fixed inset-0 cursor-pointer overflow-hidden bg-void select-none"
      onClick={onEnter}
    >
      {/* what is still out there */}
      <div className="absolute inset-0" aria-hidden>
        {BAND.map((entry) => {
          const near = nearness(entry.at, freq);
          if (near <= 0 && entry.kind !== 'video') return null;
          const drift = (entry.at - freq) * 0.55;
          const base: CSSProperties = {
            opacity: Math.pow(near, 0.6) * (1 - signal),
            transform: `translateX(${drift}px) skewX(${(1 - near) * (drift > 0 ? 7 : -7)}deg) scale(${1.06 + (1 - near) * 0.12})`,
          };
          const smear = `blur(${(1 - near) * 7}px)`;

          if (entry.kind === 'video') {
            return (
              <video
                key={entry.at}
                ref={(node) => {
                  if (node) videos.current.set(entry.at, node);
                  else videos.current.delete(entry.at);
                }}
                src={`${entry.src}#t=${entry.from ?? 0}`}
                muted
                loop
                playsInline
                preload="auto"
                className="absolute inset-0 h-full w-full object-cover"
                style={{ ...base, filter: `${entry.filter ?? ''} ${smear}` }}
              />
            );
          }
          if (entry.kind === 'image') {
            return (
              <img
                key={entry.at}
                src={entry.src}
                alt=""
                className={`absolute ${entry.className}`}
                style={{ ...base, filter: `${entry.filter ?? ''} ${smear}` }}
              />
            );
          }
          if (entry.kind === 'words') {
            return (
              <div
                key={entry.at}
                className="absolute inset-0 flex items-center justify-center px-6 pb-[22vh] text-center"
                style={{ ...base, filter: smear }}
              >
                <p className="font-serif text-[min(11vw,92px)] leading-[0.95] text-bone italic chroma-split">
                  {entry.text}
                </p>
              </div>
            );
          }
          return (
            <div
              key={entry.at}
              className="absolute top-[38%] left-1/2 w-[min(86vw,360px)]"
              style={{
                ...base,
                transform: `translate(-50%, -50%) ${base.transform}`,
                filter: smear,
              }}
            >
              <div className="dead-web">{entry.card}</div>
            </div>
          );
        })}
      </div>

      {/* buried in snow */}
      <div
        className="absolute inset-0"
        style={{
          opacity: Math.max(0.07, 0.6 - strongest * 0.44 - signal * 0.55),
        }}
      >
        <Snow />
      </div>
      <div className="scanlines pointer-events-none absolute inset-0 opacity-70" />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[18vh] animate-roll bg-gradient-to-b from-transparent via-bone/10 to-transparent"
        style={{ opacity: 1 - signal }}
      />

      <div
        className="absolute inset-0"
        style={{
          opacity: signal,
          background:
            'radial-gradient(ellipse at 50% 42%, rgb(163 13 20 / 0.95), rgb(74 5 9 / 0.6) 38%, transparent 70%)',
        }}
      />

      <p className="absolute top-4 right-4 font-mono text-[10px] tracking-[0.3em] text-bone/35 sm:top-6 sm:right-6">
        ANY KEY
      </p>

      {/* the signal */}
      <div
        className="pointer-events-none absolute top-[40%] left-1/2 w-full -translate-x-1/2 -translate-y-1/2 text-center"
        style={{ opacity: Math.pow(signal, 1.6) }}
      >
        <h1
          className="font-card text-[min(38vw,300px)] leading-[0.8] text-bone halation"
          style={{
            letterSpacing: `${(1 - signal) * 0.4}em`,
            filter: `blur(${(1 - signal) * 10}px)`,
          }}
        >
          KLPQ
        </h1>
        <div
          className="mt-4 font-mono text-[min(3.4vw,15px)] tracking-[0.9em] text-phosphor/80 transition-opacity duration-1000"
          style={{ opacity: locked ? 1 : 0 }}
        >
          подколпаком
        </div>
        <p
          className="mx-auto mt-7 max-w-[82vw] font-serif text-[min(5vw,24px)] text-bone italic transition-opacity delay-500 duration-[1600ms]"
          style={{ opacity: locked ? 1 : 0 }}
        >
          {murmurOfTheDay()}
        </p>
      </div>

      {/* the dial */}
      <div className="absolute inset-x-0 bottom-0 pb-[max(env(safe-area-inset-bottom),18px)]">
        <div className="mb-3 flex items-end justify-center gap-5 font-mono">
          <div className="text-right">
            <div className="text-[10px] tracking-[0.3em] text-phosphor/60">
              {locked
                ? 'CARRIER LOCKED'
                : signal > 0.05
                  ? 'CARRIER'
                  : 'NO CARRIER'}
            </div>
            <div className="text-3xl font-bold text-phosphor tabular-nums halation sm:text-5xl">
              {freq.toFixed(1)}
              <span className="ml-2 text-sm sm:text-lg">kHz</span>
            </div>
          </div>
          <div className="mb-1.5 flex items-end gap-[3px]" aria-hidden>
            {Array.from({ length: 12 }, (_, i) => (
              <span
                key={i}
                className={i < bars ? 'bg-phosphor' : 'bg-phosphor/15'}
                style={{ width: 4, height: 6 + i * 2.4 }}
              />
            ))}
          </div>
        </div>

        <div
          className="relative h-24 cursor-ew-resize touch-none overflow-hidden border-y border-bone/25 bg-black/65"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onClick={(event) => event.stopPropagation()}
          role="slider"
          aria-label="Tuning dial"
          aria-valuemin={MIN}
          aria-valuemax={MAX}
          aria-valuenow={Math.round(freq)}
        >
          <div
            className="absolute top-0 left-1/2 h-full"
            style={{
              width: (MAX - MIN) * PX_PER_KHZ,
              transform: `translateX(${-(freq - MIN) * PX_PER_KHZ}px)`,
              backgroundImage: `repeating-linear-gradient(to right, rgb(232 223 200 / 0.75) 0 1px, transparent 1px ${20 * PX_PER_KHZ}px), repeating-linear-gradient(to right, rgb(232 223 200 / 0.9) 0 2px, transparent 2px ${200 * PX_PER_KHZ}px)`,
              backgroundSize: `auto 14px, auto 30px`,
              backgroundRepeat: 'repeat-x',
            }}
          >
            {labels.map((f) => (
              <span
                key={f}
                className="absolute top-9 -translate-x-1/2 font-mono text-[11px] text-bone/60"
                style={{ left: (f - MIN) * PX_PER_KHZ }}
              >
                {f}
              </span>
            ))}
            {BAND.map((entry) => (
              <span
                key={entry.at}
                className="absolute bottom-3 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-bone/30"
                style={{ left: (entry.at - MIN) * PX_PER_KHZ }}
              />
            ))}
            <span
              className="absolute bottom-1.5 -translate-x-1/2 font-card text-xl tracking-wider text-lodge"
              style={{
                left: (KLPQ - MIN) * PX_PER_KHZ,
                textShadow: '0 0 12px #a30d14',
              }}
            >
              KLPQ
            </span>
          </div>
          <div className="pointer-events-none absolute top-0 left-1/2 h-full w-[2px] -translate-x-1/2 bg-sodium shadow-[0_0_12px_2px_#f0b040]" />
          <div className="pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-void to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-1/4 bg-gradient-to-l from-void to-transparent" />
        </div>
      </div>
    </div>
  );
}
