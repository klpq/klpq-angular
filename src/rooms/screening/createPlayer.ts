// One player per protocol, each library loaded only when it is needed.
// Returns a function that stops and tears the player down.

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
    // iPadOS reports itself as a Mac with a touch screen
    (navigator.userAgent.includes('Mac') && 'ontouchend' in document)
  );
}

const isAndroid = () => navigator.userAgent.includes('Android');

export type Stop = () => void;

export async function createPlayer(
  edgeUrl: string,
  protocol: string,
  video: HTMLVideoElement,
  onError: () => void,
): Promise<Stop> {
  switch (protocol) {
    case 'flv':
      return createFlvPlayer(video, edgeUrl, onError);
    case 'hls':
      return isIOS()
        ? createNativePlayer(video, edgeUrl)
        : createHlsPlayer(video, edgeUrl, onError);
    case 'mpd':
      return isAndroid()
        ? createNativePlayer(video, edgeUrl)
        : createDashPlayer(video, edgeUrl, onError);
    default:
      return createNativePlayer(video, edgeUrl);
  }
}

const play = (video: HTMLVideoElement) => video.play().catch(() => {});

async function createFlvPlayer(
  video: HTMLVideoElement,
  url: string,
  onError: () => void,
): Promise<Stop> {
  const { default: Mpegts } = await import('mpegts.js');
  const player = Mpegts.createPlayer({
    type: 'flv',
    url,
    cors: true,
    isLive: true,
  });
  player.on(Mpegts.Events.ERROR, onError);
  player.attachMediaElement(video);
  player.load();
  Promise.resolve(player.play()).catch(() => {});
  return () => player.destroy();
}

async function createDashPlayer(
  video: HTMLVideoElement,
  url: string,
  onError: () => void,
): Promise<Stop> {
  const dashjs = await import('dashjs');
  const player = dashjs.MediaPlayer().create();
  player.on(dashjs.MediaPlayer.events.ERROR, onError);
  player.initialize(video, url, true);
  player.play();
  return () => {
    player.pause();
    player.destroy();
  };
}

async function createHlsPlayer(
  video: HTMLVideoElement,
  url: string,
  onError: () => void,
): Promise<Stop> {
  const { default: Hls } = await import('hls.js');
  const player = new Hls();
  player.on(Hls.Events.ERROR, (_, error) => {
    if (error.fatal) onError();
  });
  player.on(Hls.Events.MEDIA_ATTACHED, () => {
    video.muted = false;
  });
  player.loadSource(url);
  player.attachMedia(video);
  play(video);
  return () => {
    player.stopLoad();
    player.destroy();
  };
}

function createNativePlayer(video: HTMLVideoElement, url: string): Stop {
  video.src = url;
  play(video);
  return () => {
    video.pause();
    video.removeAttribute('src');
    video.load();
  };
}
