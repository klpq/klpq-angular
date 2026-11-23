import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import type { ChannelState } from '../data/channel';

export type ExchangeAction = { label: string; hint?: string; run: () => void };

type Socket =
  | {
      kind: 'channel';
      key: string;
      label: string;
      live: boolean;
      witnesses: number;
    }
  | { kind: 'unknown'; key: string; label: string }
  | {
      kind: 'action';
      key: string;
      label: string;
      hint?: string;
      run: () => void;
    };

const tilt = (text: string) => {
  let sum = 0;
  for (const char of text) sum += char.charCodeAt(0);
  return ((sum % 7) - 3) * 0.6;
};

/**
 * The switchboard. One socket per channel, a lamp when it is on air, and a
 * cord you move with the keyboard. Typing a name that is not on the board
 * connects you to it anyway. Every other action on the site is here too.
 */
export function Exchange({
  channels,
  current,
  actions,
  onTune,
  onClose,
}: {
  channels: ChannelState[];
  current?: string;
  actions: ExchangeAction[];
  onTune: (channel: string) => void;
  onClose: () => void;
}) {
  const [typed, setTyped] = useState('');
  const [at, setAt] = useState(0);
  const board = useRef<HTMLDivElement>(null);
  const jacks = useRef(new Map<string, HTMLElement>());
  const [cord, setCord] = useState<string | null>(null);

  const sockets = useMemo<Socket[]>(() => {
    const wanted = typed.trim().toLowerCase();
    const matches = channels.filter((channel) =>
      channel.name.toLowerCase().includes(wanted),
    );
    const list: Socket[] = matches.map((channel) => ({
      kind: 'channel',
      key: `c:${channel.name}`,
      label: channel.name,
      live: channel.live,
      witnesses: channel.witnesses,
    }));
    if (
      wanted &&
      /^[\w-]+$/.test(wanted) &&
      !channels.some((channel) => channel.name.toLowerCase() === wanted)
    ) {
      list.push({ kind: 'unknown', key: `u:${wanted}`, label: wanted });
    }
    for (const action of actions) {
      if (!wanted || action.label.toLowerCase().includes(wanted)) {
        list.push({ kind: 'action', key: `a:${action.label}`, ...action });
      }
    }
    return list;
  }, [typed, channels, actions]);

  useEffect(() => setAt(0), [typed]);
  const selected = sockets[Math.min(at, sockets.length - 1)];

  const connect = (socket: Socket | undefined) => {
    if (!socket) return;
    onClose();
    if (socket.kind === 'action') socket.run();
    else onTune(socket.label);
  };

  // draw the cord from the operator's hand to the selected jack
  useLayoutEffect(() => {
    const place = () => {
      const host = board.current;
      const jack = selected && jacks.current.get(selected.key);
      if (!host || !jack) return setCord(null);
      const frame = host.getBoundingClientRect();
      const box = jack.getBoundingClientRect();
      const x = box.left + box.width / 2 - frame.left;
      const y = box.top + box.height / 2 - frame.top;
      const startX = frame.width / 2;
      const startY = frame.height + 30;
      const sag = Math.max(60, Math.abs(startX - x) * 0.5);
      setCord(
        `M${startX} ${startY} C${startX} ${startY - sag}, ${x} ${y + sag + 80}, ${x} ${y}`,
      );
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [selected?.key, sockets.length]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') onClose();
    else if (event.key === 'Enter') connect(selected);
    else if (event.key === 'ArrowRight' || event.key === 'ArrowDown')
      setAt((value) => (value + 1) % Math.max(1, sockets.length));
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp')
      setAt(
        (value) => (value - 1 + sockets.length) % Math.max(1, sockets.length),
      );
    else return;
    event.preventDefault();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="The Exchange"
      className="fixed inset-0 z-[80] flex flex-col overflow-hidden bg-[#0b0908]/[0.97] text-bone"
      onKeyDown={onKeyDown}
    >
      <div
        className="grain pointer-events-none absolute inset-0 isolate"
        aria-hidden
      />

      <div className="relative z-10 flex items-end gap-4 px-5 pt-5 sm:px-10 sm:pt-8">
        <label className="flex-1">
          <span className="font-mono text-[10px] tracking-[0.35em] text-phosphor/60">
            OPERATOR
          </span>
          <input
            autoFocus
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            spellCheck={false}
            autoCapitalize="none"
            autoComplete="off"
            aria-label="Type a channel name"
            aria-activedescendant={
              selected ? `socket-${selected.key}` : undefined
            }
            className="block w-full border-b-2 border-phosphor/50 bg-transparent py-1 font-mono text-2xl text-phosphor outline-none halation placeholder:text-phosphor/25 focus:border-phosphor sm:text-4xl"
            placeholder="who do you want"
          />
        </label>
        <button
          type="button"
          onClick={onClose}
          className="mb-1 border border-bone/30 px-2 py-1 font-mono text-[11px] text-bone/60 hover:text-bone"
        >
          ESC
        </button>
      </div>

      <div
        ref={board}
        className="relative z-10 min-h-0 flex-1 overflow-y-auto px-5 py-8 sm:px-10"
      >
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
          aria-hidden
        >
          {cord && (
            <>
              <path
                d={cord}
                fill="none"
                stroke="#000"
                strokeWidth="9"
                strokeLinecap="round"
                opacity="0.6"
              />
              <path
                d={cord}
                fill="none"
                stroke="#a30d14"
                strokeWidth="5"
                strokeLinecap="round"
              />
              <path
                d={cord}
                fill="none"
                stroke="#ff6a70"
                strokeWidth="1"
                strokeLinecap="round"
                opacity="0.5"
              />
            </>
          )}
        </svg>

        <ul
          role="listbox"
          className="relative grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-[repeat(auto-fill,minmax(170px,1fr))]"
        >
          {sockets.map((socket, index) => {
            const chosen = socket.key === selected?.key;
            const live = socket.kind === 'channel' && socket.live;
            return (
              <li
                key={socket.key}
                id={`socket-${socket.key}`}
                role="option"
                aria-selected={chosen}
                className="flex cursor-pointer flex-col items-center gap-2"
                onMouseEnter={() => setAt(index)}
                onClick={() => connect(socket)}
              >
                <span className="flex items-center gap-3">
                  <span
                    className={clsx(
                      'h-2.5 w-2.5 rounded-full',
                      live
                        ? 'animate-flicker bg-[#ff2a35] shadow-[0_0_10px_3px_#ff2a35]'
                        : 'bg-[#2a0a0c]',
                    )}
                  />
                  <span
                    ref={(node) => {
                      if (node) jacks.current.set(socket.key, node);
                      else jacks.current.delete(socket.key);
                    }}
                    className={clsx(
                      'block h-9 w-9 rounded-full border-4 bg-black shadow-[inset_0_0_8px_#000]',
                      chosen ? 'border-sodium' : 'border-[#6b6558]',
                    )}
                  />
                  <span className="w-2.5" />
                </span>
                <span
                  className={clsx(
                    'max-w-full truncate px-2 py-0.5 font-mono text-sm',
                    socket.kind === 'action'
                      ? 'bg-sodium text-void'
                      : 'bg-bone text-void',
                    socket.kind === 'unknown' && 'italic',
                    socket.kind === 'channel' &&
                      socket.label === current &&
                      'underline decoration-lodge decoration-2',
                  )}
                  style={{ transform: `rotate(${tilt(socket.label)}deg)` }}
                >
                  {socket.kind === 'unknown'
                    ? `${socket.label} ?`
                    : socket.label}
                </span>
                <span className="h-3 font-mono text-[10px] text-phosphor/70">
                  {socket.kind === 'channel' && socket.live && socket.witnesses}
                  {socket.kind === 'action' && socket.hint}
                  {socket.kind === 'unknown' && 'not on the board'}
                </span>
              </li>
            );
          })}
        </ul>
        {sockets.length === 0 && (
          <p className="font-serif text-xl text-bone/50 italic">
            nobody by that name.
          </p>
        )}
      </div>

      <p className="relative z-10 px-5 pb-4 font-mono text-[10px] tracking-[0.25em] text-bone/35 sm:px-10">
        TYPE · ARROWS · ENTER
      </p>
    </div>
  );
}
