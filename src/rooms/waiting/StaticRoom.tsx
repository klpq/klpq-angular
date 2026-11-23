import type { ChannelState } from '../../data/channel';
import { murmurOfTheDay } from '../../data/murmurs';
import { Eye, Snow } from '../../design/ui';
import { HERE } from '../../env';

/**
 * The room for devices that cannot draw the real one, and for people who
 * asked for less motion. Same doors, nothing moving but the snow.
 */
export function StaticRoom({
  channels,
  onWatch,
}: {
  channels: ChannelState[];
  onWatch: (channel: string) => void;
}) {
  const center =
    channels.find((channel) => channel.name === HERE) ?? channels[0];
  const others = channels.filter((channel) => channel !== center);

  const set = (channel: ChannelState, large = false) => (
    <button
      key={channel.name}
      type="button"
      onClick={() => onWatch(channel.name)}
      className={
        'rounded-lg bg-[#1b1513] p-2 text-left shadow-[0_18px_40px_#000] outline-offset-4 focus-visible:outline-2 focus-visible:outline-sodium ' +
        (large ? 'col-span-2 sm:col-span-2 sm:row-span-2' : '')
      }
    >
      <span className="relative block aspect-[4/3] overflow-hidden rounded bg-black">
        {channel.live ? (
          <span className="absolute inset-0 bg-[radial-gradient(circle_at_40%_40%,#7dffc0aa,#1d4a3c_55%,#06110e)]" />
        ) : (
          <Snow className="opacity-50" fps={6} />
        )}
        <span className="scanlines absolute inset-0" />
      </span>
      <span className="mt-1.5 flex items-center justify-between gap-2 px-1">
        <span
          className={
            'font-card tracking-wider uppercase ' +
            (large ? 'text-2xl' : 'text-base')
          }
        >
          {channel.name}
        </span>
        <span
          className={
            'h-2 w-2 rounded-full ' +
            (channel.live
              ? 'bg-[#ff2a35] shadow-[0_0_8px_2px_#ff2a35]'
              : 'bg-[#2a0a0c]')
          }
        />
        <span className="sr-only">{channel.live ? 'on air' : 'dead air'}</span>
      </span>
    </button>
  );

  return (
    <div className="curtain grain vignette fixed inset-0 overflow-y-auto text-bone">
      <div className="relative z-10 mx-auto flex min-h-full max-w-3xl flex-col items-center gap-6 px-4 py-8">
        <Eye size={110} />
        <div className="text-center">
          <h1 className="font-card text-7xl leading-[0.85] halation">KLPQ</h1>
          <div className="mt-2 font-mono text-[10px] tracking-[0.55em] text-phosphor/80">
            подколпаком
          </div>
        </div>
        <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-4">
          {center && set(center, true)}
          {others.map((channel) => set(channel))}
        </div>
        <p className="caption-box text-base">{murmurOfTheDay()}</p>
        <button
          type="button"
          onClick={() => onWatch(HERE)}
          className="stamp bg-void/70 text-3xl outline-offset-4 hover:bg-lodge focus-visible:outline-2 focus-visible:outline-sodium"
        >
          Watch {HERE}
        </button>
      </div>
    </div>
  );
}
