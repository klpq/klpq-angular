import { lazy, Suspense, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useChannels, useStation } from '../data/hooks';
import { env } from '../env';
import { DeadBand } from './deadband/DeadBand';
import { sound } from './waiting/sound';
import { StaticRoom } from './waiting/StaticRoom';

const loadRoom = () => import('./waiting/WaitingRoom');
const WaitingRoom = lazy(loadRoom);

// Remembered only until the page is reloaded: every fresh visit starts at the
// dial, but coming back from a stream page does not make you tune in again.
let tunedThisLoad = false;

const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const canRender = () => {
  try {
    return Boolean(document.createElement('canvas').getContext('webgl2'));
  } catch {
    return false;
  }
};

/** The dial, then the room. */
export default function Home() {
  const navigate = useNavigate();
  const channels = useChannels();
  const station = useStation();
  const [plain] = useState(
    () =>
      still() ||
      !canRender() ||
      new URLSearchParams(location.search).has('static'),
  );
  const [tuned, setTuned] = useState(() => tunedThisLoad || plain);

  // fetch the room while the dial is still turning
  useEffect(() => void (plain || loadRoom()), [plain]);

  // static on the dial, hum in the room, nothing anywhere else
  useEffect(() => {
    sound.scene(plain ? null : tuned ? 'room' : 'band');
    return () => sound.scene(null);
  }, [plain, tuned]);

  const enter = () => {
    tunedThisLoad = true;
    setTuned(true);
  };
  const retune = () => {
    tunedThisLoad = false;
    setTuned(false);
  };

  const watch = (channel: string) => {
    if (env.CURRENT_PAGE === 'www') {
      window.location.href = `${env.STREAM_PAGE_REDIRECT_URL}/${channel}`;
    } else {
      navigate(`/${channel}`);
    }
  };

  if (plain) return <StaticRoom channels={channels} onWatch={watch} />;
  if (!tuned) return <DeadBand onEnter={enter} />;
  return (
    <Suspense fallback={<div className="fixed inset-0 bg-void" />}>
      <WaitingRoom
        channels={channels}
        station={station.data}
        onWatch={watch}
        onRetune={retune}
      />
    </Suspense>
  );
}
