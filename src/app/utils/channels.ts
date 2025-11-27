import * as dashjs from 'dashjs';
import Hls from 'hls.js';
import axios from 'axios';
import Mpegts from 'mpegts.js';

import environment from '../../environments/environment';

export const getLink = (name, app) => {
  return `${environment.WSS_URL}/${app}/${name}.flv`;
};

export const getMpdLink = async (name, app) => {
  console.log('get mpd link', name, app);

  const {
    data: { id },
  } = await axios.get<{ id: string }>(
    `${environment.MPD_URL}/generate/mpd/${app}_${name}`,
  );

  return `${environment.MPD_URL}/watch/${id}/index.mpd`;
};

export const getHlsLink = async (name, app) => {
  console.log('get hls link', name, app);

  const {
    data: { id },
  } = await axios.get<{ id: string }>(
    `${environment.MPD_URL}/generate/hls/${app}_${name}`,
  );

  return `${environment.MPD_URL}/watch/${id}/index.m3u8`;
};

function isIOS() {
  return (
    [
      'iPad Simulator',
      'iPhone Simulator',
      'iPod Simulator',
      'iPad',
      'iPhone',
      'iPod',
    ].includes(navigator.platform) ||
    // iPad on iOS 13 detection
    (navigator.userAgent.includes('Mac') && 'ontouchend' in document)
  );
}

function isAndroid() {
  return navigator.userAgent.includes('Android');
}

export async function createPlayer(
  app: string,
  stream: string,
  protocol: string,
  videoElement: HTMLMediaElement,
): Promise<() => void> {
  let stopPlaybackFnc = () => null;

  switch (protocol) {
    case 'wss': {
      const url = getLink(stream, app);

      stopPlaybackFnc = createWssPlayer(videoElement, url);

      break;
    }
    case 'mpd': {
      const url = await getMpdLink(stream, app);

      if (isAndroid()) {
        stopPlaybackFnc = createNativePlayer(videoElement, url);

        break;
      }

      stopPlaybackFnc = createMpdPlayer(videoElement, url);

      break;
    }
    case 'hls': {
      const url = await getHlsLink(stream, app);

      if (isIOS()) {
        stopPlaybackFnc = createNativePlayer(videoElement, url);

        break;
      }

      stopPlaybackFnc = createHlsPlayer(videoElement, url);

      break;
    }
    default: {
      if (isIOS()) {
        const url = await getHlsLink(stream, app);

        stopPlaybackFnc = createNativePlayer(videoElement, url);

        break;
      }

      // if (isAndroid()) {
      //   const url = await getMpdLink(stream, app);

      //   stopPlaybackFnc = createNativePlayer(videoElement, url);

      //   break;
      // }

      const url = getLink(stream, app);

      stopPlaybackFnc = createWssPlayer(videoElement, url);

      break;
    }
  }

  return stopPlaybackFnc;
}

function createWssPlayer(videoElement: HTMLMediaElement, url: string) {
  console.log('createWssPlayer', url);

  const player = Mpegts.createPlayer({
    type: 'flv',
    url,
    cors: true,
    isLive: true,
  });
  player.attachMediaElement(videoElement);
  player.load();
  player.play();

  return () => {
    console.log('stop wss player');

    player.pause();
    player.unload();
    player.detachMediaElement();
  };
}

function createMpdPlayer(videoElement: HTMLMediaElement, url: string) {
  console.log('createMpdPlayer', url);

  const player = dashjs.MediaPlayer().create();
  player.initialize(videoElement, url, true);
  player.play();

  return () => {
    console.log('stop mpd player');

    player.pause();
    player.destroy();
  };
}

function createHlsPlayer(videoElement: HTMLMediaElement, url: string) {
  console.log('createHlsPlayer', url);

  const player = new Hls();

  player.loadSource(url);
  player.attachMedia(videoElement);

  player.on(Hls.Events.MEDIA_ATTACHED, () => {
    videoElement.muted = false;
    videoElement.play();
  });

  return () => {
    console.log('stop hls player');

    player.stopLoad();
    player.destroy();
  };
}

function createNativePlayer(videoElement: HTMLMediaElement, url: string) {
  console.log('createNativePlayer', url);

  videoElement.src = url;
  videoElement.play();

  return () => {
    console.log('stop native player');

    videoElement.pause();
    videoElement.remove();
  };
}
