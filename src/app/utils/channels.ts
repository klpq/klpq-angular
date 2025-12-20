import * as dashjs from 'dashjs';
import Hls from 'hls.js';
import axios from 'axios';
import Mpegts from 'mpegts.js';

import { ProtocolsEnum } from '../streamstat.service';

export const getLink = (origin, name, app) => {
  return `${origin}/${app}/${name}.flv`;
};

export const getMpdLink = async (origin, name, app) => {
  console.log('get mpd link', name);

  return `${origin}/channels/${name}/${app}/index.mpd`;
};

export const getHlsLink = async (origin, name, app) => {
  console.log('get hls link', name);

  return `${origin}/channels/${name}/${app}/index.m3u8`;
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
  protocol: ProtocolsEnum,
  edgeUrl: string,
  videoElement: HTMLMediaElement,
): Promise<() => void> {
  let stopPlaybackFnc = () => null;

  switch (protocol) {
    case ProtocolsEnum.FLV:
    case ProtocolsEnum.RTMP: {
      stopPlaybackFnc = createWssPlayer(videoElement, edgeUrl);

      break;
    }
    case ProtocolsEnum.MPD: {
      if (isAndroid()) {
        stopPlaybackFnc = createNativePlayer(videoElement, edgeUrl);

        break;
      }

      stopPlaybackFnc = createMpdPlayer(videoElement, edgeUrl);

      break;
    }
    case ProtocolsEnum.HLS: {
      if (isIOS()) {
        stopPlaybackFnc = createNativePlayer(videoElement, edgeUrl);

        break;
      }

      stopPlaybackFnc = createHlsPlayer(videoElement, edgeUrl);

      break;
    }
    default: {
      if (isIOS()) {
        stopPlaybackFnc = createNativePlayer(videoElement, edgeUrl);

        break;
      }

      // if (isAndroid()) {
      //   const url = await getMpdLink(stream, app);

      //   stopPlaybackFnc = createNativePlayer(videoElement, url);

      //   break;
      // }

      stopPlaybackFnc = createWssPlayer(videoElement, edgeUrl);

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

  Promise.resolve(player.play())
    .then(() => console.log('playing...'))
    .catch(console.error);

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

  player.on(Hls.Events.MEDIA_ATTACHED, () => {
    videoElement.muted = false;
  });

  player.loadSource(url);
  player.attachMedia(videoElement);

  videoElement
    .play()
    .then(() => console.log('playing...'))
    .catch(console.error);

  return () => {
    console.log('stop hls player');

    player.stopLoad();
    player.destroy();
  };
}

function createNativePlayer(videoElement: HTMLMediaElement, url: string) {
  console.log('createNativePlayer', url);

  videoElement.src = url;

  videoElement
    .play()
    .then(() => console.log('playing...'))
    .catch(console.error);

  return () => {
    console.log('stop native player');

    videoElement.pause();
    videoElement.remove();
  };
}
