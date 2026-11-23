import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  MeshReflectorMaterial,
  useFBO,
  RoundedBox,
  useTexture,
  useVideoTexture,
} from '@react-three/drei';
import {
  Bloom,
  ChromaticAberration,
  EffectComposer,
  Glitch,
} from '@react-three/postprocessing';
import { GlitchMode } from 'postprocessing';
import { Ear } from 'lucide-react';
import * as THREE from 'three';
import type { ChannelState } from '../../data/channel';
import type { Station } from '../../data/hooks';
import { feedFor, MURMURS } from '../../data/murmurs';
import { Eye, useClock } from '../../design/ui';
import { HERE } from '../../env';
import { Exchange } from '../../exchange/Exchange';
import { programAt, room, type Program } from './schedule';
import { sound } from './sound';

/** Everything in the room keeps the same time. Lights arc on this beat. */
const ARC_EVERY = 11;

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const CURTAIN = /* glsl */ `
  varying vec2 vUv;
  uniform float uTime;
  uniform float uFolds;
  void main() {
    float sway = sin(vUv.y * 2.2 + uTime * 0.35) * 0.7 * (1.0 - vUv.y * 0.6);
    float fold = sin(vUv.x * uFolds + sway + sin(vUv.x * uFolds * 0.13) * 2.0);
    float light = pow(fold * 0.5 + 0.5, 1.9);
    vec3 deep = vec3(0.012, 0.0, 0.002);
    vec3 red = vec3(0.5, 0.012, 0.022);
    vec3 color = mix(deep, red, light);
    color *= mix(1.0, 0.1, smoothstep(0.35, 1.0, vUv.y));
    color *= mix(0.5, 1.0, smoothstep(0.0, 0.18, vUv.y));
    gl_FragColor = vec4(color, 1.0);
  }
`;

/** Snow, a rolling bar, and now and then a face that was not being broadcast. */
const SNOW = /* glsl */ `
  varying vec2 vUv;
  uniform float uTime;
  uniform float uSeed;
  uniform sampler2D uGhost;
  uniform float uForce;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  void main() {
    float tick = floor(uTime * 24.0);
    vec2 cell = floor(vUv * vec2(150.0, 110.0));
    float n = hash(cell + tick * 3.7 + uSeed);
    float bar = smoothstep(0.0, 0.06, abs(fract(vUv.y - uTime * 0.21 + uSeed) - 0.5) - 0.44);
    vec3 color = vec3(0.6, 0.57, 0.5) * n * (0.45 + bar * 0.8);
    color *= 0.75 + 0.25 * sin(vUv.y * 420.0);

    float moment = floor(uTime * 2.5);
    float haunted = step(0.9, hash(vec2(moment, uSeed * 7.0)));
    haunted = max(haunted, uForce);
    vec2 slip = vec2(sin(vUv.y * 40.0 + uTime * 30.0) * 0.02, 0.0);
    vec3 ghost = texture2D(uGhost, vUv + slip).rgb;
    float grey = dot(ghost, vec3(0.3, 0.6, 0.1));
    color = mix(color, vec3(grey) * (0.35 + n * 0.75), haunted * 0.8);
    gl_FragColor = vec4(color, 1.0);
  }
`;

/** Darkness pooling at the edges of the floor, and the shadow of a fan that is not there. */
const SHADE = /* glsl */ `
  varying vec2 vUv;
  uniform float uTime;
  void main() {
    vec2 p = (vUv - 0.5) * 40.0;
    float reach = length(p * vec2(1.0, 1.25) - vec2(0.0, 2.0));
    float dark = smoothstep(7.0, 17.0, reach) * 0.94;
    vec2 f = p - vec2(0.0, 2.6);
    float r = length(f);
    float a = atan(f.y, f.x) - uTime * 0.55;
    float blades = smoothstep(0.35, 0.8, cos(a * 4.0)) * smoothstep(6.5, 4.5, r) * smoothstep(0.5, 1.4, r);
    gl_FragColor = vec4(vec3(0.0), max(dark, blades * 0.55));
  }
`;

/** A shader material that owns its uniforms, so its clock always runs. */
function Shader({
  frag,
  uniforms,
  transparent = false,
}: {
  frag: string;
  uniforms?: Record<string, THREE.IUniform>;
  transparent?: boolean;
}) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: frag,
        uniforms: { uTime: { value: 0 }, ...uniforms },
        transparent,
        depthWrite: !transparent,
      }),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );
  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.elapsedTime;
  });
  useEffect(() => () => material.dispose(), [material]);
  return <primitive object={material} attach="material" />;
}

/* ---------- the back wall: four curtains, three gaps, and what is behind them ---------- */

const GAPS = [-7.2, -3.6, 0, 3.6, 7.2];
const REACH = 1.55;
const BEHIND: { src: string; tint: string; pixel?: boolean }[][] = [
  [
    { src: '/stock/firs.jpg', tint: '#7dffc0' },
    { src: '/stock/noir-detour.jpg', tint: '#e8dfc8' },
    { src: '/stock/wise.jpg', tint: '#ff5a66' },
    { src: '/stock/diner.jpg', tint: '#ff7a5a' },
  ],
  [
    { src: '/stock/lynch-1990.jpg', tint: '#d9d2c2' },
    { src: '/stock/falls.jpg', tint: '#5aa8ff' },
    { src: '/stock/lee.jpg', tint: '#9ab6ff' },
    { src: '/stock/pie.jpg', tint: '#ff3a44' },
  ],
  [
    { src: '/assets/images/stream/kaban.png', tint: '#d0444e', pixel: true },
    { src: '/stock/lynch-emmys.jpg', tint: '#7dffc0' },
    { src: '/assets/images/index/bg.jpg', tint: '#ffffff' },
    { src: '/stock/owl-frost.jpg', tint: '#f0b040' },
  ],
  [
    { src: '/stock/maclachlan.jpg', tint: '#f0b040' },
    { src: '/stock/cityhall.jpg', tint: '#e8dfc8' },
    { src: '/stock/noir-doa.jpg', tint: '#9ab6ff' },
    { src: '/stock/fan.jpg', tint: '#7dffc0' },
  ],
  [
    { src: '/stock/road.jpg', tint: '#c9c2b4' },
    { src: '/stock/boyle-maclachlan.jpg', tint: '#ff7a5a' },
    { src: '/assets/images/stream/kaban.png', tint: '#5aa8ff', pixel: true },
    { src: '/stock/owl-frost.jpg', tint: '#d0444e' },
  ],
];
const WINDOW = { width: 3.7, height: 6.9 };

function useCovering(sources: { src: string; pixel?: boolean }[]) {
  const textures = useTexture(sources.map((entry) => entry.src));
  useMemo(() => {
    textures.forEach((texture, i) => {
      const image = texture.image as HTMLImageElement;
      const aspect = image.width / image.height;
      const want = WINDOW.width / WINDOW.height;
      texture.repeat.set(1, 1);
      texture.offset.set(0, 0);
      if (aspect > want) {
        texture.repeat.x = want / aspect;
        texture.offset.x = (1 - texture.repeat.x) / 2;
      } else {
        texture.repeat.y = aspect / want;
        texture.offset.y = (1 - texture.repeat.y) * 0.75;
      }
      texture.colorSpace = THREE.SRGBColorSpace;
      if (sources[i].pixel) texture.magFilter = THREE.NearestFilter;
      texture.needsUpdate = true;
    });
  }, [textures]); // eslint-disable-line react-hooks/exhaustive-deps
  return textures;
}

const breath = (t: number, index: number) =>
  Math.pow((Math.sin(t * 0.4 + index * 2.1) + 1) / 2, 4);

/**
 * What hangs behind a gap is never shown straight. It is crushed to a few
 * tones, tinted, split into colours, torn sideways like a tape, and it swims.
 */
const PICTURE = /* glsl */ `
  varying vec2 vUv;
  uniform float uTime;
  uniform float uSeed;
  uniform float uOpen;
  uniform sampler2D uMap;
  uniform vec2 uRepeat;
  uniform vec2 uOffset;
  uniform vec3 uTint;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  float tone(vec2 uv) {
    vec3 c = texture2D(uMap, clamp(uv, 0.0, 1.0) * uRepeat + uOffset).rgb;
    return dot(c, vec3(0.3, 0.6, 0.1));
  }
  void main() {
    vec2 uv = vUv;
    float zoom = 1.08 + 0.07 * sin(uTime * 0.21 + uSeed);
    uv = (uv - 0.5) / zoom + 0.5;
    uv.x += sin(uv.y * 9.0 + uTime * 0.8 + uSeed) * 0.014;
    uv.y += sin(uv.x * 7.0 - uTime * 0.6) * 0.009;
    float band = step(0.9, fract(uv.y * 1.3 - uTime * 0.13 + uSeed));
    uv.x += band * 0.07 * sin(uTime * 31.0 + uSeed);

    float split = 0.008 + 0.006 * sin(uTime * 0.9 + uSeed);
    vec3 grey = vec3(tone(uv + vec2(split, 0.0)), tone(uv), tone(uv - vec2(split, 0.0)));
    grey = smoothstep(0.1, 0.8, grey);
    grey = floor(grey * 4.0 + 0.5) / 4.0;

    vec3 color = mix(vec3(0.03, 0.0, 0.012), uTint, grey);
    float dots = 0.5 + 0.5 * sin(vUv.x * 300.0 + vUv.y * 300.0) * sin(vUv.x * 300.0 - vUv.y * 300.0);
    color *= mix(0.62, 1.0, smoothstep(0.15, 0.6, dots + grey.g * 0.6));
    color *= 0.72 + 0.28 * sin(vUv.y * 560.0);
    color *= 0.8 + 0.4 * hash(floor(vUv * vec2(230.0, 345.0)) + floor(uTime * 18.0));
    color *= 0.9 + 0.1 * sin(uTime * 23.0 + uSeed * 5.0);
    color *= mix(0.2, 1.0, smoothstep(0.78, 0.22, length(vUv - 0.5)));
    gl_FragColor = vec4(color * (0.3 + 0.9 * uOpen), 1.0);
  }
`;

function Behind({ index }: { index: number }) {
  const sources = BEHIND[index];
  const textures = useCovering(sources);
  const shown = useRef(0);
  const wasShut = useRef(true);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: PICTURE,
        uniforms: {
          uTime: { value: 0 },
          uSeed: { value: index * 2.3 + 0.7 },
          uOpen: { value: 0 },
          uMap: { value: textures[0] },
          uRepeat: { value: textures[0].repeat },
          uOffset: { value: textures[0].offset },
          uTint: { value: new THREE.Color(sources[0].tint) },
        },
      }),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );
  useEffect(() => () => material.dispose(), [material]);

  useFrame(({ clock }) => {
    const open = breath(clock.elapsedTime, index);
    const shut = open < 0.004;
    // change the picture only while nobody can see it
    if (shut && !wasShut.current) {
      shown.current = (shown.current + 1) % sources.length;
      const next = textures[shown.current];
      material.uniforms.uMap.value = next;
      material.uniforms.uRepeat.value = next.repeat;
      material.uniforms.uOffset.value = next.offset;
      material.uniforms.uTint.value.set(sources[shown.current].tint);
    }
    wasShut.current = shut;
    material.uniforms.uOpen.value = open;
    material.uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <mesh
      position={[GAPS[index], WINDOW.height / 2 + 0.2, -5.9 - index * 0.02]}
    >
      <planeGeometry args={[WINDOW.width, WINDOW.height]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

function BackWall() {
  const panels = useRef<(THREE.Mesh | null)[]>([]);
  const widths = useMemo(() => {
    const edges = [-15, ...GAPS, 15];
    return edges.slice(1).map((edge, i) => edge - edges[i]);
  }, []);
  useFrame(({ clock }) => {
    const open = GAPS.map(
      (_, i) => 0.02 + breath(clock.elapsedTime, i) * REACH,
    );
    const left = [-15, ...GAPS.map((gap, i) => gap + open[i])];
    const right = [...GAPS.map((gap, i) => gap - open[i]), 15];
    panels.current.forEach((panel, i) => {
      if (!panel) return;
      // the cloth bunches as it is pulled aside
      panel.position.x = (left[i] + right[i]) / 2;
      panel.scale.x = right[i] - left[i];
    });
  });
  return (
    <>
      {GAPS.map((_, i) => (
        <Behind key={i} index={i} />
      ))}
      {widths.map((width, i) => (
        <mesh
          key={i}
          ref={(node) => void (panels.current[i] = node)}
          position={[0, 4.5, -5]}
        >
          <planeGeometry args={[1, 9]} />
          <Shader frag={CURTAIN} uniforms={{ uFolds: { value: width * 9 } }} />
        </mesh>
      ))}
    </>
  );
}

function SideCurtain({ side }: { side: 1 | -1 }) {
  return (
    <mesh
      position={[side * 10.5, 4.5, 0]}
      rotation={[0, -side * (Math.PI / 2), 0]}
    >
      <planeGeometry args={[16, 9]} />
      <Shader frag={CURTAIN} uniforms={{ uFolds: { value: 144 } }} />
    </mesh>
  );
}

/* ---------- the floor ---------- */

function Floor() {
  const chevrons = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#0a0808';
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = '#e8dfc8';
    for (let k = 0; k <= 3; k++) {
      const y = k * 128;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(128, y - 96);
      ctx.lineTo(256, y);
      ctx.lineTo(256, y + 64);
      ctx.lineTo(128, y - 32);
      ctx.lineTo(0, y + 64);
      ctx.fill();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(11, 11);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    return texture;
  }, []);

  // the pattern crawls toward you, slowly enough to doubt
  useFrame((_, delta) => {
    chevrons.offset.y += delta * 0.012;
  });

  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[40, 40]} />
        <MeshReflectorMaterial
          map={chevrons}
          resolution={512}
          blur={[260, 80]}
          mixBlur={0.85}
          mixStrength={0.9}
          mirror={0.35}
          roughness={0.7}
          metalness={0.15}
          depthScale={0.5}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.3}
          color="#d8d2c4"
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
        <planeGeometry args={[40, 40]} />
        <Shader frag={SHADE} transparent />
      </mesh>
    </>
  );
}

/* ---------- televisions ---------- */

function Feed({
  src,
  width,
  height,
}: {
  src: string;
  width: number;
  height: number;
}) {
  const texture = useVideoTexture(src, {
    muted: true,
    loop: true,
    start: true,
    playsInline: true,
  });
  return (
    <mesh position={[0, 0, 0.36]}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={texture} toneMapped={false} color="#b9e6d6" />
    </mesh>
  );
}

const GHOSTS = [
  '/stock/lynch-1990.jpg',
  '/assets/images/stream/kaban.png',
  '/stock/lee.jpg',
  '/stock/maclachlan.jpg',
];

function SnowScreen({
  width,
  height,
  seed = 0,
  veil = false,
}: {
  width: number;
  height: number;
  seed?: number;
  /** Laid over a live feed; shows only while the room is hijacked. */
  veil?: boolean;
}) {
  const ghost = useTexture(GHOSTS[seed % GHOSTS.length]);
  const mesh = useRef<THREE.Mesh>(null);
  const uniforms = useMemo(
    () => ({
      uSeed: { value: seed * 1.37 + 0.5 },
      uGhost: { value: ghost },
      uForce: { value: 0 },
    }),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );
  useFrame(() => {
    uniforms.uForce.value = room.hijacked ? 1 : 0;
    if (veil) mesh.current!.visible = room.hijacked;
  });
  return (
    <mesh ref={mesh} position={[0, 0, veil ? 0.364 : 0.36]} visible={!veil}>
      <planeGeometry args={[width, height]} />
      <Shader frag={SNOW} uniforms={uniforms} />
    </mesh>
  );
}

type Set = {
  name: string;
  src?: string;
  position: [number, number, number];
  width: number;
  tilt?: [number, number, number];
};

/** Channel label painted onto the bezel, so it sits in the room and takes its light. */
function useLabel(index: number, name: string, live: boolean) {
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);
  useEffect(() => {
    let made: THREE.CanvasTexture | null = null;
    let alive = true;
    Promise.all([
      document.fonts.load('60px Tanker'),
      document.fonts.load('26px "JetBrains Mono"'),
    ]).finally(() => {
      if (!alive) return;
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 96;
      const ctx = canvas.getContext('2d')!;
      ctx.textBaseline = 'middle';
      ctx.font = '26px "JetBrains Mono", monospace';
      ctx.fillStyle = 'rgba(232,223,200,0.5)';
      ctx.fillText(String(index + 1).padStart(2, '0'), 8, 52);
      ctx.font = '62px Tanker, Impact, sans-serif';
      ctx.fillStyle = live ? '#e8dfc8' : 'rgba(232,223,200,0.45)';
      ctx.fillText(name.toUpperCase(), 56, 54);
      made = new THREE.CanvasTexture(canvas);
      made.colorSpace = THREE.SRGBColorSpace;
      made.anisotropy = 8;
      setTexture(made);
    });
    return () => {
      alive = false;
      made?.dispose();
    };
  }, [index, name, live]);
  return texture;
}

function Cabinet({ width, height }: { width: number; height: number }) {
  return (
    <>
      <RoundedBox
        args={[width + 0.34, height + 0.5, 0.7]}
        radius={0.07}
        smoothness={3}
        position={[0, -0.07, 0]}
      >
        <meshStandardMaterial
          color="#1b1513"
          roughness={0.5}
          metalness={0.15}
        />
      </RoundedBox>
      <mesh position={[0, 0, 0.355]}>
        <planeGeometry args={[width + 0.1, height + 0.1]} />
        <meshBasicMaterial color="#020202" />
      </mesh>
    </>
  );
}

function Television({
  set,
  index,
  onEnter,
}: {
  set: Set;
  index: number;
  onEnter: (name: string) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const [hover, setHover] = useState(false);
  const { width } = set;
  const height = (width * 3) / 4;
  const live = Boolean(set.src);
  const label = useLabel(index, set.name, live);

  useEffect(() => {
    document.body.style.cursor = hover ? 'pointer' : '';
    return () => void (document.body.style.cursor = '');
  }, [hover]);

  useFrame(() => {
    const target = hover ? 1.04 : 1;
    group.current!.scale.lerp(new THREE.Vector3(target, target, target), 0.12);
  });

  return (
    <group
      ref={group}
      position={set.position}
      rotation={set.tilt}
      onPointerOver={(event) => (event.stopPropagation(), setHover(true))}
      onPointerOut={() => setHover(false)}
      onClick={(event) => {
        event.stopPropagation();
        onEnter(set.name);
      }}
    >
      <Cabinet width={width} height={height} />
      <Suspense fallback={null}>
        {live ? (
          <>
            <Feed src={set.src!} width={width} height={height} />
            <SnowScreen width={width} height={height} seed={index} veil />
          </>
        ) : (
          <SnowScreen width={width} height={height} seed={index} />
        )}
      </Suspense>
      <mesh position={[width / 2 - 0.02, -height / 2 - 0.19, 0.36]}>
        <circleGeometry args={[0.035, 16]} />
        <meshBasicMaterial
          color={live ? '#ff2a35' : '#2a0a0c'}
          toneMapped={false}
        />
      </mesh>
      {label && (
        <mesh position={[-0.06, -height / 2 - 0.185, 0.358]}>
          <planeGeometry args={[width, (width * 96) / 640]} />
          <meshBasicMaterial map={label} transparent toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}

const CCTV = /* glsl */ `
  varying vec2 vUv;
  uniform float uTime;
  uniform sampler2D uMap;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  void main() {
    vec2 uv = vUv;
    uv.x += step(0.96, fract(uv.y * 2.0 - uTime * 0.31)) * 0.03;
    float grey = dot(texture2D(uMap, uv).rgb, vec3(0.3, 0.6, 0.1));
    grey = smoothstep(0.0, 0.55, grey) * 1.25;
    vec3 color = vec3(0.72, 0.9, 0.8) * grey;
    color *= 0.75 + 0.25 * sin(vUv.y * 300.0);
    color += (hash(floor(vUv * 180.0) + floor(uTime * 20.0)) - 0.5) * 0.12;
    // REC
    float dot_ = smoothstep(0.035, 0.025, length((vUv - vec2(0.09, 0.9)) * vec2(1.33, 1.0)));
    color = mix(color, vec3(1.0, 0.1, 0.12), dot_ * step(0.5, fract(uTime * 0.8)));
    color *= smoothstep(0.85, 0.3, length(vUv - 0.5));
    gl_FragColor = vec4(color, 1.0);
  }
`;

/** Where you are sitting. Only the camera on the ceiling can see it. */
function Sitter() {
  const group = useRef<THREE.Group>(null);
  useEffect(() => {
    group.current!.traverse((object) => object.layers.set(1));
  }, []);
  useFrame(({ clock }) => {
    // now and then it looks up at the camera
    const up = Math.sin(clock.elapsedTime * 0.21) > 0.93;
    group.current!.children[0].rotation.x = up ? -0.9 : 0.05;
  });
  return (
    <group ref={group} position={[0, 0, 6.2]}>
      <group position={[0, 1.42, 0]}>
        <mesh>
          <sphereGeometry args={[0.2, 14, 10]} />
          <meshBasicMaterial color="#b9b0a0" />
        </mesh>
        {[-0.07, 0.07].map((x) => (
          <mesh key={x} position={[x, 0.03, -0.185]} rotation={[0, Math.PI, 0]}>
            <circleGeometry args={[0.03, 8]} />
            <meshBasicMaterial color="#000" />
          </mesh>
        ))}
      </group>
      <mesh position={[0, 0.85, 0]}>
        <capsuleGeometry args={[0.26, 0.55, 4, 10]} />
        <meshBasicMaterial color="#3a3432" />
      </mesh>
      <mesh position={[0, 0.5, -0.32]}>
        <boxGeometry args={[0.5, 0.2, 0.7]} />
        <meshBasicMaterial color="#3a3432" />
      </mesh>
      {/* the chair */}
      <mesh position={[0, 0.33, 0]}>
        <boxGeometry args={[0.8, 0.14, 0.8]} />
        <meshBasicMaterial color="#5a0a10" />
      </mesh>
      <mesh position={[0, 0.85, 0.42]}>
        <boxGeometry args={[0.8, 1.2, 0.12]} />
        <meshBasicMaterial color="#5a0a10" />
      </mesh>
    </group>
  );
}

/**
 * A set that is on no channel. It hangs near the ceiling and shows the feed
 * from a camera in the corner of this room. The camera is pointed at you.
 */
function Stray() {
  const group = useRef<THREE.Group>(null);
  const screen = useRef<THREE.Mesh>(null);
  const { gl, scene } = useThree();
  const feed = useFBO(384, 288);
  const frames = useRef(0);
  const uniforms = useMemo(() => ({ uMap: { value: feed.texture } }), [feed]);
  const camera = useMemo(() => {
    const eye = new THREE.PerspectiveCamera(62, 4 / 3, 0.1, 60);
    eye.position.set(5.2, 5.6, -3.6);
    eye.lookAt(-0.8, 0.9, 6.2);
    eye.layers.enable(1);
    return eye;
  }, []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    // a cheap camera: a few frames a second
    if (frames.current++ % 4 === 0) {
      screen.current!.visible = false;
      gl.setRenderTarget(feed);
      gl.clear();
      gl.render(scene, camera);
      gl.setRenderTarget(null);
      screen.current!.visible = true;
    }
    group.current!.position.y = 5.5 + Math.sin(t * 0.5) * 0.18;
    group.current!.rotation.set(
      Math.sin(t * 0.31) * 0.12,
      0.35 + Math.sin(t * 0.19) * 0.3,
      Math.sin(t * 0.23) * 0.16,
    );
  });

  return (
    <group ref={group} position={[-4.3, 5.5, -3.2]}>
      <Cabinet width={2} height={1.5} />
      <mesh ref={screen} position={[0, 0, 0.36]}>
        <planeGeometry args={[2, 1.5]} />
        <Shader frag={CCTV} uniforms={uniforms} />
      </mesh>
    </group>
  );
}

/** It is snowing indoors. Nobody mentions it. */
function Snowfall() {
  const points = useRef<THREE.Points>(null);
  const flakes = 520;
  const positions = useMemo(() => {
    const data = new Float32Array(flakes * 3);
    for (let i = 0; i < flakes; i++) {
      data[i * 3] = (Math.random() - 0.5) * 22;
      data[i * 3 + 1] = Math.random() * 9;
      data[i * 3 + 2] = -5 + Math.random() * 11;
    }
    return data;
  }, []);
  useFrame(({ clock }, delta) => {
    const attribute = points.current!.geometry.attributes
      .position as THREE.BufferAttribute;
    const data = attribute.array as Float32Array;
    const t = clock.elapsedTime;
    for (let i = 0; i < flakes; i++) {
      data[i * 3 + 1] -= delta * (0.22 + (i % 7) * 0.035);
      data[i * 3] += Math.sin(t * 0.6 + i) * delta * 0.12;
      if (data[i * 3 + 1] < 0) data[i * 3 + 1] = 9;
    }
    attribute.needsUpdate = true;
  });
  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#e8dfc8"
        size={0.055}
        transparent
        opacity={0.75}
        depthWrite={false}
      />
    </points>
  );
}

/* ---------- the boars ---------- */

type Walk = {
  y: number;
  z: number;
  size: number;
  speed: number;
  offset: number;
  color: string;
  opacity?: number;
  ceiling?: boolean;
  span?: number;
};

const HERD: Walk[] = [
  // the pair that is one boar twice
  { y: 0.95, z: -3.6, size: 2.6, speed: 0.75, offset: 7, color: '#6d5a52' },
  {
    y: 0.95,
    z: -3.65,
    size: 2.6,
    speed: 0.75,
    offset: 6.45,
    color: '#a30d14',
    opacity: 0.3,
  },
  // behind the curtain, seen only when it parts
  { y: 1.6, z: -5.5, size: 4.4, speed: -0.4, offset: 2, color: '#2a1416' },
  { y: 1.1, z: -5.4, size: 3, speed: 0.55, offset: 15, color: '#3a1c20' },
  // on the ceiling, going the other way
  {
    y: 7.05,
    z: -4.2,
    size: 2,
    speed: -0.5,
    offset: 3,
    color: '#3d2a2c',
    ceiling: true,
  },
  {
    y: 7.3,
    z: -4.6,
    size: 1.4,
    speed: -0.62,
    offset: 11,
    color: '#2c1c1e',
    ceiling: true,
  },
  // small ones, far too many
  { y: 0.42, z: -0.6, size: 0.85, speed: 1.1, offset: 0, color: '#4a3a36' },
  { y: 0.42, z: -0.55, size: 0.85, speed: 1.1, offset: 1.1, color: '#4a3a36' },
  { y: 0.42, z: -0.5, size: 0.85, speed: 1.1, offset: 2.3, color: '#4a3a36' },
  { y: 0.34, z: 0.2, size: 0.7, speed: -0.9, offset: 9, color: '#352825' },
  // one that passes very close and is only a shape
  {
    y: 1.7,
    z: 4.6,
    size: 5.2,
    speed: 2.1,
    offset: 30,
    color: '#050303',
    span: 60,
  },
];

function Boar({ walk, texture }: { walk: Walk; texture: THREE.Texture }) {
  const mesh = useRef<THREE.Mesh>(null);
  const span = walk.span ?? 28;
  const facing = Math.sign(walk.speed);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const travelled =
      (((Math.abs(walk.speed) * t + walk.offset) % span) + span) % span;
    const x = facing * (travelled - span / 2);
    const step =
      Math.abs(Math.sin(t * 5.5 * Math.abs(walk.speed) + walk.offset)) *
      0.06 *
      walk.size *
      0.4;
    mesh.current!.position.set(
      x,
      walk.y + (walk.ceiling ? -step : step),
      walk.z,
    );
  });
  return (
    <mesh ref={mesh} scale={[facing, walk.ceiling ? -1 : 1, 1]}>
      <planeGeometry args={[walk.size, walk.size]} />
      <meshBasicMaterial
        map={texture}
        transparent
        side={THREE.DoubleSide}
        color={walk.color}
        opacity={walk.opacity ?? 1}
        alphaTest={walk.opacity ? 0 : 0.4}
        depthWrite={!walk.opacity}
      />
    </mesh>
  );
}

function Herd() {
  const texture = useTexture('/assets/images/index/boar.png');
  const sentinel = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    // it has not moved. it is only breathing.
    sentinel.current!.scale.y = 1 + Math.sin(clock.elapsedTime * 1.3) * 0.012;
  });
  return (
    <>
      {HERD.map((walk, i) => (
        <Boar key={i} walk={walk} texture={texture} />
      ))}
      <mesh ref={sentinel} position={[-6.1, 1.25, -2.9]}>
        <planeGeometry args={[3.4, 3.4]} />
        <meshBasicMaterial
          map={texture}
          transparent
          alphaTest={0.4}
          color="#57463f"
        />
      </mesh>
    </>
  );
}

/* ---------- other residents ---------- */

/** Hands come out of the dark at the edges of the picture, in no hurry. */
function Hands() {
  const [leftMap, rightMap] = useTexture([
    '/assets/images/stream/lefthand.png',
    '/assets/images/stream/righthand.png',
  ]);
  const left = useRef<THREE.Mesh>(null);
  const right = useRef<THREE.Mesh>(null);
  const { viewport, camera } = useThree();
  const at = useMemo(() => new THREE.Vector3(0, 3.9, -3.9), []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const edge = viewport.getCurrentViewport(camera, at).width / 2;
    const reach = (phase: number) =>
      Math.pow((Math.sin(t * 0.3 + phase) + 1) / 2, 2.2) * 2.5;
    left.current!.position.set(
      -edge - 1.6 + reach(0),
      4.5 + Math.sin(t * 0.8) * 0.05,
      -3.9,
    );
    right.current!.position.set(
      edge + 1.6 - reach(2.4),
      2.9 + Math.sin(t * 0.7 + 1) * 0.05,
      -3.9,
    );
  });

  return (
    <>
      <mesh ref={left}>
        <planeGeometry args={[3.2, 2.83]} />
        <meshBasicMaterial
          map={leftMap}
          transparent
          alphaTest={0.3}
          color="#7a5a52"
        />
      </mesh>
      <mesh ref={right}>
        <planeGeometry args={[3.2, 2.83]} />
        <meshBasicMaterial
          map={rightMap}
          transparent
          alphaTest={0.3}
          color="#7a5a52"
        />
      </mesh>
    </>
  );
}

/**
 * Someone is standing at the back of the room. Every time the lights arc
 * they are closer. Then they are not there.
 */
/** How long the guest stays away after being touched. */
const GONE_SECONDS = 20;

function Guest() {
  const group = useRef<THREE.Group>(null);
  const now = useRef(0);
  const goneUntil = useRef(0);
  const [hover, setHover] = useState(false);
  useEffect(() => {
    document.body.style.cursor = hover ? 'pointer' : '';
    return () => void (document.body.style.cursor = '');
  }, [hover]);
  const places: [number, number][] = [
    [6.3, -4.5],
    [6.0, -3.2],
    [5.75, -1.7],
    [5.5, 0.4],
  ];
  useFrame(({ clock, camera }) => {
    const step =
      Math.floor(clock.elapsedTime / ARC_EVERY) % (places.length + 2);
    now.current = clock.elapsedTime;
    // once touched, it stays away for a while
    const place = now.current < goneUntil.current ? undefined : places[step];
    group.current!.visible = Boolean(place);
    if (!place) return;
    group.current!.position.set(place[0], 0, place[1]);
    group.current!.rotation.y = Math.atan2(
      camera.position.x - place[0],
      camera.position.z - place[1],
    );
  });
  return (
    <group
      ref={group}
      onPointerOver={(event) => (event.stopPropagation(), setHover(true))}
      onPointerOut={() => setHover(false)}
      onClick={(event) => {
        event.stopPropagation();
        goneUntil.current = now.current + GONE_SECONDS;
        setHover(false);
        room.onTouch?.();
      }}
    >
      {/* easier to touch than it looks */}
      <mesh position={[0, 1.15, 0]}>
        <boxGeometry args={[0.95, 2.4, 0.7]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.95, 0]}>
        <capsuleGeometry args={[0.27, 1.25, 4, 12]} />
        <meshBasicMaterial color="#020101" />
      </mesh>
      <mesh position={[0, 1.98, 0]}>
        <sphereGeometry args={[0.2, 16, 12]} />
        <meshBasicMaterial color="#020101" />
      </mesh>
      {[-0.07, 0.07].map((x) => (
        <mesh key={x} position={[x, 2.0, 0.19]}>
          <circleGeometry args={[0.018, 8]} />
          <meshBasicMaterial color="#e8dfc8" toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

function TrafficLight() {
  const swing = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    swing.current!.rotation.z = Math.sin(clock.elapsedTime * 0.9) * 0.13;
  });
  return (
    <group ref={swing} position={[4.9, 8.6, -4.1]}>
      <mesh position={[0, -1.5, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 3, 6]} />
        <meshBasicMaterial color="#000" />
      </mesh>
      <group position={[0, -3.6, 0]}>
        <RoundedBox args={[0.5, 1.3, 0.4]} radius={0.06}>
          <meshStandardMaterial color="#0d0b0a" roughness={0.6} />
        </RoundedBox>
        {[0.4, 0, -0.4].map((y, i) => (
          <mesh key={y} position={[0, y, 0.21]}>
            <circleGeometry args={[0.15, 24]} />
            <meshBasicMaterial
              color={i === 0 ? '#ff2a35' : '#161210'}
              toneMapped={false}
            />
          </mesh>
        ))}
        <pointLight
          position={[0, 0.4, 0.6]}
          color="#ff2030"
          intensity={14}
          distance={6}
          decay={1.7}
        />
      </group>
    </group>
  );
}

function Electricity() {
  const lamp = useRef<THREE.PointLight>(null);
  const arc = useRef<THREE.PointLight>(null);
  const arcs = useRef(0);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const dip = Math.sin(t * 0.7) > 0.985 ? 0.35 : 1;
    lamp.current!.intensity = (42 + Math.sin(t * 50) * 1.5) * dip;
    const beat = t % ARC_EVERY;
    const count = Math.floor(t / ARC_EVERY);
    if (count !== arcs.current) {
      arcs.current = count;
      if (count > 0) room.onArc?.();
    }
    arc.current!.intensity =
      beat < 0.07 || (beat > 0.16 && beat < 0.21) ? 260 : 0;
  });
  return (
    <>
      <pointLight
        ref={lamp}
        position={[4.2, 3.6, 2.5]}
        color="#f0b040"
        distance={14}
        decay={1.6}
      />
      <pointLight
        ref={arc}
        position={[0, 6, -2]}
        color="#5aa8ff"
        distance={22}
        decay={1.2}
      />
    </>
  );
}

/* ---------- camera and layout ---------- */

type Shot = { home: THREE.Vector3; look: THREE.Vector3 };

/** Things in the room the camera should not be looking at. */
const DISTRACTIONS = [
  new THREE.Vector3(-6.1, 1.3, -2.9), // the boar that does not move
  new THREE.Vector3(4.9, 5, -4.1), // the traffic light
  new THREE.Vector3(-4.3, 5.5, -3.2), // the set that shows you
  new THREE.Vector3(2.4, 0, 1.5), // a patch of floor. nothing is there.
  new THREE.Vector3(5.6, 1.8, -1.7), // where the guest stands
];

function Rig({
  shot,
  enter,
  onArrive,
}: {
  shot: Shot;
  enter: THREE.Vector3 | null;
  onArrive: () => void;
}) {
  const { camera, pointer } = useThree();
  const arrived = useRef(false);
  const look = useRef(shot.look.clone());

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    if (enter) {
      const target = enter.clone().add(new THREE.Vector3(0, 0, 0.75));
      camera.position.lerp(target, 1 - Math.pow(0.012, delta));
      look.current.lerp(enter, 1 - Math.pow(0.002, delta));
      camera.lookAt(look.current);
      if (!arrived.current && camera.position.distanceTo(target) < 0.35) {
        arrived.current = true;
        onArrive();
      }
      return;
    }
    const home = shot.home.clone();
    home.x += pointer.x * 0.55;
    home.y += pointer.y * 0.2;
    home.z += Math.sin(t * 0.23) * 0.35;

    // every so often the camera decides something else is more interesting,
    // stares at it for a while, and comes back without comment
    const cycle = t % 41;
    const wandering = cycle > 24 && cycle < 31;
    const subject = DISTRACTIONS[Math.floor(t / 41) % DISTRACTIONS.length];
    const want = wandering ? subject : shot.look;
    if (wandering) home.lerp(subject, 0.22);

    camera.position.lerp(home, 1 - Math.pow(0.02, delta));
    look.current.lerp(want, wandering ? 0.012 : 0.03);
    camera.lookAt(look.current);
    camera.rotation.z += Math.sin(t * 0.17) * 0.014;
    const lens = camera as THREE.PerspectiveCamera;
    const fov = wandering ? 39 : 48;
    if (Math.abs(lens.fov - fov) > 0.01) {
      lens.fov += (fov - lens.fov) * 0.012;
      lens.updateProjectionMatrix();
    }
  });
  return null;
}

const jitter = (seed: number) => {
  const x = Math.sin(seed * 127.1) * 43758.5453;
  return x - Math.floor(x) - 0.5;
};

/** Stack however many channels the API returns into a pile around the default channel. */
function buildWall(
  channels: ChannelState[],
  portrait: boolean,
  aspect: number,
): { sets: Set[]; shot: Shot } {
  const feeds = channels.map((channel) => ({
    name: channel.name,
    src: channel.live ? feedFor(channel.name) : undefined,
  }));
  const center = feeds.find((channel) => channel.name === HERE) ?? feeds[0];
  const others = feeds.filter((channel) => channel !== center);
  const sets: Set[] = [];

  if (portrait) {
    const rows = Math.ceil(others.length / 2);
    const centerY = 0.86 + rows * 1.5 + 0.62;
    sets.push({ ...center, position: [0, centerY, -2], width: 2.5 });
    others.forEach((channel, i) => {
      const row = rows - 1 - Math.floor(i / 2);
      const alone = i === others.length - 1 && others.length % 2 === 1;
      const x = alone ? 0 : i % 2 ? 0.86 : -0.86;
      sets.push({
        ...channel,
        position: [x, 0.86 + row * 1.5, -2],
        width: 1.3,
        tilt: [0, jitter(i + 1) * 0.12, jitter(i + 9) * 0.03],
      });
    });
    const top = centerY + 1.25;
    const distance = Math.max((top * 1.42) / 0.89, 4.1 / (0.89 * aspect));
    return {
      sets,
      shot: {
        home: new THREE.Vector3(0, top * 0.5, distance - 2),
        look: new THREE.Vector3(0, top * 0.5, -2),
      },
    };
  }

  sets.push({ ...center, position: [0, 1.75, -2], width: 2.5 });
  others.forEach((channel, i) => {
    const side = i % 2 ? 1 : -1;
    const slot = Math.floor(i / 2);
    const column = Math.floor(slot / 2);
    const row = slot % 2;
    sets.push({
      ...channel,
      position: [
        side * (2.38 + column * 1.8),
        0.9 + row * 1.53,
        -2.1 - column * 0.35,
      ],
      width: 1.3,
      tilt: [0, -side * 0.1 + jitter(i + 1) * 0.3, jitter(i + 9) * 0.045],
    });
  });
  const columns = Math.ceil(Math.ceil(others.length / 2) / 2);
  const halfWidth = 2.38 + (columns - 1) * 1.8 + 1.3;
  const distance = Math.max(8.2, (halfWidth * 2) / (0.89 * aspect) + 0.6);
  return {
    sets,
    shot: {
      home: new THREE.Vector3(0, 1.9, distance - 2),
      look: new THREE.Vector3(0, 2.15, -2),
    },
  };
}

function Scene({
  channels,
  enter,
  onEnter,
  onArrive,
}: {
  channels: ChannelState[];
  enter: string | null;
  onEnter: (name: string) => void;
  onArrive: () => void;
}) {
  const size = useThree((state) => state.size);
  const aspect = size.width / size.height;
  const portrait = aspect < 0.8;
  const wall = channels
    .map((channel) => `${channel.name}:${channel.live}`)
    .join();
  const { sets, shot } = useMemo(
    () => buildWall(channels, portrait, aspect),
    [wall, portrait, aspect],
  ); // eslint-disable-line react-hooks/exhaustive-deps
  const target = useMemo(() => {
    const set = sets.find((entry) => entry.name === enter);
    return set ? new THREE.Vector3(...set.position) : null;
  }, [sets, enter]);
  const split = useMemo(() => new THREE.Vector2(0.0014, 0.0008), []);

  return (
    <>
      <color attach="background" args={['#070506']} />
      <fog attach="fog" args={['#070506', 10, 26]} />
      <ambientLight intensity={0.55} />
      <Electricity />
      <pointLight
        position={[0, 2.2, 0.6]}
        color="#7dffc0"
        intensity={4}
        distance={6}
        decay={1.8}
      />
      <Floor />
      <Suspense fallback={null}>
        <BackWall />
        <Herd />
        <Hands />
      </Suspense>
      <SideCurtain side={-1} />
      <SideCurtain side={1} />
      <TrafficLight />
      <Snowfall />
      <Sitter />
      <Guest />
      {!portrait && <Stray />}
      {sets.map((set, index) => (
        <Television key={set.name} set={set} index={index} onEnter={onEnter} />
      ))}
      <Rig shot={shot} enter={target} onArrive={onArrive} />
      <EffectComposer multisampling={0}>
        <Bloom
          intensity={0.55}
          luminanceThreshold={0.62}
          luminanceSmoothing={0.25}
          mipmapBlur
        />
        <ChromaticAberration
          offset={split}
          radialModulation
          modulationOffset={0.3}
        />
        <Glitch
          delay={new THREE.Vector2(9, 21)}
          duration={new THREE.Vector2(0.08, 0.28)}
          strength={new THREE.Vector2(0.05, 0.3)}
          mode={GlitchMode.SPORADIC}
        />
      </EffectComposer>
    </>
  );
}

/* ---------- what is written on the glass ---------- */

/** One thought at a time, typed, held, taken away. Some arrive the wrong way round. */
function Murmur({ program, said }: { program: Program; said: string | null }) {
  const [order] = useState(() => shuffled(MURMURS.length));
  const [line, setLine] = useState(0);
  const [shown, setShown] = useState(0);
  const taken =
    program.event === 'hijack'
      ? 'stay where you are. stay where you are. stay where you are.'
      : program.event === 'numbers'
        ? program.digits
        : said;
  const text = taken ?? MURMURS[order[line % order.length]];
  const backwards = !taken && line % 5 === 3;

  useEffect(() => setShown(0), [taken]);
  useEffect(() => {
    if (shown < text.length) {
      const timer = window.setTimeout(
        () => setShown(shown + 1),
        taken ? 55 : 34 + Math.random() * 50,
      );
      return () => clearTimeout(timer);
    }
    if (taken) return;
    const timer = window.setTimeout(() => {
      setShown(0);
      setLine(line + 1);
    }, 5600);
    return () => clearTimeout(timer);
  }, [shown, text, line, taken]);

  return (
    <p
      className={
        'caption-box absolute bottom-[19vh] left-1/2 hidden w-max max-w-[min(84vw,600px)] text-base sm:block ' +
        (program.event === 'numbers'
          ? 'font-mono! tracking-widest not-italic'
          : '')
      }
      style={{ transform: `translateX(-50%) scaleX(${backwards ? -1 : 1})` }}
      aria-live="off"
    >
      {text.slice(0, shown)}
      <span className="animate-blink">|</span>
    </p>
  );
}

const shuffled = (length: number) => {
  const order = Array.from({ length }, (_, i) => i);
  for (let i = length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
};

/** A car goes by outside. There is no outside. Its lights come through blinds that are not there. */
function Headlights() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-10 overflow-hidden mix-blend-screen"
      aria-hidden
    >
      {[0, -3].map((delay) => (
        <div
          key={delay}
          className="absolute inset-y-[-10%] left-0 w-[24vw] animate-headlights"
          style={{
            animationDelay: `${delay}s`,
            backgroundImage:
              'repeating-linear-gradient(to bottom, transparent 0 14px, rgb(255 214 140 / 0.11) 14px 30px)',
            maskImage:
              'linear-gradient(to right, transparent, #000 30%, #000 70%, transparent)',
          }}
        />
      ))}
    </div>
  );
}

/** Somebody is smoking, just out of frame, below you. */
function Smoke() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-10 overflow-hidden mix-blend-screen"
      aria-hidden
    >
      {[
        ['61%', 0, 150],
        ['66%', -6, 110],
        ['57%', -11, 190],
      ].map(([left, delay, size]) => (
        <div
          key={left}
          className="absolute bottom-[-12vh] animate-smoke rounded-full blur-2xl"
          style={{
            left,
            width: size,
            height: Number(size) * 1.6,
            animationDelay: `${delay}s`,
            background:
              'radial-gradient(closest-side, rgb(232 223 200 / 0.9), transparent)',
          }}
        />
      ))}
    </div>
  );
}

export default function WaitingRoom({
  channels,
  station,
  onWatch,
  onRetune,
}: {
  channels: ChannelState[];
  station?: Station;
  onWatch: (channel: string) => void;
  onRetune: () => void;
}) {
  const [enter, setEnter] = useState<string | null>(null);
  const [burst, setBurst] = useState(false);
  // somebody touched the guest: the lights go, and come back without him
  const [dark, setDark] = useState(false);
  const [said, setSaid] = useState<string | null>(null);
  const [exchange, setExchange] = useState(false);
  const [sounding, setSounding] = useState(sound.wanted);
  const now = useClock(1000);
  const utc = new Date(now).toISOString().slice(11, 19);
  const forced = useMemo(
    () => new URLSearchParams(location.search).get('force'),
    [],
  );
  const program = programAt(new Date(now), forced);

  const arrive = () => {
    setBurst(true);
    window.setTimeout(() => onWatch(enter ?? HERE), 220);
  };

  // the scene and the sound read the programme from here
  room.hijacked = program.event === 'hijack';
  useEffect(() => {
    room.onArc = () => sound.arc();
    room.onTouch = () => {
      sound.click();
      setDark(true);
      window.setTimeout(() => sound.click(), 1900);
      window.setTimeout(() => {
        setDark(false);
        setSaid('he is gone now.');
      }, 2600);
      window.setTimeout(() => setSaid(null), 8500);
    };
    return () => {
      room.onArc = null;
      room.onTouch = null;
      room.hijacked = false;
    };
  }, []);
  useEffect(() => {
    if (program.event === 'numbers') sound.say(program.digits, true);
  }, [program.event]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (program.ident) sound.tone();
  }, [program.ident]);

  const toggleSound = () => {
    sound.wanted = !sound.wanted;
    setSounding(sound.wanted);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (exchange || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === 'Enter') setEnter(HERE);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [exchange]);

  return (
    <div className="grain vignette fixed inset-0 overflow-hidden bg-void">
      {/* for a few seconds in every minute the room is the other way round */}
      <div
        className={
          'absolute inset-0 ' +
          (dark
            ? 'animate-lightsout'
            : 'animate-mirror transition-[filter] duration-[4000ms]')
        }
        style={{
          filter: program.deadHour
            ? 'hue-rotate(205deg) saturate(0.7) brightness(0.85)'
            : undefined,
        }}
      >
        <Canvas
          dpr={[1, 1.5]}
          camera={{ fov: 48, position: [0, 1.9, 9], near: 0.1, far: 60 }}
          gl={{ antialias: false, powerPreference: 'high-performance' }}
        >
          <Scene
            channels={channels}
            enter={enter}
            onEnter={setEnter}
            onArrive={arrive}
          />
        </Canvas>
      </div>

      <Headlights />
      <Smoke />

      <div
        className="absolute inset-0 z-20 transition-opacity duration-500"
        style={{ opacity: enter ? 0 : 1, pointerEvents: 'none' }}
      >
        <header className="absolute inset-x-0 top-0 flex items-start justify-between p-4 sm:p-6">
          <button
            type="button"
            onClick={onRetune}
            title="Back to the dial"
            className="pointer-events-auto text-left outline-offset-4 focus-visible:outline-2 focus-visible:outline-sodium"
          >
            <div className="font-card text-5xl leading-[0.85] tracking-wide text-bone halation sm:text-7xl">
              KLPQ
            </div>
            <div className="mt-2 font-mono text-[9px] tracking-[0.55em] text-phosphor/70 sm:text-[11px]">
              подколпаком
            </div>
          </button>
          <div className="text-right font-mono text-[10px] leading-relaxed tracking-[0.25em] text-phosphor/75 tabular-nums halation sm:text-[11px]">
            <div>{utc}</div>
            <div>
              {channels.filter((c) => c.live).length} / {channels.length}
            </div>
            <div className="text-bone/40">
              {station?.transmissions || '·····'}
            </div>
            <div className="text-bone/40">{station?.daysOnAir || '···'}</div>
          </div>
        </header>

        <div className="pointer-events-auto absolute top-[4.25rem] left-1/2 -translate-x-1/2 sm:top-3">
          <button
            type="button"
            onClick={() => setExchange(true)}
            title="Open the Exchange"
            className="outline-offset-8 focus-visible:outline-2 focus-visible:outline-sodium"
          >
            <Eye
              size={112}
              className="drop-shadow-[0_0_22px_rgb(4_120_87/0.85)]"
            />
            <span className="sr-only">Open the Exchange</span>
          </button>
        </div>

        <Murmur program={program} said={said} />

        <footer className="absolute inset-x-0 bottom-0 z-20 flex items-end justify-between gap-4 p-4 pb-[max(env(safe-area-inset-bottom),16px)] sm:p-6">
          <button
            type="button"
            onClick={toggleSound}
            className={
              'pointer-events-auto flex items-center gap-2 font-mono text-[11px] tracking-[0.2em] outline-offset-4 hover:text-bone focus-visible:outline-2 focus-visible:outline-sodium ' +
              (sounding ? 'text-phosphor halation' : 'text-bone/60')
            }
            aria-pressed={sounding}
            aria-label={sounding ? 'Sound is on' : 'Sound is off'}
          >
            <Ear size={26} strokeWidth={1.4} />
            {sounding ? 'ON' : 'OFF'}
          </button>
          <button
            type="button"
            onClick={() => setEnter(HERE)}
            className="stamp pointer-events-auto -rotate-2 bg-void/70 text-2xl text-bone outline-offset-4 transition-colors hover:bg-lodge hover:text-bone focus-visible:outline-2 focus-visible:outline-sodium sm:text-3xl"
          >
            Watch {HERE} ↵
          </button>
        </footer>
      </div>

      {/* top of the hour: the station says its name and nothing else */}
      {program.ident && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-6 bg-bone text-void">
          <Eye size={150} />
          <div className="font-card text-[min(30vw,240px)] leading-[0.8]">
            KLPQ
          </div>
          <div className="font-mono text-sm tracking-[0.6em]">
            {utc.slice(0, 5)}
          </div>
        </div>
      )}

      {exchange && (
        <Exchange
          channels={channels}
          onTune={onWatch}
          onClose={() => setExchange(false)}
          actions={[
            {
              label: sounding ? 'sound off' : 'sound on',
              hint: 'the ear',
              run: toggleSound,
            },
            { label: 'the dial', hint: 'tune again', run: onRetune },
          ]}
        />
      )}

      {burst && <div className="absolute inset-0 z-50 bg-bone" />}
    </div>
  );
}
