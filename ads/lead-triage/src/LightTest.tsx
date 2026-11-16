import React from "react";
import {
  AbsoluteFill, Audio, Sequence, interpolate, spring, staticFile,
  useCurrentFrame, useVideoConfig, Easing,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";

const INTER = loadFont("normal", { weights: ["300", "400", "500", "600"], subsets: ["latin"] }).fontFamily;

export const LIGHT_FRAMES = 170;

const L = {
  bg: "#f5f6fb",
  ink: "#16181d",
  blue: "#3b6cf6",
  blueSoft: "#7da2ff",
  grey: "#8a90a0",
  line: "#e6e9f2",
};

const ease = Easing.bezier(0.22, 1, 0.36, 1);
const VOICE_AT = 9; // frames; line 1 starts at 0.3 s

/** One word that rises in from a soft blur. */
const Word: React.FC<{ text: string; at: number; color: string; out?: number }> = ({ text, at, color, out }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [at, at + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
  const o = out === undefined ? 1 : interpolate(frame, [out, out + 6], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <span style={{
      display: "inline-block", color, opacity: p * o, marginRight: "0.28em",
      transform: `translateY(${(1 - p) * 26}px)`, filter: `blur(${(1 - p) * 10}px)`,
    }}>{text}</span>
  );
};

const Field: React.FC<{ k: string; v: string }> = ({ k, v }) => (
  <div style={{ display: "flex", gap: 24, padding: "16px 0", borderBottom: `1px solid ${L.line}`, fontSize: 31 }}>
    <div style={{ width: 170, color: L.grey, fontWeight: 400 }}>{k}</div>
    <div style={{ color: L.ink, fontWeight: 500 }}>{v}</div>
  </div>
);

/** The website-form inquiry, real data from the 2026-11-16 test run. */
const InquiryCard: React.FC<{ at: number }> = ({ at }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - at, fps, config: { damping: 18, mass: 0.9, stiffness: 90 } });
  const drift = interpolate(frame, [at, LIGHT_FRAMES], [0, 1], { extrapolateLeft: "clamp" });
  const rx = interpolate(s, [0, 1], [32, 9]) - drift * 3;
  const ry = interpolate(s, [0, 1], [-26, -7]) + drift * 4;
  const y = interpolate(s, [0, 1], [560, 10]) - drift * 14;
  const sc = 0.97 + drift * 0.05;
  // message types in after the card lands
  const msg = "Hi! We need a new booking page and intake form for our bookkeeping clients before tax season. Budget is around $2,500 and we would like it live by the end of this month. Can we set up a call?";
  const chars = Math.floor(interpolate(frame, [at + 14, at + 50], [0, msg.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  return (
    <div style={{ position: "absolute", inset: 0, perspective: 1800, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{
        width: 1380, background: "#ffffff", borderRadius: 34, padding: "52px 68px 58px",
        transform: `translateY(${y}px) rotateX(${rx}deg) rotateY(${ry}deg) scale(${sc})`,
        boxShadow: "0 50px 120px rgba(59,108,246,0.18), 0 8px 24px rgba(22,24,29,0.06)",
        border: `1px solid ${L.line}`, fontFamily: INTER, opacity: interpolate(s, [0, 0.2], [0, 1]),
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 18, height: 18, borderRadius: 9, background: L.blue, boxShadow: `0 0 16px ${L.blueSoft}` }} />
            <div style={{ fontSize: 34, fontWeight: 600, color: L.ink }}>New inquiry</div>
            <div style={{ fontSize: 25, color: L.blue, background: "#eaf0ff", padding: "6px 14px", borderRadius: 999, fontWeight: 500 }}>Website form</div>
          </div>
          <div style={{ fontSize: 29, color: L.grey }}>1:14 AM</div>
        </div>
        <Field k="Name" v="Priya Shah" />
        <Field k="Company" v="Shah Bookkeeping" />
        <Field k="Email" v="priya.shah@example.com" />
        <div style={{ fontSize: 31, color: L.grey, marginTop: 24, marginBottom: 8 }}>Message</div>
        <div style={{ fontSize: 35, lineHeight: 1.45, color: L.ink, fontWeight: 400, minHeight: 200 }}>
          {msg.slice(0, chars)}
          <span style={{ opacity: Math.floor(frame / 8) % 2 ? 0 : 1, color: L.blue }}>|</span>
        </div>
      </div>
    </div>
  );
};

export const LightTest: React.FC = () => {
  const frame = useCurrentFrame();
  const CARD = 106; // 3.33 s, just after "comes in"
  // headline lifts away as the card arrives
  const lift = interpolate(frame, [CARD - 2, CARD + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
  const glow = interpolate(frame, [0, LIGHT_FRAMES], [0, 1]);
  return (
    <AbsoluteFill style={{ background: L.bg, fontFamily: INTER, overflow: "hidden" }}>
      {/* soft blue glow that slowly drifts */}
      <div style={{
        position: "absolute", width: 1400, height: 900, borderRadius: "50%",
        left: 260 + glow * 80, top: 140 - glow * 40,
        background: "radial-gradient(closest-side, rgba(125,162,255,0.28), rgba(125,162,255,0))",
      }} />

      {/* headline */}
      <AbsoluteFill style={{
        alignItems: "center", justifyContent: "center",
        opacity: 1 - lift, transform: `translateY(${-lift * 120}px) scale(${1 - lift * 0.1})`, filter: `blur(${lift * 8}px)`,
      }}>
        <div style={{ fontSize: 110, fontWeight: 300, letterSpacing: -2, position: "absolute" }}>
          <Word text="1:14" at={VOICE_AT} color={L.blue} out={VOICE_AT + 44} />
          <Word text="AM." at={VOICE_AT + 23} color={L.ink} out={VOICE_AT + 44} />
        </div>
        <div style={{ fontSize: 110, fontWeight: 300, letterSpacing: -2, position: "absolute" }}>
          <Word text="A" at={VOICE_AT + 50} color={L.ink} />
          <Word text="new" at={VOICE_AT + 54} color={L.ink} />
          <Word text="inquiry." at={VOICE_AT + 74} color={L.blue} />
        </div>
      </AbsoluteFill>

      <InquiryCard at={CARD} />

      {/* sound */}
      <Audio src={staticFile("music.wav")} volume={(f) => interpolate(f, [0, 10, 160, 170], [0, 0.18, 0.18, 0], { extrapolateRight: "clamp" })} />
      <Sequence from={VOICE_AT}><Audio src={staticFile("voice/line01.wav")} /></Sequence>
      <Sequence from={VOICE_AT}><Audio src={staticFile("sfx/tink.wav")} volume={0.35} /></Sequence>
      <Sequence from={VOICE_AT + 50}><Audio src={staticFile("sfx/tap.wav")} volume={0.35} /></Sequence>
      <Sequence from={CARD - 8}><Audio src={staticFile("sfx/whoosh-b.wav")} volume={0.45} /></Sequence>
      <Sequence from={CARD + 12}><Audio src={staticFile("sfx/typing.wav")} volume={0.22} /></Sequence>
    </AbsoluteFill>
  );
};
