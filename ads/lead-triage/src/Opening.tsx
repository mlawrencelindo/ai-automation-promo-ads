import React from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { evolvePath, getLength, getPointAtLength } from "@remotion/paths";
import { C, DISPLAY, UI, MONO, FPS, f, W, LINE_START, lineEnd } from "./theme";

export const OPENING_FRAMES = Math.ceil((lineEnd(2) + 0.55) * FPS);

const ease = Easing.bezier(0.22, 1, 0.36, 1);
const inOut = Easing.bezier(0.65, 0, 0.35, 1);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const prog = (t: number, a: number, d: number, e = ease) =>
  interpolate(t, [a, a + d], [0, 1], { ...clamp, easing: e });
const sp = (frame: number, at: number, damping = 14, stiffness = 180) =>
  spring({ frame: frame - f(at), fps: FPS, config: { damping, stiffness, mass: 0.8 } });
/** Speed of a 0..1 progress curve, used for motion blur on fast moves. */
const speed = (fn: (t: number) => number, t: number) => Math.abs(fn(t + 1 / FPS) - fn(t)) * FPS;
const bump = (t: number, at: number, up = 0.06, down = 0.45) =>
  interpolate(t, [at, at + up, at + up + down], [0, 1, 0], { ...clamp, easing: Easing.out(Easing.quad) });

/* ---------- key times (seconds, film clock) ---------- */
const T_DIGITS = 0.32;
const T_AM = W(1, 2);
const T_SHRINK = T_AM + 0.5;
const T_CARD = T_SHRINK + 0.22;
const T_NAME = W(1, 4);
const T_CO = W(1, 5);
const T_MSG = W(1, 6);
const T_SEND = W(1, 7);
const T_COLLAPSE = W(1, 8) + 0.05;
const T_FLY = T_COLLAPSE + 0.2;
const T_WIPE = T_FLY + 0.32;
const T_NAVY = T_WIPE + 0.1;
const T_MOON = T_NAVY + 0.3;
const T_MOVE = W(2, 2) - 0.06;
const T_NET = W(2, 2) + 0.05;
const T_FLOW = W(2, 3);
const T_PULSE = W(2, 5);

/* ---------- background: parallax dot grid, vignette, grain ---------- */
const Backdrop: React.FC<{ t: number }> = ({ t }) => {
  const frame = useCurrentFrame();
  const scene2 = t >= T_NAVY + 0.3;
  const drift = (t * 14) % 48;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: scene2 ? C.ground2 : C.ground }} />
      <svg width={1080} height={1920} style={{ position: "absolute", transform: `translateY(${-drift}px)` }}>
        <defs>
          <pattern id="dots" width={48} height={48} patternUnits="userSpaceOnUse">
            <circle cx={24} cy={24} r={1.8} fill={scene2 ? "#22304a" : "#1a2230"} />
          </pattern>
        </defs>
        <rect width={1080} height={1968} fill="url(#dots)" />
      </svg>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 75% 60% at 50% 40%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.55) 100%)" }} />
      <svg width={1080} height={1920} style={{ position: "absolute", opacity: 0.07, mixBlendMode: "overlay" }}>
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency={0.85} numOctaves={2} seed={frame % 9} />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width={1080} height={1920} filter="url(#grain)" />
      </svg>
    </AbsoluteFill>
  );
};

/* ---------- camera: slow push plus punch-ins on beats ---------- */
const Camera: React.FC<{ t: number; children: React.ReactNode }> = ({ t, children }) => {
  const scene2 = t >= T_NAVY + 0.2;
  const s0 = scene2 ? T_NAVY + 0.2 : 0;
  const push = 1 + 0.035 * Math.min(1, (t - s0) / 4);
  const punch = 0.04 * bump(t, T_AM) + 0.03 * bump(t, T_SEND) + 0.05 * bump(t, T_PULSE, 0.05, 0.6);
  const rot = 0.35 * Math.sin(t * 0.9);
  return (
    <AbsoluteFill style={{ transformOrigin: "540px 760px", transform: `scale(${push + punch}) rotate(${rot}deg)` }}>
      {children}
    </AbsoluteFill>
  );
};

/* ---------- 1:14 clock ---------- */
const DigitRoll: React.FC<{ target: string; decoys: string[]; at: number }> = ({ target, decoys, at }) => {
  const frame = useCurrentFrame();
  const p = sp(frame, at, 16, 120);
  const v = Math.abs(sp(frame + 1, at, 16, 120) - p) * FPS;
  const H = 290;
  const col = [...decoys, target];
  const y = -(col.length - 1) * H * p;
  return (
    <span style={{ position: "relative", height: H, overflow: "hidden", display: "inline-block", verticalAlign: "top" }}>
      <span style={{ visibility: "hidden", lineHeight: `${H}px` }}>{target}</span>
      <div style={{ position: "absolute", left: -40, right: -40, top: 0, textAlign: "center", transform: `translateY(${y}px)`, filter: `blur(${Math.min(10, v * 1.6)}px)` }}>
        {col.map((c, i) => (
          <div key={i} style={{ height: H, lineHeight: `${H}px` }}>{c}</div>
        ))}
      </div>
    </span>
  );
};

const shrinkFn = (t: number) => prog(t, T_SHRINK, 0.42, inOut);

const Clock: React.FC<{ t: number }> = ({ t }) => {
  const frame = useCurrentFrame();
  const m = shrinkFn(t);
  const scale = 1 - 0.64 * m;
  const ty = (330 - 700) * m;
  const fade = 1 - prog(t, T_WIPE, 0.15);
  const intro = prog(t, 0, 0.5);
  const r = 330;
  const circ = 2 * Math.PI * r;
  const arc = prog(t, 0.3, 1.4, inOut) * 0.78;
  const am = sp(frame, T_AM, 11, 220);
  const colon = prog(t, T_DIGITS + 0.06, 0.2);
  const head = (arc * 360 - 90) * (Math.PI / 180);
  const blur = (1 - intro) * 14 + Math.min(8, speed(shrinkFn, t) * 2.5);
  return (
    <AbsoluteFill
      style={{
        transformOrigin: "540px 700px",
        transform: `translateY(${ty}px) scale(${scale * (1.12 - 0.12 * intro)})`,
        opacity: fade * intro,
        filter: `blur(${blur}px)`,
      }}
    >
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        {Array.from({ length: 60 }).map((_, i) => {
          const a = (i / 60) * Math.PI * 2 - Math.PI / 2;
          const lit = i / 60 <= arc;
          const major = i % 5 === 0;
          const r1 = r + 26, r2 = r + (major ? 52 : 40);
          return (
            <line key={i} x1={540 + r1 * Math.cos(a)} y1={700 + r1 * Math.sin(a)} x2={540 + r2 * Math.cos(a)} y2={700 + r2 * Math.sin(a)}
              stroke={lit ? C.teal : C.line} strokeWidth={major ? 5 : 3} strokeLinecap="round" opacity={lit ? 1 : 0.8} />
          );
        })}
        <circle cx={540} cy={700} r={r} fill="none" stroke={C.line} strokeWidth={6} />
        <circle cx={540} cy={700} r={r} fill="none" stroke={C.teal} strokeWidth={10} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - arc)} transform="rotate(-90 540 700)" />
        {arc > 0.01 && <circle cx={540 + r * Math.cos(head)} cy={700 + r * Math.sin(head)} r={16} fill={C.white} stroke={C.teal} strokeWidth={6} />}
      </svg>
      <div style={{ position: "absolute", top: 700 - 145 - 30, width: 1080, display: "flex", justifyContent: "center", alignItems: "flex-start", fontFamily: DISPLAY, fontWeight: 800, fontSize: 250, color: C.white }}>
        <DigitRoll target="1" decoys={["7", "4", "9"]} at={T_DIGITS} />
        <span style={{ opacity: colon, padding: "0 4px 0 2px", lineHeight: "275px", display: "inline-block" }}>:</span>
        <DigitRoll target="1" decoys={["5", "8", "2"]} at={T_DIGITS + 0.08} />
        <DigitRoll target="4" decoys={["0", "6", "3"]} at={T_DIGITS + 0.16} />
      </div>
      <div style={{ position: "absolute", top: 870, width: 1080, textAlign: "center", fontFamily: MONO, fontWeight: 600, fontSize: 56, color: C.teal, letterSpacing: 8, opacity: Math.min(1, am * 1.4), transform: `scale(${0.6 + 0.4 * am})` }}>
        AM
      </div>
    </AbsoluteFill>
  );
};

/* ---------- inquiry form card ---------- */
const CARD = { x: 150, y: 500, w: 640, h: 520 };
const typed = (s: string, p: number) => s.slice(0, Math.floor(s.length * p));

const Field: React.FC<{ label: string; value: string; active: boolean; caret: boolean; at: number; t: number }> = ({ label, value, active, caret, at, t }) => {
  const p = prog(t, at, 0.3);
  return (
    <div style={{ opacity: p, transform: `translateX(${(1 - p) * -40}px)`, marginBottom: 22 }}>
      <div style={{ fontFamily: UI, fontWeight: 600, fontSize: 24, color: active ? C.teal : C.grey, marginBottom: 8 }}>{label}</div>
      <div style={{ height: 66, borderRadius: 12, background: C.ground, border: `2px solid ${active ? C.teal : C.line}`, boxShadow: active ? `0 0 0 5px rgba(46,230,197,0.15)` : "none", display: "flex", alignItems: "center", padding: "0 20px", fontFamily: UI, fontWeight: 600, fontSize: 34, color: C.white }}>
        {value}
        {caret && <span style={{ width: 3, height: 38, background: C.teal, marginLeft: 3 }} />}
      </div>
    </div>
  );
};

const FormCard: React.FC<{ t: number }> = ({ t }) => {
  const frame = useCurrentFrame();
  const open = sp(frame, T_CARD, 15, 140);
  const col = prog(t, T_COLLAPSE, 0.25, inOut);
  if (t < T_CARD || col >= 1) return null;
  const blink = frame % 14 < 8;
  const nameP = prog(t, T_NAME, 0.22, Easing.linear);
  const coP = prog(t, T_CO, 0.34, Easing.linear);
  const press = bump(t, T_SEND, 0.06, 0.16);
  const sent = t >= T_SEND + 0.06;
  const sheen = prog(t, T_SEND + 0.08, 0.45, inOut);
  const tilt = col > 0 ? 0 : (1 - open) * 70;
  return (
    <div style={{ position: "absolute", inset: 0, perspective: 1400, perspectiveOrigin: "470px 500px" }}>
      <div
        style={{
          position: "absolute", left: CARD.x, top: CARD.y, width: CARD.w, height: CARD.h, overflow: "hidden",
          transformOrigin: col > 0 ? "50% 50%" : "50% 0%",
          transform: col > 0 ? `scale(${1 - 0.88 * col}) rotate(${-8 * col}deg)` : `translateY(${(1 - open) * 60}px) rotateX(${tilt}deg)`,
          opacity: col > 0 ? 1 - col : Math.min(1, open * 2),
          borderRadius: 28, background: "linear-gradient(180deg, #151e2b 0%, #101722 100%)", border: `2px solid ${C.line}`, padding: 36, boxSizing: "border-box",
          boxShadow: "0 40px 90px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 26, opacity: prog(t, T_CARD + 0.1, 0.25) }}>
          <div style={{ width: 14, height: 14, borderRadius: 7, background: C.teal, boxShadow: `0 0 0 ${4 + 4 * Math.sin(t * 9)}px rgba(46,230,197,0.2)` }} />
          <div style={{ fontFamily: MONO, fontWeight: 600, fontSize: 24, color: C.grey, letterSpacing: 3 }}>NEW INQUIRY</div>
          <div style={{ marginLeft: "auto", fontFamily: MONO, fontWeight: 500, fontSize: 22, color: C.grey }}>01:14</div>
        </div>
        <Field label="Name" value={typed("Priya Shah", nameP)} active={nameP > 0 && nameP < 1} caret={nameP > 0 && nameP < 1 && blink} at={T_CARD + 0.1} t={t} />
        <Field label="Company" value={typed("Shah Bookkeeping", coP)} active={coP > 0 && coP < 1} caret={coP > 0 && coP < 1 && blink} at={T_CARD + 0.16} t={t} />
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 4 }}>
          {[1, 0.86, 0.58].map((w, i) => (
            <div key={i} style={{ height: 14, borderRadius: 7, background: C.line, width: `${w * 100 * prog(t, T_MSG + i * 0.07, 0.25)}%` }} />
          ))}
        </div>
        <div
          style={{
            position: "absolute", left: 36, right: 36, bottom: 32, height: 76, borderRadius: 16,
            background: sent ? C.teal : "rgba(255,255,255,0.08)", border: `2px solid ${sent ? C.teal : C.line}`,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
            fontFamily: UI, fontWeight: 700, fontSize: 32, color: sent ? C.ground : C.white,
            transform: `scale(${1 - 0.07 * press})`, opacity: prog(t, T_CARD + 0.25, 0.2),
          }}
        >
          {sent && (
            <svg width={30} height={30} viewBox="0 0 30 30">
              <path d="M 6 16 L 12 22 L 24 8" fill="none" stroke={C.ground} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round"
                strokeDasharray={30} strokeDashoffset={30 * (1 - prog(t, T_SEND + 0.06, 0.2))} />
            </svg>
          )}
          {sent ? "Sent" : "Send"}
        </div>
        {sheen > 0 && sheen < 1 && (
          <div style={{ position: "absolute", top: -200, bottom: -200, width: 140, left: -200 + sheen * (CARD.w + 400), transform: "rotate(20deg)", background: "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.16) 50%, rgba(255,255,255,0) 100%)" }} />
        )}
      </div>
    </div>
  );
};

/* ---------- envelope flight ---------- */
const FLIGHT = "M 470 760 C 640 980, 960 760, 860 420";
const flyFn = (t: number) => prog(t, T_FLY, 0.4, inOut);
const Envelope: React.FC<{ t: number }> = ({ t }) => {
  const appear = prog(t, T_COLLAPSE + 0.12, 0.15);
  const fly = flyFn(t);
  if (appear <= 0 || t > T_NAVY + 0.15) return null;
  const len = getLength(FLIGHT);
  const trail = evolvePath(fly, FLIGHT);
  const zoom = 1 + 5 * prog(t, T_WIPE - 0.06, 0.2, Easing.in(Easing.cubic));
  const blur = Math.min(6, speed(flyFn, t) * 1.5);
  const env = (p: number, op: number, k: number) => {
    const pt = getPointAtLength(FLIGHT, len * p);
    return (
      <g key={k} opacity={op} transform={`translate(${pt.x} ${pt.y}) scale(${appear * (1 - 0.3 * p) * (k === 0 ? zoom : 1)}) rotate(${-18 * p})`}>
        <rect x={-60} y={-42} width={120} height={84} rx={12} fill={C.cream} />
        <path d="M -52 -32 L 0 8 L 52 -32" fill="none" stroke={C.ground} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
      </g>
    );
  };
  return (
    <svg width={1080} height={1920} style={{ position: "absolute" }}>
      <path d={FLIGHT} fill="none" stroke={C.teal} strokeWidth={5} strokeLinecap="round" strokeDasharray={trail.strokeDasharray} strokeDashoffset={trail.strokeDashoffset} opacity={0.55} />
      <g style={{ filter: `blur(${blur}px)` }}>
        {fly > 0 && [0.12, 0.07, 0.03].map((d, i) => env(Math.max(0, fly - d), 0.12 + i * 0.1, i + 1))}
        {env(fly, 1, 0)}
      </g>
    </svg>
  );
};

/* ---------- circle wipe ---------- */
const Wipe: React.FC<{ t: number }> = ({ t }) => {
  const a = prog(t, T_WIPE, 0.28, Easing.in(Easing.cubic));
  const b = prog(t, T_NAVY, 0.3, Easing.in(Easing.cubic));
  const ring = prog(t, T_WIPE - 0.04, 0.3, Easing.out(Easing.cubic));
  if (a <= 0 && ring <= 0) return null;
  if (b >= 1) return null;
  return (
    <svg width={1080} height={1920} style={{ position: "absolute" }}>
      <circle cx={860} cy={420} r={60 + 2400 * ring} fill="none" stroke={C.teal} strokeWidth={6} opacity={1 - ring} />
      <circle cx={860} cy={420} r={2300 * a} fill={C.teal} />
      <circle cx={860} cy={420} r={2300 * b} fill={C.ground2} />
    </svg>
  );
};

/* ---------- moon ---------- */
const Moon: React.FC<{ t: number }> = ({ t }) => {
  const frame = useCurrentFrame();
  if (t < T_MOON) return null;
  const pop = sp(frame, T_MOON, 12, 160);
  const mvFn = (x: number) => prog(x, T_MOVE, 0.5, inOut);
  const mv = mvFn(t);
  const bob = 8 * Math.sin((t - T_MOON) * 2.4) * (1 - mv);
  const x = 540 + (820 - 540) * mv;
  const y = 640 + (380 - 640) * mv + bob;
  const s = pop * (1 - 0.55 * mv);
  const blur = (1 - Math.min(1, pop)) * 10 + Math.min(6, speed(mvFn, t) * 2);
  const zz = [0, 1, 2].map((i) => {
    const start = T_MOON + 0.25 + i * 0.3;
    if (t < start) return null;
    const ph = ((t - start) % 1.1) / 1.1;
    const op = interpolate(ph, [0, 0.2, 0.75, 1], [0, 1, 1, 0]) * (1 - mv);
    return (
      <div key={i} style={{ position: "absolute", left: 640 + i * 46 + ph * 30, top: 470 - i * 40 - ph * 120, fontFamily: DISPLAY, fontWeight: 800, fontSize: 64 - i * 10, color: C.cream, opacity: op, transform: `rotate(${-10 + 20 * ph}deg)` }}>
        z
      </div>
    );
  });
  return (
    <>
      <svg width={1080} height={1920} style={{ position: "absolute", filter: `blur(${blur}px)` }}>
        <defs>
          <mask id="crescent">
            <rect x={-300} y={-300} width={600} height={600} fill="white" />
            <circle cx={80} cy={-50} r={118} fill="black" />
          </mask>
        </defs>
        <g transform={`translate(${x} ${y}) scale(${s}) rotate(${-25 * (1 - pop)})`}>
          <circle cx={0} cy={0} r={200} fill="none" stroke={C.cream} strokeWidth={2} opacity={0.12} />
          <circle cx={0} cy={0} r={150} fill={C.cream} mask="url(#crescent)" />
        </g>
      </svg>
      {zz}
    </>
  );
};

/* ---------- node network ---------- */
type Kind = "hook" | "ai" | "router" | "sheet" | "mail" | "cal";
const NODES: { id: Kind; x: number; y: number; label: string; side: "right" | "below" }[] = [
  { id: "hook", x: 450, y: 380, label: "Webhook", side: "right" },
  { id: "ai", x: 450, y: 540, label: "", side: "right" },
  { id: "router", x: 450, y: 700, label: "Router", side: "right" },
  { id: "sheet", x: 260, y: 900, label: "Sheets", side: "below" },
  { id: "mail", x: 450, y: 900, label: "Gmail", side: "below" },
  { id: "cal", x: 640, y: 900, label: "Calendar", side: "below" },
];
const SEGS = [
  { d: "M 450 432 L 450 488", at: T_FLOW, dur: 0.15, to: "ai" },
  { d: "M 450 592 L 450 648", at: T_FLOW + 0.15, dur: 0.15, to: "router" },
  { d: "M 450 752 C 450 810, 260 800, 260 848", at: T_FLOW + 0.3, dur: 0.3, to: "sheet" },
  { d: "M 450 752 L 450 848", at: T_FLOW + 0.3, dur: 0.3, to: "mail" },
  { d: "M 450 752 C 450 810, 640 800, 640 848", at: T_FLOW + 0.3, dur: 0.3, to: "cal" },
];
const litAt: Record<Kind, number> = { hook: T_FLOW, ai: 0, router: 0, sheet: 0, mail: 0, cal: 0 };
SEGS.forEach((s) => (litAt[s.to as Kind] = s.at + s.dur));

const Glyph: React.FC<{ kind: Kind; color: string }> = ({ kind, color }) => {
  const st = { fill: "none", stroke: color, strokeWidth: 5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (kind) {
    case "hook":
      return <text x={52} y={66} textAnchor="middle" fontFamily={MONO} fontWeight={600} fontSize={38} fill={color}>{"{ }"}</text>;
    case "ai":
      return <text x={52} y={66} textAnchor="middle" fontFamily={DISPLAY} fontWeight={800} fontSize={40} fill={color}>AI</text>;
    case "router":
      return (
        <g {...st}>
          <path d="M 26 52 L 48 52 L 74 32 M 48 52 L 74 72" />
          <circle cx={78} cy={30} r={5} fill={color} />
          <circle cx={78} cy={74} r={5} fill={color} />
        </g>
      );
    case "sheet":
      return (
        <g {...st}>
          <rect x={28} y={30} width={48} height={44} rx={5} />
          <path d="M 28 45 L 76 45 M 28 60 L 76 60 M 46 30 L 46 74" />
        </g>
      );
    case "mail":
      return (
        <g {...st}>
          <rect x={26} y={34} width={52} height={38} rx={6} />
          <path d="M 28 38 L 52 56 L 76 38" />
        </g>
      );
    case "cal":
      return (
        <g {...st}>
          <rect x={28} y={34} width={48} height={42} rx={6} />
          <path d="M 28 48 L 76 48 M 40 28 L 40 38 M 64 28 L 64 38" />
        </g>
      );
  }
};

const Network: React.FC<{ t: number }> = ({ t }) => {
  const frame = useCurrentFrame();
  if (t < T_NET) return null;
  const pulse = prog(t, T_PULSE, 0.6, Easing.out(Easing.quad));
  const sheen = prog(t, T_PULSE, 0.6, inOut);
  return (
    <>
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        {SEGS.map((s, i) => {
          const p = prog(t, s.at, s.dur, Easing.linear);
          const ev = evolvePath(p, s.d);
          const len = getLength(s.d);
          const base = prog(t, T_NET + 0.1, 0.3);
          return (
            <g key={i}>
              <path d={s.d} fill="none" stroke={C.line} strokeWidth={4} strokeDasharray="2 10" strokeLinecap="round" opacity={base} />
              <path d={s.d} fill="none" stroke={C.teal} strokeWidth={5} strokeLinecap="round" strokeDasharray={ev.strokeDasharray} strokeDashoffset={ev.strokeDashoffset} />
              {p > 0 && p < 1 &&
                [0, 0.08, 0.16, 0.24, 0.32].map((d, k) => {
                  const q = Math.max(0, p - d);
                  const pt = getPointAtLength(s.d, len * q);
                  return <circle key={k} cx={pt.x} cy={pt.y} r={11 - k * 2} fill={k === 0 ? C.white : C.teal} opacity={1 - k * 0.18} />;
                })}
            </g>
          );
        })}
      </svg>
      {NODES.map((n, i) => {
        const at = T_NET + i * 0.06;
        const pop = sp(frame, at, 12, 220);
        const lit = t >= litAt[n.id];
        const flash = interpolate(t, [litAt[n.id], litAt[n.id] + 0.3], [1, 0], clamp) * (lit ? 1 : 0);
        const col = lit ? C.teal : C.white;
        const labelStyle: React.CSSProperties =
          n.side === "right"
            ? { position: "absolute", left: n.x + 74, top: n.y - 18, textAlign: "left" }
            : { position: "absolute", left: n.x - 100, top: n.y + 64, width: 200, textAlign: "center" };
        return (
          <React.Fragment key={n.id}>
            <svg width={104} height={104} style={{ position: "absolute", left: n.x - 52, top: n.y - 52, overflow: "visible", transform: `scale(${pop * (1 + 0.14 * flash)}) rotate(${(1 - Math.min(1, pop)) * -20}deg)` }}>
              <defs>
                <clipPath id={`clip-${n.id}`}><rect x={2} y={2} width={100} height={100} rx={26} /></clipPath>
              </defs>
              {flash > 0 && <rect x={0} y={0} width={104} height={104} rx={26} fill="none" stroke={C.teal} strokeWidth={4} opacity={flash} transform={`translate(52 52) scale(${1.5 - 0.5 * flash}) translate(-52 -52)`} />}
              {pulse > 0 && <rect x={0} y={0} width={104} height={104} rx={26} fill="none" stroke={C.teal} strokeWidth={4} opacity={0.8 * (1 - pulse)} transform={`translate(52 52) scale(${1 + 0.7 * pulse}) translate(-52 -52)`} />}
              <rect x={2} y={2} width={100} height={100} rx={26} fill={lit ? "#0f2a2a" : C.ground} stroke={lit ? C.teal : C.line} strokeWidth={4} />
              {sheen > 0 && sheen < 1 && (
                <g clipPath={`url(#clip-${n.id})`}>
                  <rect x={-60 + (sheen * 1.4 - i * 0.05) * 260} y={-40} width={36} height={190} fill="white" opacity={0.18} transform="rotate(20 52 52)" />
                </g>
              )}
              <Glyph kind={n.id} color={col} />
            </svg>
            {n.label && <div style={{ ...labelStyle, fontFamily: UI, fontWeight: 600, fontSize: 28, color: lit ? C.white : C.grey, opacity: Math.min(1, pop) }}>{n.label}</div>}
          </React.Fragment>
        );
      })}
    </>
  );
};

/* ---------- captions: word pop plus active-word highlight ---------- */
type Group = { words: [string, number][]; accent?: boolean; end: number };
const G: Group[] = [
  { words: [["1:14", W(1, 0)], ["AM.", W(1, 2)]], accent: true, end: W(1, 3) - 0.03 },
  { words: [["A", W(1, 3)], ["new", W(1, 4)], ["client", W(1, 5)], ["inquiry", W(1, 6)]], end: W(1, 7) - 0.03 },
  { words: [["comes", W(1, 7)], ["in.", W(1, 8)]], end: lineEnd(1) + 0.1 },
  { words: [["You're", W(2, 0)], ["asleep.", W(2, 1)]], end: W(2, 2) - 0.03 },
  { words: [["Your", W(2, 2)], ["lead", W(2, 3)], ["system", W(2, 4)]], end: W(2, 5) - 0.03 },
  { words: [["isn't.", W(2, 5)]], accent: true, end: 99 },
];

const Captions: React.FC<{ t: number }> = ({ t }) => {
  const frame = useCurrentFrame();
  const g = G.find((x) => t >= x.words[0][1] - 0.05 && t < x.end);
  if (!g) return null;
  return (
    <div style={{ position: "absolute", left: 120, top: 1060, width: 660, height: 180, display: "flex", flexWrap: "wrap", justifyContent: "center", alignContent: "center", columnGap: 6, rowGap: 4, fontFamily: DISPLAY, fontWeight: 800, fontSize: 72, lineHeight: 1.1 }}>
      {g.words.map(([w, at], i) => {
        const p = sp(frame, at, 13, 260);
        const next = i + 1 < g.words.length ? g.words[i + 1][1] : g.end;
        const active = t >= at && t < next;
        const hl = active ? sp(frame, at, 16, 300) : 0;
        return (
          <span
            key={i}
            style={{
              display: "inline-block", padding: "2px 14px", borderRadius: 14,
              background: active ? `rgba(46,230,197,${hl})` : "transparent",
              color: active && hl > 0.45 ? C.ground : g.accent ? C.teal : C.white,
              opacity: Math.min(1, p * 1.5),
              transform: `translateY(${(1 - p) * 26}px) scale(${(0.85 + 0.15 * p) * (active ? 1.04 : 1)}) rotate(${active ? -1.5 : 0}deg)`,
              textShadow: active ? "none" : "0 4px 18px rgba(0,0,0,0.5)",
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
};

/* ---------- audio ---------- */
const SFX: [string, number, number, number][] = [
  // file, at (s), volume, length (s)
  ["tap", T_DIGITS + 0.05, 0.5, 0.5],
  ["pop", T_AM, 0.55, 0.6],
  ["whoosh-a", T_SHRINK - 0.05, 0.45, 0.9],
  ["typing", T_NAME, 0.4, 0.75],
  ["click", T_SEND, 0.7, 0.5],
  ["whoosh-b", T_FLY - 0.05, 0.5, 0.9],
  ["riser", T_WIPE - 0.5, 0.35, 0.8],
  ["whoosh-c", T_WIPE, 0.5, 0.9],
  ["pop", T_MOON, 0.5, 0.6],
  ["tink", T_FLOW, 0.4, 0.5],
  ["tink", T_FLOW + 0.15, 0.4, 0.5],
  ["tink", T_FLOW + 0.3, 0.4, 0.5],
  ["ding", T_PULSE, 0.5, 1.2],
];

const musicVol = (frame: number) => {
  const t = frame / FPS;
  let duck = 0;
  for (const n of [1, 2]) {
    const s = LINE_START[n];
    const e = lineEnd(n);
    duck = Math.max(duck, interpolate(t, [s - 0.15, s, e, e + 0.3], [0, 1, 1, 0], clamp));
  }
  const fadeIn = interpolate(t, [0, 0.3], [0, 1], clamp);
  const fadeOut = interpolate(t, [OPENING_FRAMES / FPS - 0.4, OPENING_FRAMES / FPS], [1, 0], clamp);
  return (0.2 - 0.1 * duck) * fadeIn * fadeOut;
};

/* ---------- composition ---------- */
export const Opening: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  return (
    <AbsoluteFill style={{ background: C.ground, overflow: "hidden" }}>
      <Backdrop t={t} />
      <Camera t={t}>
        <Clock t={t} />
        <FormCard t={t} />
        <Envelope t={t} />
        <Moon t={t} />
        <Network t={t} />
      </Camera>
      <Wipe t={t} />
      <Captions t={t} />

      <Audio src={staticFile("music.wav")} volume={musicVol} />
      {[1, 2].map((n) => (
        <Sequence key={n} from={f(LINE_START[n])}>
          <Audio src={staticFile(`voice/line0${n}.wav`)} />
        </Sequence>
      ))}
      {SFX.map(([name, at, vol, len], i) => (
        <Sequence key={i} from={f(at)} durationInFrames={f(len)}>
          <Audio src={staticFile(`sfx/${name}.wav`)} volume={vol} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
