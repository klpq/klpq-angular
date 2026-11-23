import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';

/** TV snow on a tiny canvas, scaled up. */
export function Snow({
  className,
  tint = [232, 223, 200],
  fps = 18,
}: {
  className?: string;
  tint?: [number, number, number];
  fps?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d')!;
    const image = ctx.createImageData(canvas.width, canvas.height);
    let timer = 0;
    const paint = () => {
      const data = image.data;
      for (let i = 0; i < data.length; i += 4) {
        const v = Math.random();
        const band = Math.random() < 0.0015 ? 1.6 : 1;
        data[i] = tint[0] * v * band;
        data[i + 1] = tint[1] * v * band;
        data[i + 2] = tint[2] * v * band;
        data[i + 3] = 255;
      }
      ctx.putImageData(image, 0, 0);
    };
    paint();
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      timer = window.setInterval(paint, 1000 / fps);
    }
    return () => clearInterval(timer);
  }, [fps, tint]);
  return (
    <canvas
      ref={ref}
      width={160}
      height={90}
      aria-hidden
      className={clsx('h-full w-full [image-rendering:pixelated]', className)}
    />
  );
}

/**
 * The station's mark: the green pyramid. The engraving is the existing logo;
 * the eye inside it is redrawn on top so it can look around and blink.
 */
export function Eye({
  size = 96,
  className,
}: {
  size?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [look, setLook] = useState({ x: 0, y: 0 });
  const [shut, setShut] = useState(false);

  useEffect(() => {
    const move = (event: PointerEvent) => {
      const box = ref.current?.getBoundingClientRect();
      if (!box) return;
      const dx = event.clientX - (box.left + box.width * 0.47);
      const dy = event.clientY - (box.top + box.height * 0.65);
      const length = Math.hypot(dx, dy) || 1;
      const reach = Math.min(1, length / 260);
      setLook({ x: (dx / length) * 30 * reach, y: (dy / length) * 13 * reach });
    };
    window.addEventListener('pointermove', move);
    let timer = 0;
    const blink = () => {
      setShut(true);
      window.setTimeout(() => setShut(false), 150);
      timer = window.setTimeout(blink, 2600 + Math.random() * 4200);
    };
    timer = window.setTimeout(blink, 2000);
    return () => {
      window.removeEventListener('pointermove', move);
      clearTimeout(timer);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={clsx('relative animate-hover', className)}
      style={{ width: size, height: size * 0.66 }}
      aria-hidden
    >
      <img
        src="/assets/images/stream/klpq.svg"
        alt=""
        className="absolute top-0 left-0 max-w-none"
        style={{ width: size * 1.03, height: size * 1.03 }}
      />
      <svg
        viewBox="0 0 512 512"
        className="absolute top-0 left-0"
        style={{ width: size * 1.03, height: size * 1.03 }}
      >
        <defs>
          <clipPath id="pyramid-eye">
            <path d="M150 334 Q232 262 338 322 Q250 392 150 334Z" />
          </clipPath>
        </defs>
        <g clipPath="url(#pyramid-eye)">
          <rect x="130" y="250" width="230" height="160" fill="#030402" />
          <g
            style={{
              transform: `translate(${look.x}px, ${look.y}px)`,
              transition: 'transform 90ms linear',
            }}
          >
            <circle cx="240" cy="328" r="34" fill="#047857" />
            <circle
              cx="240"
              cy="328"
              r="34"
              fill="none"
              stroke="#030402"
              strokeWidth="5"
              strokeDasharray="3 5"
            />
            <circle cx="240" cy="328" r="16" fill="#030402" />
            <circle cx="229" cy="317" r="6" fill="#7dffc0" />
          </g>
          <rect
            x="130"
            y="250"
            width="230"
            height="160"
            fill="#047857"
            style={{
              transform: shut ? 'translateY(0)' : 'translateY(-160px)',
              transition: 'transform 80ms linear',
            }}
          />
        </g>
        <path
          d="M150 334 Q232 262 338 322 Q250 392 150 334Z"
          fill="none"
          stroke="#030402"
          strokeWidth="7"
        />
      </svg>
    </div>
  );
}

export function useClock(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}
