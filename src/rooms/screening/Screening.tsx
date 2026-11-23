import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import clsx from 'clsx';
import {
  countWitnesses,
  formatTape,
  listQualities,
  pickStream,
  type ChannelState,
  type Quality,
} from '../../data/channel';
import { savedChannels, useChannels, useChannelStats } from '../../data/hooks';
import { Eye, Snow, useClock } from '../../design/ui';
import { Exchange } from '../../exchange/Exchange';
import { useStreamPlayer } from './useStreamPlayer';

const FRAME = 'sm:w-[min(100%,calc((100dvh-170px)*16/9))]';

/** The stream, redrawn tiny and blurred behind the frame. Never read back, never on top. */
function BiasLight({
  video,
  level,
}: {
  video: HTMLVideoElement | null;
  level: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!video) return;
    const ctx = ref.current!.getContext('2d')!;
    const timer = window.setInterval(() => {
      if (video.readyState >= 2) ctx.drawImage(video, 0, 0, 32, 18);
    }, 120);
    return () => clearInterval(timer);
  }, [video]);
  return (
    <canvas
      ref={ref}
      width={32}
      height={18}
      aria-hidden
      className="pointer-events-none absolute -inset-[14%] h-[128%] w-[128%] blur-[70px] saturate-150 transition-opacity duration-[2000ms]"
      style={{ opacity: video ? 0.35 + level * 0.5 : 0 }}
    />
  );
}

function Rail({
  channels,
  current,
  className,
}: {
  channels: ChannelState[];
  current: string;
  className?: string;
}) {
  return (
    <nav aria-label="Channels" className={className}>
      {channels.map((channel, index) => (
        <div key={channel.name} className="group relative shrink-0">
          <Link
            to={`/${channel.name}`}
            data-live={channel.live}
            aria-current={channel.name === current ? 'page' : undefined}
            title={`${channel.name} · ${channel.live ? `${channel.witnesses} watching` : 'dead air'}`}
            className={clsx(
              'relative block rounded-[5px] bg-[#15100f] p-[3px] outline-offset-2 transition-transform duration-500 ease-push hover:scale-110 focus-visible:outline-2 focus-visible:outline-sodium',
              channel.name === current
                ? 'ring-2 ring-lodge'
                : 'ring-1 ring-bone/15',
            )}
          >
            <span className="relative block aspect-[4/3] w-11 overflow-hidden rounded-[3px] bg-black sm:w-12">
              {channel.live ? (
                <span
                  className="absolute inset-0"
                  style={{
                    background: `radial-gradient(circle at ${30 + ((index * 17) % 50)}% 40%, #7dffc0aa, #1d4a3c 55%, #06110e)`,
                  }}
                />
              ) : (
                <Snow className="opacity-45" fps={8} />
              )}
              <span className="scanlines absolute inset-0" />
              <span className="absolute bottom-0 left-0.5 font-mono text-[8px] font-bold text-bone/90">
                {String(index + 1).padStart(2, '0')}
              </span>
            </span>
            <span className="absolute -top-0.5 -right-0.5 hidden h-1.5 w-1.5 rounded-full bg-lodge shadow-[0_0_6px_2px_#ff2a35] live:block" />
            <span className="sr-only">{channel.name}</span>
          </Link>
          {!channel.listed && (
            <button
              type="button"
              onClick={() => savedChannels.remove(channel.name, current)}
              aria-label={`Remove ${channel.name} from saved channels`}
              title="Eject"
              className="absolute -bottom-1 -left-1 hidden h-4 w-4 items-center justify-center rounded-full bg-void font-mono text-[10px] leading-none text-bone ring-1 ring-bone/40 group-hover:flex hover:bg-lodge"
            >
              ×
            </button>
          )}
        </div>
      ))}
    </nav>
  );
}

function Readout({
  label,
  plain,
  children,
}: {
  label: string;
  plain: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex items-baseline gap-2 whitespace-nowrap"
      title={plain}
      aria-label={plain}
    >
      <span className="text-[10px] tracking-[0.22em] text-phosphor/55">
        {label}
      </span>
      <span className="flex items-center gap-2 text-phosphor halation">
        {children}
      </span>
    </div>
  );
}

function Display({
  number,
  channel,
  live,
  witnesses,
  seconds,
  bitrate,
  qualities,
  selected,
}: {
  number: number;
  channel: string;
  live: boolean;
  witnesses: number;
  seconds: number;
  bitrate: number;
  qualities: Quality[];
  selected: string;
}) {
  const tape = formatTape(seconds);
  const bars = Math.min(14, Math.round((bitrate / 8000) * 14));
  const alone = witnesses <= 1;

  return (
    <div className="flex flex-wrap items-center gap-x-7 gap-y-2 font-mono text-sm tabular-nums">
      <Readout label="CH" plain={`Channel ${number}, ${channel}`}>
        {String(number).padStart(2, '0')}
      </Readout>
      {live && (
        <>
          <Readout
            label="WITNESSES"
            plain={alone ? 'You are the only viewer' : `${witnesses} viewers`}
          >
            {witnesses}
            <span className="flex gap-[3px]">
              {Array.from(
                { length: Math.min(12, Math.max(1, witnesses)) },
                (_, i) => (
                  <svg key={i} viewBox="0 0 10 6" className="h-[7px] w-[11px]">
                    <path
                      d="M0 3Q5 -2 10 3Q5 8 0 3Z"
                      fill="currentColor"
                      opacity="0.35"
                    />
                    <circle cx="5" cy="3" r="1.5" fill="currentColor" />
                  </svg>
                ),
              )}
            </span>
          </Readout>
          <Readout label="TAPE" plain={`On air for ${tape}`}>
            {tape}
          </Readout>
          <Readout label="SIGNAL" plain={`Bitrate ${Math.round(bitrate)}`}>
            {Math.round(bitrate).toLocaleString('en-US')}
            <span className="flex items-end gap-[2px]">
              {Array.from({ length: 14 }, (_, i) => (
                <span
                  key={i}
                  className={i < bars ? 'bg-phosphor' : 'bg-phosphor/15'}
                  style={{ width: 3, height: 4 + i * 0.8 }}
                />
              ))}
            </span>
          </Readout>
        </>
      )}
      {qualities.length > 0 && (
        <div
          className="ml-auto flex border border-phosphor/40 text-xs"
          role="group"
          aria-label="Quality"
        >
          {qualities.map((quality) => (
            <Link
              key={quality.path}
              to={quality.path}
              aria-current={quality.path === selected ? 'true' : undefined}
              className={clsx(
                'px-2.5 py-1 outline-offset-2 focus-visible:outline-2 focus-visible:outline-sodium',
                quality.path === selected
                  ? 'bg-phosphor text-void'
                  : 'text-phosphor/70 hover:text-phosphor',
              )}
            >
              {quality.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- what the frame shows when there is no picture ---------- */

function Tuning() {
  return (
    <div className="absolute inset-0" role="status">
      <Snow className="opacity-70" />
      <div className="scanlines absolute inset-0" />
      <div className="absolute top-4 left-4 font-mono text-sm text-phosphor halation">
        TUNING<span className="animate-blink">_</span>
      </div>
      <p className="caption-box absolute bottom-[10%] left-[6%] max-w-[70%] text-base sm:text-xl">
        the signal was out there. it usually is.
      </p>
    </div>
  );
}

function DeadAir() {
  return (
    <div
      className="absolute inset-0 overflow-hidden bg-[#0d0b0a]"
      role="status"
    >
      <div
        className="absolute inset-0 opacity-70"
        style={{
          background:
            'repeating-conic-gradient(from 0deg at 50% 50%, #e8dfc8 0 5deg, #070506 5deg 10deg)',
          maskImage:
            'radial-gradient(circle, transparent 0 21%, #000 21.5% 44%, transparent 44.5%)',
        }}
      />
      <div className="absolute top-1/2 left-1/2 aspect-square h-[40%] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full border-4 border-bone bg-sodium">
        <img
          src="/assets/images/index/boar.png"
          alt=""
          className="h-full w-full scale-150 object-cover contrast-125 grayscale"
        />
      </div>
      <div className="scanlines absolute inset-0" />
      <div className="curtain absolute inset-y-0 left-0 w-[31%] animate-sway shadow-[20px_0_40px_#000]" />
      <div className="curtain absolute inset-y-0 right-0 w-[31%] animate-sway shadow-[-20px_0_40px_#000]" />
      <div className="absolute inset-x-0 bottom-[7%] text-center font-card text-[min(3.4vw,30px)] leading-[1.05] tracking-wide text-bone uppercase chroma-split">
        Nothing is being broadcast.
        <br />
        Nothing ever was.
      </div>
      <div className="absolute top-[6%] left-1/2 -translate-x-1/2 -rotate-2 text-[min(3vw,22px)] text-sodium">
        <span className="stamp">Dead air</span>
      </div>
    </div>
  );
}

function Chewed({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-black" role="alert">
      {Array.from({ length: 9 }, (_, i) => (
        <div
          key={i}
          className="absolute inset-x-[-5%] animate-tear overflow-hidden"
          style={{
            top: `${i * 11.2}%`,
            height: '11.4%',
            animationDelay: `${-i * 0.13}s`,
            animationDuration: `${0.7 + (i % 4) * 0.25}s`,
          }}
        >
          <div
            className="h-[900%] w-full opacity-55 saturate-50"
            style={{
              transform: `translateY(-${i * 11.1}%)`,
              backgroundImage:
                'linear-gradient(100deg, #1d4a3c, #a30d14 40%, #070506 55%, #5aa8ff 70%, #e8dfc8)',
            }}
          />
        </div>
      ))}
      <div className="scanlines absolute inset-0" />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
        <p className="caption-box text-base sm:text-xl">
          the tape came back chewed.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="stamp bg-void/70 text-2xl text-sodium outline-offset-4 hover:text-bone focus-visible:outline-2 focus-visible:outline-sodium"
        >
          Rewind and retry
        </button>
      </div>
    </div>
  );
}

/* ---------- the page ---------- */

export default function Screening() {
  const { channel = '', protocol, app } = useParams();
  const [query] = useSearchParams();
  const navigate = useNavigate();
  const container = useRef<HTMLDivElement>(null);
  const [attempt, setAttempt] = useState(0);
  const [exchange, setExchange] = useState(false);
  const now = useClock(1000);

  // A link carrying a key: keep the key, then leave, as the old site did.
  const token = query.get('token');
  useEffect(() => {
    if (!token) return;
    localStorage.setItem('token', token);
    navigate('/', { replace: true });
  }, [token, navigate]);

  useEffect(() => {
    savedChannels.visit(channel);
    document.title = `${channel} · KLPQ`;
    return () => void (document.title = 'KLPQ');
  }, [channel]);

  const stats = useChannelStats(channel);
  const streams = stats.data ?? [];
  const stream = pickStream(streams, protocol, app);
  const channels = useChannels(channel);

  // The edge URL is taken once per route and held, so a new poll never
  // restarts the picture. It is let go when the stream ends.
  const route = `${channel}/${protocol ?? ''}/${app ?? ''}`;
  const [held, setHeld] = useState<{
    route: string;
    edge: string;
    protocol: string;
  } | null>(null);
  const edge = stream?.urls?.edge;
  useEffect(() => {
    if (!edge || !stream) {
      setHeld(null);
    } else {
      setHeld((current) =>
        current?.route === route
          ? current
          : { route, edge, protocol: stream.protocol },
      );
    }
  }, [route, edge]); // eslint-disable-line react-hooks/exhaustive-deps
  const playing = held?.route === route ? held : null;

  const player = useStreamPlayer(
    container,
    playing?.edge ?? null,
    playing?.protocol ?? null,
    attempt,
  );

  const live = Boolean(stream);
  const scene = stats.isPending
    ? 'tuning'
    : !live
      ? 'dead'
      : player.state === 'unavailable'
        ? 'chewed'
        : player.state === 'ready'
          ? 'live'
          : 'tuning';

  const qualities = useMemo(
    () => listQualities(channel, streams),
    [channel, stats.dataUpdatedAt],
  ); // eslint-disable-line react-hooks/exhaustive-deps
  const selected = stream ? `/${channel}/${stream.protocol}/${stream.app}` : '';
  const number = Math.max(
    1,
    channels.findIndex((entry) => entry.name === channel) + 1,
  );
  const seconds = stream
    ? stream.duration + Math.max(0, (now - stats.dataUpdatedAt) / 1000)
    : 0;
  const elsewhere = channels.filter(
    (entry) => entry.live && entry.name !== channel,
  );

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-void">
      {/* the room behind the picture: the only place texture is allowed */}
      <div
        className="grain vignette pointer-events-none absolute inset-0 isolate z-0"
        aria-hidden
      >
        <div className="curtain absolute inset-y-0 left-0 w-[9vw] opacity-25 [mask-image:linear-gradient(to_right,#000,transparent)]" />
        <div className="curtain absolute inset-y-0 right-0 w-[9vw] opacity-25 [mask-image:linear-gradient(to_left,#000,transparent)]" />
      </div>

      <header className="relative z-10 flex items-center gap-4 px-4 pt-3 pb-2 sm:px-6 sm:pt-4">
        <Link
          to="/"
          title="Back to the Waiting Room"
          className="font-card text-2xl tracking-wider text-bone outline-offset-4 hover:text-lodge focus-visible:outline-2 focus-visible:outline-sodium"
        >
          KLPQ
        </Link>
        <span className="h-5 w-px bg-bone/25" />
        <h1 className="truncate font-serif text-2xl leading-none font-bold italic sm:text-3xl">
          {channel}
        </h1>
        {live ? (
          <span className="flex items-center gap-2 text-[13px] text-lodge">
            <span className="h-2 w-2 animate-flicker rounded-full bg-[#ff2a35] shadow-[0_0_10px_3px_#ff2a35]" />
            <span className="stamp -rotate-2">On air</span>
          </span>
        ) : (
          !stats.isPending && (
            <span className="stamp text-[13px] text-bone/40">Off air</span>
          )
        )}
        <button
          type="button"
          onClick={() => setExchange(true)}
          title="Open the Exchange"
          className="ml-auto shrink-0 outline-offset-4 focus-visible:outline-2 focus-visible:outline-sodium"
        >
          <Eye size={54} />
          <span className="sr-only">Open the Exchange</span>
        </button>
      </header>

      <main className="relative z-10 flex min-h-0 flex-col sm:flex-1 sm:flex-row sm:px-6 sm:pb-5">
        <Rail
          channels={channels}
          current={channel}
          className="hidden flex-col items-center justify-center gap-3 overflow-y-auto py-2 pr-5 pl-1 sm:flex"
        />

        <div className="flex min-h-0 flex-1 flex-col sm:justify-center">
          {/* the frame sizes itself to the largest 16:9 that fits */}
          <div className={clsx('relative mx-auto w-full', FRAME)}>
            <BiasLight
              video={scene === 'live' ? player.video : null}
              level={Math.min(1, (stream?.bitrate ?? 0) / 8000)}
            />
            <div className="relative aspect-video overflow-hidden bg-black shadow-[0_0_0_1px_rgb(232_223_200/0.14),0_30px_80px_#000]">
              {/* the picture; nothing is ever drawn over it while it plays */}
              <div ref={container} className="absolute inset-0" />
              {scene === 'tuning' && <Tuning />}
              {scene === 'dead' && <DeadAir />}
              {scene === 'chewed' && (
                <Chewed onRetry={() => setAttempt((value) => value + 1)} />
              )}
            </div>
          </div>

          <div className={clsx('mx-auto w-full px-4 pt-3 sm:px-0', FRAME)}>
            <Display
              number={number}
              channel={channel}
              live={live}
              witnesses={countWitnesses(streams)}
              seconds={seconds}
              bitrate={stream?.bitrate ?? 0}
              qualities={qualities}
              selected={selected}
            />
          </div>

          {scene === 'dead' && elsewhere.length > 0 && (
            <div
              className={clsx(
                'mx-auto mt-4 flex w-full flex-wrap items-center gap-3 px-4 sm:px-0',
                FRAME,
              )}
            >
              <span className="stamp -rotate-1 text-sm text-sodium">
                Elsewhere, something is on
              </span>
              {elsewhere.map((entry) => (
                <Link
                  key={entry.name}
                  to={`/${entry.name}`}
                  className="font-serif text-xl text-bone italic underline decoration-lodge decoration-2 underline-offset-4 hover:text-sodium"
                >
                  {entry.name}
                  <span className="ml-1.5 font-mono text-[11px] text-phosphor not-italic">
                    {entry.witnesses}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* mobile: the channel list fills the space under the picture */}
      <nav
        aria-label="Channels"
        className="relative z-10 mt-4 flex min-h-0 flex-1 flex-col rounded-t-2xl border-t border-bone/15 bg-[#0e0b0b] px-4 pt-2 sm:hidden"
      >
        <div className="mx-auto mb-2 h-1 w-10 shrink-0 rounded-full bg-bone/25" />
        <ul className="min-h-0 flex-1 overflow-y-auto pb-[max(env(safe-area-inset-bottom),14px)]">
          {channels.map((entry, index) => (
            <li key={entry.name}>
              <Link
                to={`/${entry.name}`}
                className="flex items-center gap-3 border-b border-bone/10 py-2.5"
                aria-current={entry.name === channel ? 'page' : undefined}
              >
                <span className="w-5 font-mono text-[11px] text-bone/40">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span
                  className={clsx(
                    'font-serif text-xl italic',
                    entry.name === channel
                      ? 'font-bold text-bone'
                      : entry.live
                        ? 'text-bone/90'
                        : 'text-bone/35',
                  )}
                >
                  {entry.name}
                </span>
                {entry.name === channel && (
                  <span className="stamp text-[10px] text-lodge">Here</span>
                )}
                <span className="ml-auto font-mono text-[11px] text-phosphor">
                  {entry.live ? (
                    <span className="flex items-center gap-2 halation">
                      {entry.witnesses}
                      <span className="h-1.5 w-1.5 rounded-full bg-[#ff2a35] shadow-[0_0_6px_2px_#ff2a35]" />
                    </span>
                  ) : (
                    <span className="text-bone/30">dead air</span>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {exchange && (
        <Exchange
          channels={channels}
          current={channel}
          onTune={(name) => navigate(`/${name}`)}
          onClose={() => setExchange(false)}
          actions={[{ label: 'the room', run: () => navigate('/') }]}
        />
      )}
    </div>
  );
}
