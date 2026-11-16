import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";

const INTER = loadFont("normal", { weights: ["300", "400", "500", "600"], subsets: ["latin"] }).fontFamily;

/** Mark Lindo brand basics (decided 2026-11-16). */
export const BRAND = {
  name: "Mark Lindo",
  tagline: "AI automation for small business",
  ink: "#14161b",
  cobalt: "#2f5bea",
  cobaltSoft: "#8fa8ff",
  bg: "#f5f6fb",
  grey: "#8a90a0",
  font: INTER,
};

const ease = Easing.bezier(0.22, 1, 0.36, 1);

/**
 * ML monogram: a rounded cobalt tile, the letters drawn as strokes.
 * The L's foot runs out of the tile into a link line and a node dot (one automation step handing to the next).
 * p: 0..1 draw progress.
 */
export const MLMark: React.FC<{ size: number; p?: number }> = ({ size, p = 1 }) => {
  const draw = (a: number, b: number) => interpolate(p, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
  const tile = draw(0, 0.35), m = draw(0.2, 0.6), l = draw(0.4, 0.75), link = draw(0.65, 0.9), dot = draw(0.85, 1);
  const M = "M 26 70 L 26 30 L 40 50 L 54 30 L 54 70";
  const Lp = "M 64 30 L 64 70 L 100 70";
  return (
    <svg width={size * 1.5} height={size} viewBox="0 0 150 100" style={{ overflow: "visible" }}>
      <rect x={6} y={6} width={88} height={88} rx={22} fill={BRAND.cobalt}
        style={{ transformOrigin: "50px 50px", transform: `scale(${0.6 + tile * 0.4})`, opacity: tile }} />
      <path d={M} fill="none" stroke="#fff" strokeWidth={8} strokeLinecap="round" strokeLinejoin="round"
        pathLength={1} strokeDasharray={1} strokeDashoffset={1 - m} />
      <path d={Lp} fill="none" stroke="#fff" strokeWidth={8} strokeLinecap="round" strokeLinejoin="round"
        pathLength={1} strokeDasharray={1} strokeDashoffset={1 - l} />
      <line x1={100} y1={70} x2={124} y2={70} stroke={BRAND.cobalt} strokeWidth={8} strokeLinecap="round"
        pathLength={1} strokeDasharray={1} strokeDashoffset={1 - link} />
      <circle cx={136} cy={70} r={9 * dot} fill="none" stroke={BRAND.cobalt} strokeWidth={6} />
    </svg>
  );
};

export const END_FRAMES = 120;

/** Round personal monogram, a signature rather than a product logo. */
export const MLBadge: React.FC<{ size: number; p?: number }> = ({ size, p = 1 }) => {
  const k = interpolate(p, [0, 1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", background: BRAND.cobalt, color: "#fff",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.4, fontWeight: 500, letterSpacing: -1,
      opacity: k, transform: `scale(${0.7 + k * 0.3})`, boxShadow: "0 12px 30px rgba(47,91,234,0.25)",
    }}>ML</div>
  );
};

/** End card: the automation is the product; Mark is the person who builds it. */
export const EndCard: React.FC<{ lead?: string; product?: string }> = ({ lead = "AI", product = "Lead Triage" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rise = (at: number) => interpolate(frame, [at, at + 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
  const title = spring({ frame: frame - 6, fps, config: { damping: 20 } });
  const rule = rise(30);
  const by = rise(40);
  const badge = spring({ frame: frame - 48, fps, config: { damping: 16 } });
  const name = rise(54);
  const tag = rise(64);
  const glow = interpolate(frame, [0, END_FRAMES], [0, 1]);
  return (
    <AbsoluteFill style={{ background: BRAND.bg, fontFamily: INTER, alignItems: "center", justifyContent: "center" }}>
      <div style={{
        position: "absolute", width: 1300, height: 800, borderRadius: "50%", left: 310 + glow * 40, top: 140,
        background: "radial-gradient(closest-side, rgba(143,168,255,0.26), rgba(143,168,255,0))",
      }} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{
          fontSize: 128, fontWeight: 300, color: BRAND.ink, letterSpacing: -4,
          opacity: title, transform: `translateY(${(1 - title) * 30}px)`, filter: `blur(${(1 - title) * 10}px)`,
        }}>{lead} <span style={{ color: BRAND.cobalt }}>{product}</span></div>
        <div style={{ width: 520 * rule, height: 2, background: "#dfe3ee", margin: "46px 0 40px" }} />
        <div style={{ fontSize: 30, fontWeight: 400, color: BRAND.grey, letterSpacing: 1, opacity: by, marginBottom: 22 }}>Built by</div>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <MLBadge size={92} p={badge} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 58, fontWeight: 500, color: BRAND.ink, letterSpacing: -1, opacity: name, transform: `translateX(${(1 - name) * -20}px)` }}>Mark Lindo</div>
            <div style={{ fontSize: 30, fontWeight: 300, color: BRAND.grey, opacity: tag, transform: `translateY(${(1 - tag) * 10}px)` }}>
              AI automation for <span style={{ color: BRAND.cobalt }}>small business</span>
            </div>
          </div>
        </div>
      </div>
      <Sequence from={4}><Audio src={staticFile("sfx/whoosh-c.wav")} volume={0.35} /></Sequence>
      <Sequence from={48}><Audio src={staticFile("sfx/ding.wav")} volume={0.3} /></Sequence>
    </AbsoluteFill>
  );
};
