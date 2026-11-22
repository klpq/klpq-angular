import * as dashjs from 'dashjs';
import Hls from 'hls.js';
import Mpegts from 'mpegts.js';

import { ProtocolsEnum } from '../streamstat.service';

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
  edgeUrl: string,
  protocol: ProtocolsEnum,
  videoElement: HTMLMediaElement,
  onError: () => void,
): Promise<() => void> {
  switch (protocol) {
    case ProtocolsEnum.FLV:
      return createWssPlayer(videoElement, edgeUrl, onError);
    case ProtocolsEnum.HLS:
      return isIOS()
        ? createNativePlayer(videoElement, edgeUrl)
        : createHlsPlayer(videoElement, edgeUrl, onError);
    case ProtocolsEnum.MPD:
      return isAndroid()
        ? createNativePlayer(videoElement, edgeUrl)
        : createMpdPlayer(videoElement, edgeUrl, onError);
    default:
      return createNativePlayer(videoElement, edgeUrl);
  }
}

function createWssPlayer(
  videoElement: HTMLMediaElement,
  url: string,
  onError: () => void,
) {
  console.log('createWssPlayer', url);

  const player = Mpegts.createPlayer({
    type: 'flv',
    url,
    cors: true,
    isLive: true,
  });
  player.on(Mpegts.Events.ERROR, onError);
  player.attachMediaElement(videoElement);
  player.load();

  Promise.resolve(player.play())
    .then(() => console.log('playing...'))
    .catch(console.error);

  return () => {
    console.log('stop wss player');

    player.destroy();
  };
}

function createMpdPlayer(
  videoElement: HTMLMediaElement,
  url: string,
  onError: () => void,
) {
  console.log('createMpdPlayer', url);

  const player = dashjs.MediaPlayer().create();
  player.on(dashjs.MediaPlayer.events.ERROR, onError);
  player.initialize(videoElement, url, true);
  player.play();

  return () => {
    console.log('stop mpd player');

    player.pause();
    player.destroy();
  };
}

function createHlsPlayer(
  videoElement: HTMLMediaElement,
  url: string,
  onError: () => void,
) {
  console.log('createHlsPlayer', url);

  const player = new Hls();
  player.on(Hls.Events.ERROR, (_, error) => {
    if (error.fatal) {
      onError();
    }
  });

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
