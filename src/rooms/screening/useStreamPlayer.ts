import { useEffect, useState, type RefObject } from 'react';
import { createPlayer, type Stop } from './createPlayer';

const VOLUME_KEY = 'streamVolume';
const MIN_SAVED_VOLUME = 0.1;

export type PlayerState = 'idle' | 'loading' | 'ready' | 'unavailable';

/**
 * Owns the <video> element. It is created by hand inside `container`, because
 * the players and the Firefox click surface wrap and replace it; React must
 * not manage that node. A new player is made only when the edge URL, the
 * protocol or `attempt` changes, never because stats were polled again.
 */
export function useStreamPlayer(
  container: RefObject<HTMLDivElement | null>,
  edgeUrl: string | null,
  protocol: string | null,
  attempt = 0,
) {
  const [state, setState] = useState<PlayerState>('idle');
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);

  useEffect(() => {
    const host = container.current;
    if (!host || !edgeUrl || !protocol) {
      setState('idle');
      return;
    }

    let current = true;
    let stop: Stop | null = null;
    const element = document.createElement('video');
    const mark = (next: PlayerState) => () => {
      if (current) setState(next);
    };

    element.id = 'player';
    element.controls = true;
    element.playsInline = true;
    element.addEventListener('loadeddata', mark('ready'));
    element.addEventListener('playing', mark('ready'));
    element.addEventListener('error', mark('unavailable'));

    const savedVolume = Number(localStorage.getItem(VOLUME_KEY));
    if (savedVolume >= MIN_SAVED_VOLUME && savedVolume <= 1)
      element.volume = savedVolume;
    element.addEventListener('volumechange', () => {
      if (current && !element.muted && element.volume >= MIN_SAVED_VOLUME) {
        localStorage.setItem(VOLUME_KEY, String(element.volume));
      }
    });

    // A click on a playing picture must not pause a live stream.
    element.addEventListener(
      'click',
      (event) => {
        if (!element.paused && event.detail > 0) event.preventDefault();
      },
      { capture: true },
    );

    // Firefox handles clicks on the picture inside its native controls without
    // telling the page. The surface covers the picture while it is playing.
    const surface = document.createElement('div');
    surface.className = 'stream-player-surface';
    element.addEventListener('play', () => surface.classList.add('is-playing'));
    element.addEventListener('pause', () =>
      surface.classList.remove('is-playing'),
    );
    surface.append(element);
    host.replaceChildren(surface);

    setState('loading');
    setVideo(element);

    createPlayer(edgeUrl, protocol, element, mark('unavailable'))
      .then((made) => {
        if (current) stop = made;
        else made();
      })
      .catch(mark('unavailable'));

    return () => {
      current = false;
      stop?.();
      host.replaceChildren();
      setVideo(null);
    };
  }, [container, edgeUrl, protocol, attempt]);

  return { state, video };
}
