import * as dashjs from 'dashjs';
import Hls from 'hls.js';
import Mpegts from 'mpegts.js';

import { ProtocolsEnum } from '../streamstat.service';

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isAndroid() {
  return navigator.userAgent.includes('Android');
}

export async function createPlayer(
  edgeUrl: string,
  videoElement: HTMLMediaElement,
): Promise<() => void> {
  let protocol: ProtocolsEnum;

  const ext = new URL(edgeUrl, location.href).pathname.split('.').pop();

  switch (ext) {
    case 'flv':
      protocol = ProtocolsEnum.FLV;

      break;
    case 'hls':
      protocol = ProtocolsEnum.HLS;

      break;
    case 'm3u8':
      protocol = ProtocolsEnum.MPD;

      break;
    default:
      break;
  }

  let stopPlaybackFnc = () => null;

  switch (ext) {
    case ProtocolsEnum.FLV: {
      stopPlaybackFnc = createWssPlayer(videoElement, edgeUrl);

      break;
    }
    default: {
      if (isIOS) {
        stopPlaybackFnc = createHlsPlayer(videoElement, edgeUrl);

        break;
      }

      if (isAndroid()) {
        stopPlaybackFnc = createMpdPlayer(videoElement, edgeUrl);

        break;
      }

      stopPlaybackFnc = createNativePlayer(videoElement, edgeUrl);

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
