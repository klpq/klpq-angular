// Sound for the dial and the Waiting Room. On unless the visitor turned it
// off. Never used on a stream page: `sound.scene(null)` silences everything.
//
// Browsers only let a page make noise after the visitor has touched it, so
// the context is created straight away and resumed on the first key or click.

const WANTED_KEY = 'klpq.sound';
/** Static on the dial. Meant to be barely there. */
const STATIC_LEVEL = 0.03;

type Scene = 'band' | 'room' | null;

let context: AudioContext | null = null;
let master: GainNode | null = null;
let bandBus: GainNode | null = null;
let roomBus: GainNode | null = null;
let staticGain: GainNode | null = null;
let carrierGain: GainNode | null = null;
let whistle: OscillatorNode | null = null;
let whistleGain: GainNode | null = null;
let bed: HTMLAudioElement | null = null;
let scene: Scene = null;
let wanted = localStorage.getItem(WANTED_KEY) !== '0';

function noiseBuffer(ctx: AudioContext, seconds: number) {
  const buffer = ctx.createBuffer(
    1,
    Math.floor(ctx.sampleRate * seconds),
    ctx.sampleRate,
  );
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

function build() {
  const ctx = new AudioContext();
  context = ctx;
  master = ctx.createGain();
  master.connect(ctx.destination);
  bandBus = ctx.createGain();
  bandBus.gain.value = 0;
  bandBus.connect(master);
  roomBus = ctx.createGain();
  roomBus.gain.value = 0;
  roomBus.connect(master);

  // the dial: static, a whistle that falls as you close in, and the carrier
  const hiss = ctx.createBufferSource();
  hiss.buffer = noiseBuffer(ctx, 2);
  hiss.loop = true;
  const hissBand = ctx.createBiquadFilter();
  hissBand.type = 'bandpass';
  hissBand.frequency.value = 1800;
  hissBand.Q.value = 0.4;
  staticGain = ctx.createGain();
  staticGain.gain.value = STATIC_LEVEL;
  hiss.connect(hissBand).connect(staticGain).connect(bandBus);
  hiss.start();

  whistle = ctx.createOscillator();
  whistle.frequency.value = 2400;
  whistleGain = ctx.createGain();
  whistleGain.gain.value = 0;
  whistle.connect(whistleGain).connect(bandBus);
  whistle.start();

  carrierGain = ctx.createGain();
  carrierGain.gain.value = 0;
  carrierGain.connect(bandBus);
  for (const frequency of [220, 221.3, 330]) {
    const tone = ctx.createOscillator();
    tone.frequency.value = frequency;
    tone.connect(carrierGain);
    tone.start();
  }

  // the room: mains hum, something alive in the wiring
  const low = ctx.createOscillator();
  low.type = 'sawtooth';
  low.frequency.value = 50;
  const lowPass = ctx.createBiquadFilter();
  lowPass.type = 'lowpass';
  lowPass.frequency.value = 170;
  const lowGain = ctx.createGain();
  lowGain.gain.value = 0.07;
  low.connect(lowPass).connect(lowGain).connect(roomBus);
  low.start();

  const high = ctx.createOscillator();
  high.frequency.value = 100.4;
  const highGain = ctx.createGain();
  highGain.gain.value = 0.03;
  high.connect(highGain).connect(roomBus);
  high.start();

  const drift = ctx.createOscillator();
  drift.frequency.value = 0.09;
  const driftGain = ctx.createGain();
  driftGain.gain.value = 0.025;
  drift.connect(driftGain).connect(lowGain.gain);
  drift.start();

  bed = new Audio('/assets/images/index/audio.mp3');
  bed.loop = true;
  bed.volume = 0.3;

  const wake = () => {
    if (context?.state === 'suspended' && wanted && scene) context.resume();
    apply();
  };
  window.addEventListener('pointerdown', wake, { capture: true });
  window.addEventListener('keydown', wake, { capture: true });
}

/** Bring the buses and the bed in line with the current scene and switch. */
function apply() {
  if (!context || !bandBus || !roomBus) return;
  const live = wanted && scene !== null;
  const t = context.currentTime;
  bandBus.gain.setTargetAtTime(live && scene === 'band' ? 1 : 0, t, 0.25);
  roomBus.gain.setTargetAtTime(live && scene === 'room' ? 1 : 0, t, 0.8);
  if (live && scene === 'room') bed?.play().catch(() => {});
  else bed?.pause();
  if (live) context.resume().catch(() => {});
  else if (scene === null) {
    window.speechSynthesis?.cancel();
    context.suspend().catch(() => {});
  }
}

export const sound = {
  /** The visitor's switch. Remembered. */
  get wanted() {
    return wanted;
  },
  set wanted(value: boolean) {
    wanted = value;
    localStorage.setItem(WANTED_KEY, value ? '1' : '0');
    if (value && !context && scene) build();
    if (!value) window.speechSynthesis?.cancel();
    apply();
  },

  /** Which place is making noise. `null` on stream pages: nothing does. */
  scene(next: Scene) {
    scene = next;
    if (next && wanted && !context) build();
    apply();
  },

  /** The dial: 0 is nothing but static, 1 is the station. */
  tune(signal: number) {
    if (!context || !staticGain || !carrierGain || !whistle || !whistleGain)
      return;
    const t = context.currentTime;
    staticGain.gain.setTargetAtTime(STATIC_LEVEL * (1 - signal * 0.9), t, 0.05);
    carrierGain.gain.setTargetAtTime(0.018 * signal, t, 0.08);
    const edge = signal > 0 && signal < 1 ? Math.sin(signal * Math.PI) : 0;
    whistleGain.gain.setTargetAtTime(0.006 * edge, t, 0.04);
    whistle.frequency.setTargetAtTime(300 + (1 - signal) * 2600, t, 0.04);
  },

  /** The electricity jumps. */
  arc() {
    if (!context || !roomBus || !wanted) return;
    const source = context.createBufferSource();
    source.buffer = noiseBuffer(context, 0.24);
    const band = context.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 2600;
    band.Q.value = 0.8;
    const gain = context.createGain();
    const t = context.currentTime;
    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    gain.gain.setValueAtTime(0.16, t + 0.16);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    source.connect(band).connect(gain).connect(roomBus);
    source.start();
  },

  /** A light switch somewhere in the building. */
  click() {
    if (!context || !roomBus || !wanted) return;
    const t = context.currentTime;
    const snap = context.createBufferSource();
    snap.buffer = noiseBuffer(context, 0.05);
    const pass = context.createBiquadFilter();
    pass.type = 'highpass';
    pass.frequency.value = 1200;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    snap.connect(pass).connect(gain).connect(roomBus);
    snap.start(t);
  },

  /** Station ident: one held tone. */
  tone() {
    if (!context || !roomBus || !wanted) return;
    const osc = context.createOscillator();
    osc.frequency.value = 1000;
    const gain = context.createGain();
    const t = context.currentTime;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.08, t + 0.05);
    gain.gain.setValueAtTime(0.08, t + 1.6);
    gain.gain.linearRampToValueAtTime(0, t + 1.9);
    osc.connect(gain).connect(roomBus);
    osc.start();
    osc.stop(t + 2);
  },

  /** A flat, patient voice. */
  say(text: string, spell = false) {
    if (!wanted || scene !== 'room' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const line = new SpeechSynthesisUtterance(
      spell ? text.split('').join(' ') : text,
    );
    line.rate = spell ? 0.62 : 0.8;
    line.pitch = 0.5;
    line.volume = 0.7;
    window.speechSynthesis.speak(line);
  },
};
