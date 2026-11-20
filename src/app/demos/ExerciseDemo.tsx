import { useEffect, useRef, useState } from "react";
import { demoFor, type Demo, type Held, type Pose, type Prop, type Pt } from "./poses";

const KEYS: (keyof Pose)[] = ["h", "s", "p", "c", "fe", "fh", "be", "bh", "fk", "ff", "bk", "bf"];

function lerpPose(a: Pose, b: Pose, t: number): Pose {
  const out = {} as Pose;
  for (const k of KEYS) {
    const pa = a[k] ?? (k === "c" ? mid(a.s, a.p) : undefined);
    const pb = b[k] ?? (k === "c" ? mid(b.s, b.p) : undefined);
    if (pa && pb) (out as unknown as Record<string, Pt>)[k] = [pa[0] + (pb[0] - pa[0]) * t, pa[1] + (pb[1] - pa[1]) * t];
  }
  return out;
}

const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
const pts = (...p: Pt[]) => p.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

function PropShape({ prop }: { prop: Prop }) {
  const cls = "fill-none stroke-[hsl(var(--border))]";
  if (prop === "box") return <rect x={62} y={84} width={30} height={8} rx={1.5} className="fill-[hsl(var(--muted))] stroke-[hsl(var(--border))]" strokeWidth={1.5} />;
  if (prop === "wall") return <line x1={101} y1={4} x2={101} y2={92} className={cls} strokeWidth={3} />;
  if (prop === "bench")
    return (
      <g className="stroke-[hsl(var(--border))]" strokeWidth={2.5} strokeLinecap="round">
        <line x1={14} y1={79} x2={62} y2={79} strokeWidth={4} />
        <line x1={20} y1={80} x2={20} y2={92} />
        <line x1={56} y1={80} x2={56} y2={92} />
      </g>
    );
  if (prop === "mat") return <line x1={4} y1={93} x2={116} y2={93} className="stroke-[hsl(var(--copper)/0.35)]" strokeWidth={3} strokeLinecap="round" />;
  return (
    <g className={cls} strokeWidth={2.5} strokeLinecap="round">
      <polyline points="28,40 30,66 52,66" />
      <line x1={31} y1={66} x2={31} y2={92} />
      <line x1={50} y1={66} x2={50} y2={92} />
    </g>
  );
}

/** Dumbbells, barbell or kettlebell, drawn in the copper accent. */
function Equipment({ held, pose, front }: { held: Held; pose: Pose; front?: boolean }) {
  const cls = "stroke-[hsl(var(--copper))] fill-[hsl(var(--copper))]";
  if (held.kind === "barbell") {
    if (held.at === "back") return <circle cx={pose.s[0] - 2} cy={pose.s[1] - 1} r={6.5} className={`${cls} fill-opacity-80`} strokeWidth={1} />;
    if (front) return <line x1={pose.bh[0] - 10} y1={pose.bh[1]} x2={pose.fh[0] + 10} y2={pose.fh[1]} className={cls} strokeWidth={2.5} />;
    return <circle cx={pose.fh[0]} cy={pose.fh[1]} r={6.5} className={`${cls} fill-opacity-80`} strokeWidth={1} />;
  }
  if (held.kind === "kettlebell") {
    const [x, y] = pose.fh;
    return (
      <g className={cls}>
        <circle cx={x} cy={y + 5.5} r={4.5} strokeWidth={0} />
        <path d={`M${x - 3},${y + 2} Q${x},${y - 3} ${x + 3},${y + 2}`} fill="none" strokeWidth={1.5} />
      </g>
    );
  }
  const bell = ([x, y]: Pt, key: string) => (
    <g key={key} className={cls} strokeLinecap="round">
      <line x1={x - 4} y1={y} x2={x + 4} y2={y} strokeWidth={1.8} />
      <rect x={x - 6} y={y - 3} width={2.5} height={6} rx={0.8} strokeWidth={0} />
      <rect x={x + 3.5} y={y - 3} width={2.5} height={6} rx={0.8} strokeWidth={0} />
    </g>
  );
  return <>{[bell(pose.fh, "f"), ...(front ? [bell(pose.bh, "b")] : [])]}</>;
}

function Figure({ pose, front }: { pose: Pose; front?: boolean }) {
  const back = "stroke-[hsl(var(--muted-foreground)/0.45)]";
  const fore = "stroke-[hsl(var(--foreground))]";
  const spine = pose.c ? `M${pose.s[0]},${pose.s[1]} Q${pose.c[0]},${pose.c[1]} ${pose.p[0]},${pose.p[1]}` : `M${pose.s[0]},${pose.s[1]} L${pose.p[0]},${pose.p[1]}`;
  // In a front view both sides are equally visible.
  const far = front ? fore : back;
  // Upright front views get shoulder and hip width, so they read as facing the viewer:
  // the 'f' limbs are on the figure's left (viewer's right), the 'b' limbs on the other side.
  const upright = front && Math.abs(pose.s[0] - pose.p[0]) < 8 && pose.p[1] - pose.s[1] > 15;
  const sf: Pt = upright ? [pose.s[0] + 7, pose.s[1]] : pose.s;
  const sb: Pt = upright ? [pose.s[0] - 7, pose.s[1]] : pose.s;
  const pf: Pt = upright ? [pose.p[0] + 3, pose.p[1]] : pose.p;
  const pb: Pt = upright ? [pose.p[0] - 3, pose.p[1]] : pose.p;
  return (
    <g fill="none" strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round">
      <polyline points={pts(sb, pose.be, pose.bh)} className={far} />
      <polyline points={pts(pb, pose.bk, pose.bf)} className={far} />
      <path d={spine} className={fore} />
      {upright && <line x1={sb[0]} y1={sb[1]} x2={sf[0]} y2={sf[1]} className={fore} />}
      {upright && <line x1={pb[0]} y1={pb[1]} x2={pf[0]} y2={pf[1]} className={fore} />}
      <polyline points={pts(pf, pose.fk, pose.ff)} className={fore} />
      <polyline points={pts(sf, pose.fe, pose.fh)} className={fore} />
      <circle cx={pose.h[0]} cy={pose.h[1]} r={6.5} className="fill-[hsl(var(--foreground))] stroke-none" />
    </g>
  );
}

function reducedMotion() {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export function DemoFigure({ demo, animate = true, className = "", label }: { demo: Demo; animate?: boolean; className?: string; label?: string }) {
  const [t, setT] = useState(animate && !reducedMotion() ? 0 : 1);
  const frame = useRef<number>();

  useEffect(() => {
    if (!animate || reducedMotion()) return;
    const start = performance.now();
    const loop = (now: number) => {
      const phase = ((now - start) / 1000 / demo.period) % 1;
      // Ease in and out, with a short pause at each end.
      const x = Math.min(1, Math.max(0, (0.5 - 0.5 * Math.cos(phase * 2 * Math.PI) - 0.05) / 0.9));
      setT(x);
      frame.current = requestAnimationFrame(loop);
    };
    frame.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame.current!);
  }, [animate, demo]);

  return (
    <svg viewBox="0 -6 120 106" className={className} role="img" aria-label={label}>
      <line x1={2} y1={92.5} x2={118} y2={92.5} className="stroke-[hsl(var(--border))]" strokeWidth={1.5} />
      {demo.prop && <PropShape prop={demo.prop} />}
      <Figure pose={lerpPose(demo.a, demo.b, t)} front={demo.front} />
      {demo.held && <Equipment held={demo.held} pose={lerpPose(demo.a, demo.b, t)} front={demo.front} />}
    </svg>
  );
}

/** Animated demonstration for an exercise, or nothing if there isn't one. */
export function ExerciseDemo({ name, animate = true, className = "" }: { name: string; animate?: boolean; className?: string }) {
  const demo = demoFor(name);
  if (!demo) return null;
  return <DemoFigure demo={demo} animate={animate} className={className} label={`Demonstration of ${name.toLowerCase()}`} />;
}
