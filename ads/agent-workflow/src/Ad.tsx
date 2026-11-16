import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
import { BRAND, EndCard } from "./Brand";
import timing from "./timing.json";

const INTER = loadFont("normal", { weights: ["300", "400", "500", "600"], subsets: ["latin"] }).fontFamily;
const MONO = loadMono("normal", { weights: ["400", "500"], subsets: ["latin"] }).fontFamily;

/* ---------- timing: every scene keys off the voice take (src/timing.json) ---------- */
type Line = { dur: number; words: { w: string; s: number }[] };
const TM = timing as unknown as Record<string, Line>;
const FPS = 30;
const NLINES = Object.keys(TM).length; // one scene per line, the last line is the end card
const GAPS = [0.45, 0.6, 0.35, 0.3, 0.3, 0.35, 0.3, 0.35, 0.35, 0.45, 0.4, 0.35]; // silence after each line (s)
const START: number[] = [];
{
  let t = 0.3;
  for (let n = 1; n <= NLINES; n++) { START.push(Math.round(t * FPS)); t += TM[n].dur + (GAPS[n - 1] ?? 0); }
}
const LS = (n: number) => START[n - 1];                       // line n start, absolute frame
const WD = (n: number, i: number) => Math.round(TM[n].words[i].s * FPS); // word i of line n, frames from line start
const PRE = 10;  // a scene opens 10 frames before its line
const TAIL = 14; // and overlaps the next scene by 14 frames
const L = PRE;   // voice start inside a scene
const END_AT = LS(NLINES) - 4; // the last line plays over the end card
const END_LEN = 150;
export const AD_FRAMES = END_AT + END_LEN;
const sceneLen = (n: number) => LS(n + 1) - LS(n) + TAIL;

/* ---------- look ---------- */
const C = { bg: "#f6f8ff", ink: BRAND.ink, blue: BRAND.cobalt, soft: BRAND.cobaltSoft, grey: BRAND.grey, line: "#e4e8f3", navy: "#071233", pale: "#eaf0ff" };
const ease = Easing.bezier(0.22, 1, 0.36, 1);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ramp = (f: number, a: number, b: number) => interpolate(f, [a, b], [0, 1], { ...clamp, easing: ease });
const cardStyle: React.CSSProperties = {
  background: "#fff", borderRadius: 34, fontFamily: INTER, border: `1px solid ${C.line}`,
  boxShadow: "0 50px 120px rgba(47,91,234,0.22), 0 8px 24px rgba(20,22,27,0.06)",
};

const Sfx: React.FC<{ at: number; s: string; v?: number; d?: number }> = ({ at, s, v = 0.3, d }) => (
  <Sequence from={Math.max(0, at)} durationInFrames={d}><Audio src={staticFile(`sfx/${s}.wav`)} volume={v} /></Sequence>
);
const Voice: React.FC<{ n: number }> = ({ n }) => (
  <Sequence from={L}><Audio src={staticFile(`voice/line${String(n).padStart(2, "0")}.wav`)} /></Sequence>
);

/** Word that rises in from a blur; `big` adds a horizontal smear like motion blur. */
const Word: React.FC<{ text: string; at: number; color: string; out?: number; big?: boolean }> = ({ text, at, color, out, big }) => {
  const f = useCurrentFrame();
  const p = ramp(f, at, at + (big ? 8 : 10));
  const o = out === undefined ? 1 : 1 - ramp(f, out, out + 6);
  return (
    <span style={{
      display: "inline-block", color, opacity: p * o, marginRight: "0.26em",
      transform: big ? `translateX(${(1 - p) * 60}px) scaleX(${1 + (1 - p) * 0.35})` : `translateY(${(1 - p) * 26}px)`,
      filter: `blur(${(1 - p) * (big ? 16 : 10)}px)`,
    }}>{text}</span>
  );
};

/** Shot wrapper: blur-rise in, slow push, then a push-through blur out into the next shot. */
const Shot: React.FC<{ len: number; children: React.ReactNode }> = ({ len, children }) => {
  const f = useCurrentFrame();
  const a = ramp(f, 0, 12), b = ramp(f, len - TAIL, len);
  const push = interpolate(f, [0, len], [1, 1.035]);
  return (
    <AbsoluteFill style={{
      opacity: a * (1 - b), filter: `blur(${(1 - a) * 10 + b * 14}px)`,
      transform: `scale(${push * (1 + b * 0.16)}) translateY(${(1 - a) * 30}px)`,
    }}>{children}</AbsoluteFill>
  );
};

const Wash: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / AD_FRAMES;
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <AbsoluteFill style={{
        background: `radial-gradient(ellipse 75% 70% at ${78 - t * 30}% ${112 - t * 8}%, rgba(47,91,234,0.95) 0%, rgba(47,91,234,0.45) 35%, rgba(143,168,255,0.15) 62%, rgba(255,255,255,0) 80%)`,
      }} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 40% 35% at ${18 + t * 20}% ${8 + t * 6}%, rgba(255,255,255,0.9), rgba(255,255,255,0))` }} />
    </AbsoluteFill>
  );
};

/** Category tag. The AI returns only hot, warm, or spam; never a score. */
const Tag: React.FC<{ c: "HOT" | "WARM" | "SPAM"; size?: number }> = ({ c, size = 22 }) => {
  const s = c === "HOT" ? { background: C.blue, color: "#fff" } : c === "WARM" ? { background: C.pale, color: C.blue } : { background: "#eceef3", color: "#6b7182" };
  return <span style={{ ...s, display: "inline-block", lineHeight: 1.15, fontFamily: MONO, fontSize: size, fontWeight: 500, letterSpacing: 2, padding: `${size * 0.3}px ${size * 0.7}px`, borderRadius: 999 }}>{c}</span>;
};

/* Demo data: every campaign, rule, pay rate, time, and task shown is invented for the ad.
   Real results from the portfolio piece: about ten hours a week saved, 64 posts, 14 batches, 31 research files. */
const NAVY_BG = `radial-gradient(ellipse 80% 70% at 50% 120%, #1f45c9 0%, #0b1a52 45%, ${C.navy} 80%)`;
const RED = "#e0484d";

/** Small rounded label. */
const Pill: React.FC<{ text: string; on?: boolean; size?: number; style?: React.CSSProperties }> = ({ text, on = true, size = 24, style }) => (
  <span style={{
    display: "inline-block", lineHeight: 1.15, fontSize: size, fontWeight: 500, padding: `${size * 0.32}px ${size * 0.75}px`, borderRadius: 999,
    background: on ? C.pale : "#eceef3", color: on ? C.blue : "#6b7182", whiteSpace: "nowrap", ...style,
  }}>{text}</span>
);

/* ---------- scene 1: nine at night, the day job just ended ---------- */
const S1: React.FC = () => {
  const f = useCurrentFrame();
  const len = sceneLen(1);
  const tNine = L + WD(1, 1), tNight = L + WD(1, 3), tDay = L + WD(1, 6), tEnd = L + WD(1, 9);
  const card = ramp(f, tDay - 10, tDay + 6);
  const bar = interpolate(f, [tDay - 10, tEnd], [0.5, 1], { ...clamp, easing: ease });
  const done = ramp(f, tEnd, tEnd + 8);
  return (
    <Shot len={len}>
      <AbsoluteFill style={{ background: NAVY_BG }} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
        <div style={{ fontSize: 170, fontWeight: 300, letterSpacing: -5, fontVariantNumeric: "tabular-nums", transform: `translateY(${-card * 30}px)` }}>
          <Word big text="9:00" at={tNine} color={C.soft} />
          <Word big text="PM" at={tNight} color="#fff" />
        </div>
        <div style={{ width: 1100, marginTop: 50, opacity: card, transform: `translateY(${(1 - card) * 40}px)`, filter: `blur(${(1 - card) * 8}px)` }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 32, color: "rgba(255,255,255,0.75)", marginBottom: 18 }}>
            <span>Day job</span>
            <span style={{ color: done > 0.5 ? "#fff" : "rgba(255,255,255,0.75)", fontWeight: done > 0.5 ? 600 : 400 }}>{done > 0.5 ? "✓ Signed off" : "9 AM to 9 PM"}</span>
          </div>
          <div style={{ height: 16, borderRadius: 8, background: "rgba(143,168,255,0.18)", overflow: "hidden" }}>
            <div style={{ width: `${bar * 100}%`, height: "100%", background: C.soft, boxShadow: `0 0 20px ${C.soft}` }} />
          </div>
        </div>
      </AbsoluteFill>
      <Voice n={1} />
      <Sfx at={tNine} s="tink" />
      <Sfx at={tDay - 10} s="whoosh-b" v={0.35} />
      <Sfx at={tEnd} s="tap" v={0.35} />
    </Shot>
  );
};

/* ---------- scene 2: the side business needs hours you don't have ---------- */
const TODO = [["Find new campaigns", "1.5 h"], ["Read every brief", "1 h"], ["Edit the clips", "3 h"], ["Check each clip", "1 h"], ["Schedule the posts", "0.5 h"]];
const S2: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const len = sceneLen(2);
  const tSide = L + WD(2, 2), tHours = L + WD(2, 6), tDont = L + WD(2, 8);
  const cs = spring({ frame: f - (tSide - 10), fps, config: { damping: 18, stiffness: 95 } });
  const need = ramp(f, tHours, tHours + 8), short = ramp(f, tDont, tDont + 8);
  const d = interpolate(f, [0, len], [0, 1]);
  return (
    <Shot len={len}>
      <AbsoluteFill style={{ background: NAVY_BG }} />
      <AbsoluteFill style={{ perspective: 1800, alignItems: "center", justifyContent: "center" }}>
        <div style={{ ...cardStyle, width: 1150, padding: "40px 56px 44px", opacity: cs, transform: `translateY(${(1 - cs) * 320}px) rotateX(${8 - d * 3}deg) rotateY(${-6 + d * 4}deg)` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontSize: 38, fontWeight: 600, color: C.ink }}>Side business</div>
            <Pill text="Tonight" size={26} />
          </div>
          {TODO.map(([t, h], i) => {
            const k = ramp(f, tSide + i * 5, tSide + i * 5 + 10);
            return (
              <div key={t} style={{ display: "flex", alignItems: "center", gap: 22, padding: "16px 0", borderBottom: `1px solid ${C.line}`, fontSize: 32, opacity: k, transform: `translateX(${(1 - k) * -40}px)` }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, border: `3px solid ${C.line}`, flexShrink: 0 }} />
                <div style={{ flex: 1, color: C.ink }}>{t}</div>
                <div style={{ color: C.grey, fontVariantNumeric: "tabular-nums" }}>{h}</div>
              </div>
            );
          })}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 26 }}>
            <div style={{ fontSize: 34, fontWeight: 600, color: C.ink, opacity: need, filter: `blur(${(1 - need) * 6}px)` }}>Needed: 7 hours</div>
            <div style={{
              fontSize: 32, fontWeight: 600, color: RED, background: "#fdecec", padding: "12px 26px", borderRadius: 999,
              opacity: short, transform: `scale(${0.8 + short * 0.2 + Math.sin(short * Math.PI) * 0.06})`,
            }}>Free tonight: 2 hours</div>
          </div>
        </div>
      </AbsoluteFill>
      <Voice n={2} />
      <Sfx at={tSide - 10} s="whoosh-a" v={0.35} />
      {TODO.map((_, i) => <Sfx key={i} at={tSide + i * 5} s="pop" v={0.14} />)}
      <Sfx at={tHours} s="tap" v={0.3} />
      <Sfx at={tDont} s="click" v={0.45} />
    </Shot>
  );
};

/* ---------- scene 3: the turn, dark to light ---------- */
const S3: React.FC = () => {
  const f = useCurrentFrame();
  const len = sceneLen(3);
  const t0 = L + WD(3, 0);
  const lt = ramp(f, t0 - 2, t0 + 18);
  const words = ["Here's", "how", "it", "gets", "done", "without", "you."];
  return (
    <Shot len={len}>
      <AbsoluteFill style={{ background: NAVY_BG, opacity: 1 - lt }} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 100, fontWeight: 300, letterSpacing: -3, textAlign: "center", whiteSpace: "nowrap" }}>
          {words.map((w, i) => <Word key={w} text={w} at={L + WD(3, i)} color={i >= 5 ? C.blue : C.ink} />)}
        </div>
      </AbsoluteFill>
      <Voice n={3} />
      <Sfx at={t0 - 6} s="riser" v={0.12} />
      <Sfx at={L + WD(3, 5)} s="tink" v={0.28} />
    </Shot>
  );
};

/* ---------- scene 4: one command, the agent takes over ---------- */
const PIPE = ["Find", "Make", "Check", "Schedule", "Track"];
const CMD = "/run tonight";
const S4: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const len = sceneLen(4);
  const tType = L + WD(4, 1), tCmd = L + WD(4, 3), tAgent = L + WD(4, 6), tTakes = L + WD(4, 7);
  const cs = spring({ frame: f, fps, config: { damping: 20, stiffness: 90 } });
  const n = Math.floor(interpolate(f, [tType, tCmd + 4], [0, CMD.length], clamp));
  const run = ramp(f, tAgent - 4, tAgent + 6);
  const d = interpolate(f, [0, len], [0, 1]);
  return (
    <Shot len={len}>
      <AbsoluteFill style={{ perspective: 2000, alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
        <div style={{
          width: 1300, borderRadius: 30, padding: "34px 52px 44px", fontFamily: MONO,
          background: "linear-gradient(160deg, #0d1736 0%, #070d22 100%)", color: "#dfe6ff",
          boxShadow: "0 50px 120px rgba(7,18,51,0.45)", border: "1px solid rgba(143,168,255,0.18)",
          opacity: cs, transform: `translateY(${(1 - cs) * 200}px) rotateX(${10 - d * 3}deg) rotateY(${-5 + d * 4}deg)`,
        }}>
          <div style={{ display: "flex", gap: 12, marginBottom: 34 }}>
            {[0, 1, 2].map((i) => <div key={i} style={{ width: 16, height: 16, borderRadius: 8, background: "rgba(143,168,255,0.3)" }} />)}
          </div>
          <div style={{ fontSize: 52, minHeight: 70 }}>
            <span style={{ color: C.soft }}>{"> "}</span>{CMD.slice(0, n)}
            {f < tAgent && <span style={{ opacity: Math.floor(f / 8) % 2 ? 0 : 1, color: C.soft }}>|</span>}
          </div>
          <div style={{ fontSize: 34, marginTop: 24, color: C.soft, opacity: run, display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 14, height: 14, borderRadius: 7, background: C.soft, boxShadow: `0 0 14px ${C.soft}`, opacity: 0.5 + 0.5 * Math.sin(f / 4) }} />
            Agent running · 5 steps
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", marginTop: 70 }}>
          {PIPE.map((s, i) => {
            const at = tTakes + i * 6;
            const k = ramp(f, at, at + 8);
            return (
              <React.Fragment key={s}>
                {i > 0 && (
                  <div style={{ width: 70, height: 4, background: C.line, position: "relative" }}>
                    <div style={{ position: "absolute", inset: 0, background: C.blue, transformOrigin: "0 50%", transform: `scaleX(${k})` }} />
                  </div>
                )}
                <div style={{
                  ...cardStyle, borderRadius: 999, padding: "18px 36px", fontSize: 32, fontWeight: 500,
                  background: k > 0.5 ? C.blue : "#fff", color: k > 0.5 ? "#fff" : C.grey, border: `1px solid ${k > 0.5 ? C.blue : C.line}`,
                  opacity: 0.3 + run * 0.7, transform: `scale(${1 + Math.sin(k * Math.PI) * 0.06})`,
                }}>{s}</div>
              </React.Fragment>
            );
          })}
        </div>
      </AbsoluteFill>
      <Voice n={4} />
      <Sfx at={0} s="whoosh-c" v={0.35} />
      <Sfx at={tType} s="typing" v={0.2} d={tCmd + 4 - tType} />
      <Sfx at={tCmd + 6} s="click" v={0.4} />
      {PIPE.map((_, i) => <Sfx key={i} at={tTakes + i * 6} s="pop" v={0.14} />)}
    </Shot>
  );
};

/* ---------- campaign cards used by scenes 5 and 6 ---------- */
const CAMPS = [
  { name: "Gaming highlights", pay: "$1.50 per 1K views", rule: "Credit tag in caption" },
  { name: "Podcast moments", pay: "$2.00 per 1K views", rule: "No permission to clip" },
  { name: "Fitness tips", pay: "$1.20 per 1K views", rule: "Under 60 seconds" },
];
const CampCard: React.FC<{ c: (typeof CAMPS)[number]; inAt: number; scanAt: number; bad?: boolean; badAt?: number; dropAt?: number; keptAt?: number }> = ({ c, inAt, scanAt, bad, badAt = 1e6, dropAt = 1e6, keptAt = 1e6 }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - inAt, fps, config: { damping: 17, stiffness: 110 } });
  const sc = interpolate(f, [scanAt, scanAt + 14], [0, 1], clamp);
  const read = ramp(f, scanAt + 12, scanAt + 18);
  const br = ramp(f, badAt, badAt + 8);
  const dr = spring({ frame: f - dropAt, fps, config: { damping: 14, stiffness: 140 } });
  const kp = ramp(f, keptAt, keptAt + 8);
  return (
    <div style={{ position: "relative", opacity: s * (1 - dr * 0.55), transform: `translateY(${(1 - s) * 120 + dr * 60}px) rotate(${dr * 4}deg)`, filter: `blur(${dr * 1.5}px)` }}>
      <div style={{ ...cardStyle, width: 480, height: 520, padding: "36px 40px", boxSizing: "border-box", position: "relative", overflow: "hidden", border: `2px solid ${br > 0.5 ? RED : C.line}` }}>
        <div style={{ width: 64, height: 64, borderRadius: 18, background: C.pale, marginBottom: 22 }} />
        <div style={{ fontSize: 34, fontWeight: 600, color: C.ink }}>{c.name}</div>
        <div style={{ fontSize: 26, color: C.blue, fontWeight: 500, marginTop: 8 }}>{c.pay}</div>
        <div style={{ fontSize: 22, color: C.grey, letterSpacing: 2, fontFamily: MONO, marginTop: 30, marginBottom: 12 }}>BRIEF</div>
        {[90, 75, 84].map((w, i) => <div key={i} style={{ width: `${w}%`, height: 14, borderRadius: 7, background: "#eef0f5", marginBottom: 12 }} />)}
        <div style={{
          marginTop: 18, fontSize: 25, padding: "10px 16px", borderRadius: 12,
          background: br > 0.5 ? "#fdecec" : "#f4f6fc", color: br > 0.5 ? RED : "#3c4150", fontWeight: br > 0.5 ? 600 : 400,
        }}>{bad && br > 0.5 ? "✕ " : ""}{c.rule}</div>
        <div style={{ position: "absolute", left: 40, bottom: 30, display: "flex", gap: 10, opacity: read }}>
          <Pill text="✓ Brief read" size={22} />
          {kp > 0 && <Pill text="Kept" size={22} style={{ opacity: kp, background: C.blue, color: "#fff" }} />}
        </div>
        {sc > 0 && sc < 1 && (
          <div style={{ position: "absolute", left: 0, right: 0, top: sc * 520 - 3, height: 6, background: C.blue, boxShadow: "0 0 30px 8px rgba(47,91,234,0.35)" }} />
        )}
      </div>
      {bad && (
        <div style={{
          position: "absolute", left: 70, top: 200, background: "#fff", padding: "10px 26px", border: `5px solid ${RED}`, borderRadius: 14, color: RED,
          fontSize: 48, fontWeight: 600, letterSpacing: 4, fontFamily: MONO, opacity: dr > 0.02 ? 1 : 0, transform: `rotate(-10deg) scale(${interpolate(dr, [0, 1], [2.2, 1])})`,
        }}>DROPPED</div>
      )}
    </div>
  );
};

/* ---------- scene 5: finds new work, reads every brief ---------- */
const S5: React.FC = () => {
  const f = useCurrentFrame();
  const len = sceneLen(5);
  const tFind = L + WD(5, 2), tRead = L + WD(5, 6), tBrief = L + WD(5, 8);
  const step = (tBrief - tRead) / 2;
  const d = interpolate(f, [0, len], [0, 1]);
  const head = ramp(f, tFind, tFind + 10);
  return (
    <Shot len={len}>
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 120 }}>
        <div style={{ fontSize: 30, color: C.grey, letterSpacing: 4, fontFamily: MONO, marginBottom: 40, opacity: head }}>NEW WORK FOUND · 3</div>
        <div style={{ perspective: 2200 }}>
          <div style={{ display: "flex", gap: 60, transform: `rotateX(10deg) rotateY(${-4 + d * 7}deg)` }}>
            {CAMPS.map((c, i) => <CampCard key={c.name} c={c} inAt={tFind + i * 5} scanAt={Math.round(tRead + i * step)} />)}
          </div>
        </div>
      </AbsoluteFill>
      <Voice n={5} />
      <Sfx at={0} s="whoosh-b" v={0.35} />
      {CAMPS.map((_, i) => <Sfx key={i} at={tFind + i * 5} s="pop" v={0.18} />)}
      {CAMPS.map((_, i) => <Sfx key={`s${i}`} at={Math.round(tRead + i * step) + 12} s="click" v={0.25} />)}
    </Shot>
  );
};

/* ---------- scene 6: anything that breaks the rules gets dropped ---------- */
const S6: React.FC = () => {
  const f = useCurrentFrame();
  const len = sceneLen(6);
  const tBreak = L + WD(6, 2), tDrop = L + WD(6, 6);
  const d = interpolate(f, [0, len], [0, 1]);
  return (
    <Shot len={len}>
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 120 }}>
        <div style={{ fontSize: 30, color: C.grey, letterSpacing: 4, fontFamily: MONO, marginBottom: 40 }}>CHECKED AGAINST THE RULES</div>
        <div style={{ perspective: 2200 }}>
          <div style={{ display: "flex", gap: 60, transform: `rotateX(10deg) rotateY(${3 - d * 5}deg)` }}>
            {CAMPS.map((c, i) => (
              <CampCard key={c.name} c={c} inAt={-100} scanAt={-100} bad={i === 1} badAt={i === 1 ? tBreak : 1e6} dropAt={i === 1 ? tDrop : 1e6} keptAt={i === 1 ? 1e6 : tDrop + 6} />
            ))}
          </div>
        </div>
      </AbsoluteFill>
      <Voice n={6} />
      <Sfx at={0} s="whoosh-c" v={0.3} />
      <Sfx at={tBreak} s="tap" v={0.35} />
      <Sfx at={tDrop} s="stamp" v={0.4} />
      <Sfx at={tDrop + 6} s="tink" v={0.22} />
    </Shot>
  );
};

/* ---------- the check list used by scenes 7 and 8 ---------- */
const CHECKS = ["Hook in the first 2 s", "Captions easy to read", "Credit tag added", "Under 60 s"];
type CState = "wait" | "pass" | "fail" | "fix" | "again";
const CheckList: React.FC<{ width: number; states: CState[]; title: string }> = ({ width, states, title }) => {
  const f = useCurrentFrame();
  return (
    <div style={{ ...cardStyle, width, padding: "40px 52px 44px", boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ fontSize: 36, fontWeight: 600, color: C.ink }}>Check list</div>
        <div style={{ fontSize: 25, color: C.grey }}>{title}</div>
      </div>
      {CHECKS.map((t, i) => {
        const s = states[i];
        const bg = s === "pass" || s === "again" ? C.blue : s === "fail" ? RED : s === "fix" ? C.pale : "#eef0f5";
        const mark = s === "pass" || s === "again" ? "✓" : s === "fail" ? "✕" : "";
        return (
          <div key={t} style={{ display: "flex", alignItems: "center", gap: 22, padding: "18px 0", borderTop: `1px solid ${C.line}`, fontSize: 32 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, color: "#fff", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 600, position: "relative", overflow: "hidden" }}>
              {mark}
              {s === "fix" && <div style={{ position: "absolute", width: 26, height: 26, borderRadius: 13, border: `4px solid ${C.blue}`, borderTopColor: "transparent", transform: `rotate(${f * 18}deg)` }} />}
            </div>
            <div style={{ flex: 1, color: s === "fail" ? RED : C.ink, fontWeight: s === "fail" ? 600 : 400 }}>{t}</div>
            {s === "fail" && <Pill text="Failed" size={22} style={{ background: "#fdecec", color: RED }} />}
            {s === "fix" && <Pill text="Fixing" size={22} />}
            {s === "again" && <Pill text="Passed on recheck" size={22} style={{ background: C.blue, color: "#fff" }} />}
          </div>
        );
      })}
    </div>
  );
};

/* ---------- scene 7: builds each job, checks it against a list ---------- */
const CLIPS = ["#2f5bea", "#4b6ff0", "#1d3fb8"];
const S7: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const len = sceneLen(7);
  const tBuild = L + WD(7, 2), tCheck = L + WD(7, 6), tList = L + WD(7, 10);
  const panel = spring({ frame: f - (tCheck - 8), fps, config: { damping: 18, stiffness: 100 } });
  const d = interpolate(f, [0, len], [0, 1]);
  const states: CState[] = CHECKS.map((_, i) => (f >= tCheck + 4 + i * 6 ? "pass" : "wait"));
  return (
    <Shot len={len}>
      <AbsoluteFill style={{ perspective: 2200 }}>
        <div style={{ position: "absolute", left: 170, top: 250, display: "flex", gap: 34, transform: `rotateY(${10 - d * 4}deg) rotateX(6deg)` }}>
          {CLIPS.map((col, i) => {
            const at = tBuild + i * 8;
            const s = spring({ frame: f - at, fps, config: { damping: 17, stiffness: 110 } });
            const p = interpolate(f, [at + 4, at + 40], [0, 1], { ...clamp, easing: ease });
            return (
              <div key={i} style={{ ...cardStyle, width: 230, height: 420, padding: 14, boxSizing: "border-box", opacity: s, transform: `translateY(${(1 - s) * 100}px)` }}>
                <div style={{ width: "100%", height: 320, borderRadius: 20, background: `linear-gradient(170deg, ${col}, #0b1a52)`, position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", left: 18, right: 18, top: 140, height: 18, borderRadius: 9, background: "rgba(255,255,255,0.85)", opacity: p > 0.4 ? 1 : 0 }} />
                  <div style={{ position: "absolute", left: 40, right: 40, top: 168, height: 14, borderRadius: 7, background: "rgba(255,255,255,0.6)", opacity: p > 0.6 ? 1 : 0 }} />
                </div>
                <div style={{ fontSize: 22, color: C.grey, marginTop: 14, marginBottom: 10 }}>Clip {i + 1}</div>
                <div style={{ height: 8, borderRadius: 4, background: C.line, overflow: "hidden" }}>
                  <div style={{ width: `${p * 100}%`, height: "100%", background: C.blue }} />
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ position: "absolute", right: 120, top: 250, opacity: panel, transform: `translateX(${(1 - panel) * 300}px) rotateY(${-8 + d * 3}deg)` }}>
          <CheckList width={790} states={states} title="Clip 1" />
        </div>
      </AbsoluteFill>
      <Voice n={7} />
      <Sfx at={0} s="whoosh-a" v={0.35} />
      {CLIPS.map((_, i) => <Sfx key={i} at={tBuild + i * 8} s="pop" v={0.16} />)}
      <Sfx at={tCheck - 8} s="whoosh-b" v={0.25} />
      {CHECKS.map((_, i) => <Sfx key={`c${i}`} at={tCheck + 4 + i * 6} s="click" v={0.22} />)}
      <Sfx at={tList} s="tink" v={0.2} />
    </Shot>
  );
};

/* ---------- scene 8: a check fails, it fixes it, checks again ---------- */
const S8: React.FC = () => {
  const f = useCurrentFrame();
  const len = sceneLen(8);
  const tFail = L + WD(8, 3), tFix = L + WD(8, 5), tAgain = L + WD(8, 8);
  const d = interpolate(f, [0, len], [0, 1]);
  const s2: CState = f >= tAgain + 4 ? "again" : f >= tFix ? "fix" : f >= tFail ? "fail" : "wait";
  const shake = f >= tFail && f < tFail + 10 ? Math.sin((f - tFail) * 2.2) * 8 * (1 - (f - tFail) / 10) : 0;
  return (
    <Shot len={len}>
      <AbsoluteFill style={{ perspective: 2000, alignItems: "center", justifyContent: "center" }}>
        <div style={{ transform: `translateX(${shake}px) rotateY(${-6 + d * 6}deg) rotateX(6deg)` }}>
          <CheckList width={1200} states={["pass", "pass", s2, "pass"]} title="Clip 2" />
        </div>
      </AbsoluteFill>
      <Voice n={8} />
      <Sfx at={0} s="whoosh-c" v={0.35} />
      <Sfx at={tFail} s="tap" v={0.4} />
      <Sfx at={tFix} s="typing" v={0.16} d={tAgain - tFix} />
      <Sfx at={tAgain + 4} s="ding" v={0.26} />
    </Shot>
  );
};

/* ---------- scene 9: posts booked around the hours you're busy ---------- */
const WDAYS = ["Mon 16", "Tue 17", "Wed 18", "Thu 19", "Fri 20"];
const WHOURS = ["6 PM", "7 PM", "8 PM", "9 PM", "10 PM"];
const COLW = 250, ROWH = 100, X0 = 110, Y0 = 60;
const cellPos = (dd: number, h: number) => ({ left: X0 + dd * COLW + 8, top: Y0 + h * ROWH + 8, width: COLW - 16, height: ROWH - 16 });
const BUSY = [[0, 0], [0, 1], [1, 0], [2, 0], [2, 1], [3, 0], [3, 3], [4, 0], [4, 1], [1, 3]];
const POSTS = [[0, 3, "Gaming"], [1, 1, "Fitness"], [2, 3, "Gaming"], [3, 1, "Fitness"], [4, 2, "Gaming"]] as const;
const S9: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const len = sceneLen(9);
  const tBook = L + WD(9, 2), tBusy = L + WD(9, 7);
  const pu = ramp(f, tBusy, tBusy + 5) * (1 - ramp(f, tBusy + 8, tBusy + 22));
  const d = interpolate(f, [0, len], [0, 1]);
  return (
    <Shot len={len}>
      <AbsoluteFill style={{ perspective: 2200, alignItems: "center", justifyContent: "center" }}>
        <div style={{ ...cardStyle, width: X0 + COLW * 5 + 80, padding: "32px 40px 40px", boxSizing: "border-box", transform: `rotateX(${14 - d * 4}deg) rotateY(${6 - d * 5}deg)` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 32, fontWeight: 600, color: C.ink }}>This week</div>
            <div style={{ fontSize: 24, color: C.grey }}>Post schedule</div>
          </div>
          <div style={{ position: "relative", height: Y0 + ROWH * WHOURS.length }}>
            {WDAYS.map((x, i) => <div key={x} style={{ position: "absolute", left: X0 + i * COLW, top: 8, width: COLW, textAlign: "center", fontSize: 24, fontWeight: 500, color: C.grey }}>{x}</div>)}
            {WHOURS.map((h, j) => (
              <div key={h} style={{ position: "absolute", left: 0, top: Y0 + j * ROWH, width: X0 + COLW * 5, height: ROWH, borderTop: `1px solid ${C.line}` }}>
                <div style={{ fontSize: 21, color: C.grey, paddingTop: 8 }}>{h}</div>
              </div>
            ))}
            {BUSY.map(([dd, h], i) => (
              <div key={i} style={{
                position: "absolute", ...cellPos(dd, h), borderRadius: 14, boxSizing: "border-box", padding: "14px 18px",
                background: "#eef0f5", color: "#7a8091", fontSize: 23, fontWeight: 500,
                boxShadow: `0 0 0 ${pu * 4}px rgba(122,128,145,${pu * 0.5})`,
              }}>Busy</div>
            ))}
            {POSTS.map(([dd, h, t], i) => {
              const at = tBook + i * 5;
              const s = spring({ frame: f - at, fps, config: { damping: 14, stiffness: 130 } });
              return (
                <div key={i} style={{
                  position: "absolute", ...cellPos(dd, h), borderRadius: 14, boxSizing: "border-box", padding: "12px 18px",
                  background: C.blue, color: "#fff", boxShadow: "0 14px 30px rgba(47,91,234,0.35)",
                  opacity: ramp(f, at - 2, at + 4), transform: `translateY(${(1 - s) * -200}px) scale(${0.9 + s * 0.1})`,
                }}>
                  <div style={{ fontSize: 22, fontWeight: 600 }}>Post · {t}</div>
                  <div style={{ fontSize: 19, opacity: 0.85, marginTop: 2 }}>Booked</div>
                </div>
              );
            })}
          </div>
        </div>
      </AbsoluteFill>
      <Voice n={9} />
      <Sfx at={0} s="whoosh-b" v={0.35} />
      {POSTS.map((_, i) => <Sfx key={i} at={tBook + i * 5} s="pop" v={0.16} />)}
      <Sfx at={tBusy} s="tap" v={0.25} />
    </Shot>
  );
};

/* ---------- scene 10: when it needs you, one task with the exact clicks ---------- */
const CLICKS = ["Open the campaign page", "Paste the post link", "Tick the box, then Submit"];
const S10: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const len = sceneLen(10);
  const tNeeds = L + WD(10, 3), tLeaves = L + WD(10, 6), tTask = L + WD(10, 8), tExact = L + WD(10, 11);
  const pause = ramp(f, tNeeds - 4, tNeeds + 6);
  const cs = spring({ frame: f - (tLeaves - 4), fps, config: { damping: 18, stiffness: 100 } });
  const one = ramp(f, tTask, tTask + 8);
  const d = interpolate(f, [0, len], [0, 1]);
  return (
    <Shot len={len}>
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 110 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 32, color: C.blue, fontWeight: 500, marginBottom: 46, opacity: pause, filter: `blur(${(1 - pause) * 6}px)` }}>
          <div style={{ width: 14, height: 14, borderRadius: 7, background: C.blue, opacity: 0.5 + 0.5 * Math.sin(f / 4) }} />
          Agent paused · needs you
        </div>
        <div style={{ perspective: 2000 }}>
          <div style={{ ...cardStyle, width: 1200, padding: "40px 56px 44px", boxSizing: "border-box", opacity: cs, transform: `translateY(${(1 - cs) * 260}px) rotateX(${8 - d * 3}deg) rotateY(${-6 + d * 5}deg)` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontSize: 26, color: C.grey, letterSpacing: 2, fontFamily: MONO }}>YOUR TURN</div>
              <Pill text="1 task" size={26} style={{ opacity: one, transform: `scale(${0.8 + one * 0.2 + Math.sin(one * Math.PI) * 0.1})`, background: C.blue, color: "#fff" }} />
            </div>
            <div style={{ fontSize: 50, fontWeight: 500, color: C.ink, letterSpacing: -1, marginBottom: 24 }}>Submit tonight's post</div>
            {CLICKS.map((t, i) => {
              const k = ramp(f, tExact - 14 + i * 7, tExact - 4 + i * 7);
              return (
                <div key={t} style={{ display: "flex", alignItems: "center", gap: 20, padding: "14px 0", borderTop: `1px solid ${C.line}`, fontSize: 32, opacity: 0.15 + k * 0.85, transform: `translateY(${(1 - k) * 14}px)` }}>
                  <div style={{ width: 46, height: 46, borderRadius: 23, background: C.pale, color: C.blue, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 600, flexShrink: 0 }}>{i + 1}</div>
                  <div style={{ color: C.ink, filter: `blur(${(1 - k) * 5}px)` }}>{t}</div>
                </div>
              );
            })}
          </div>
        </div>
      </AbsoluteFill>
      <Voice n={10} />
      <Sfx at={tNeeds - 4} s="tink" v={0.25} />
      <Sfx at={tLeaves - 4} s="whoosh-a" v={0.35} />
      <Sfx at={tTask} s="pop" v={0.25} />
      {CLICKS.map((_, i) => <Sfx key={i} at={tExact - 14 + i * 7} s="click" v={0.22} />)}
    </Shot>
  );
};

/* ---------- scene 11: about ten hours a week, back in your hands ---------- */
const STATS = ["64 posts", "14 batches", "31 research files"];
const S11: React.FC = () => {
  const f = useCurrentFrame();
  const len = sceneLen(11);
  const tAbout = L + WD(11, 1), tHours = L + WD(11, 3), tBack = L + WD(11, 6);
  const p = interpolate(f, [tAbout, tHours + 4], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const done = ramp(f, tHours + 4, tHours + 12);
  const bk = ramp(f, tBack, tBack + 10);
  return (
    <Shot len={len}>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
        <div style={{ fontSize: 30, color: C.grey, letterSpacing: 4, fontFamily: MONO, marginBottom: 6 }}>TIME SAVED</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 24 }}>
          <div style={{ fontSize: 300, fontWeight: 300, fontVariantNumeric: "tabular-nums", color: done > 0.5 ? C.blue : C.ink, letterSpacing: -8, lineHeight: 1, transform: `scale(${1 + done * 0.03})` }}>
            {Math.round(p * 10)}
          </div>
          <div style={{ fontSize: 70, fontWeight: 300, color: C.ink, letterSpacing: -2 }}>hours a week</div>
        </div>
        <div style={{ marginTop: 30, opacity: bk, transform: `translateY(${(1 - bk) * 20}px)` }}>
          <Pill text="Back in your hands" size={34} style={{ background: C.blue, color: "#fff" }} />
        </div>
        <div style={{ display: "flex", gap: 22, marginTop: 56 }}>
          {STATS.map((s, i) => {
            const k = ramp(f, tBack + 8 + i * 5, tBack + 18 + i * 5);
            return <div key={s} style={{ ...cardStyle, borderRadius: 20, padding: "16px 30px", fontSize: 28, color: C.ink, fontWeight: 500, opacity: k, transform: `translateY(${(1 - k) * 30}px)` }}>{s}</div>;
          })}
        </div>
      </AbsoluteFill>
      <Voice n={11} />
      <Sfx at={0} s="whoosh-a" v={0.35} />
      <Sfx at={tHours + 4} s="ding" v={0.25} />
      <Sfx at={tBack} s="sting" v={0.2} />
      {STATS.map((_, i) => <Sfx key={i} at={tBack + 8 + i * 5} s="pop" v={0.14} />)}
    </Shot>
  );
};

/* ---------- scene 12: you only approve what touches money or customers ---------- */
const APPROVALS: [string, string, "auto" | "money" | "cust"][] = [
  ["Find and vet campaigns", "Done", "auto"],
  ["Make and check clips", "Done", "auto"],
  ["Schedule posts", "Done", "auto"],
  ["Change payout settings", "Money", "money"],
  ["Reply to a brand", "Customer", "cust"],
];
const S12: React.FC = () => {
  const f = useCurrentFrame();
  const len = sceneLen(12);
  const tApprove = L + WD(12, 2), tMoney = L + WD(12, 5), tCust = L + WD(12, 7);
  const dim = ramp(f, tApprove, tApprove + 10);
  const d = interpolate(f, [0, len], [0, 1]);
  return (
    <Shot len={len}>
      <AbsoluteFill style={{ perspective: 2000, alignItems: "center", justifyContent: "center" }}>
        <div style={{ ...cardStyle, width: 1300, padding: "40px 56px 40px", boxSizing: "border-box", transform: `rotateY(${8 - d * 6}deg) rotateX(6deg)` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontSize: 38, fontWeight: 600, color: C.ink }}>Tonight's run</div>
            <div style={{ fontSize: 26, color: C.grey }}>Needs your OK: 2</div>
          </div>
          {APPROVALS.map(([t, tag, k]) => {
            const hl = k === "money" ? ramp(f, tMoney, tMoney + 8) : k === "cust" ? ramp(f, tCust, tCust + 8) : 0;
            const auto = k === "auto";
            return (
              <div key={t} style={{
                display: "flex", alignItems: "center", gap: 22, padding: "18px 20px", margin: "0 -20px", borderTop: `1px solid ${C.line}`, fontSize: 32, borderRadius: 16,
                opacity: auto ? 1 - dim * 0.55 : 1, background: `rgba(47,91,234,${hl * 0.08})`, boxShadow: `inset 0 0 0 ${hl * 2}px rgba(47,91,234,${hl * 0.5})`,
              }}>
                <div style={{ width: 40, height: 40, borderRadius: 20, background: auto ? "#eef0f5" : C.pale, color: auto ? C.grey : C.blue, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 600, flexShrink: 0 }}>{auto ? "✓" : "!"}</div>
                <div style={{ flex: 1, color: C.ink }}>{t}</div>
                {auto ? (
                  <div style={{ fontSize: 26, color: C.grey }}>{tag} by agent</div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <Pill text={tag} size={22} on={hl > 0.5} />
                    <div style={{
                      fontSize: 27, fontWeight: 600, padding: "12px 30px", borderRadius: 999,
                      background: hl > 0.5 ? C.blue : "#eceef3", color: hl > 0.5 ? "#fff" : "#9aa0ae", transform: `scale(${1 + Math.sin(hl * Math.PI) * 0.08})`,
                    }}>Approve</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
      <Voice n={12} />
      <Sfx at={0} s="whoosh-c" v={0.35} />
      <Sfx at={tApprove} s="tap" v={0.25} />
      <Sfx at={tMoney} s="click" v={0.35} />
      <Sfx at={tCust} s="click" v={0.35} />
    </Shot>
  );
};


/* ---------- the full ad ---------- */
const END = { lead: "AI", product: "Workflow Agent" }; // end card title: plain word, then the cobalt product name
const SCENES = [S1, S2, S3, S4, S5, S6, S7, S8, S9, S10, S11, S12];

const EndIn: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ opacity: ramp(f, 0, 10) }}>
      <EndCard lead={END.lead} product={END.product} />
      <Sequence from={4}><Audio src={staticFile(`voice/line${String(NLINES).padStart(2, "0")}.wav`)} /></Sequence>
    </AbsoluteFill>
  );
};

export const Ad: React.FC = () => (
  <AbsoluteFill style={{ fontFamily: INTER, overflow: "hidden", background: C.bg }}>
    <Wash />
    {SCENES.map((S, i) => (
      <Sequence key={i} from={LS(i + 1) - PRE} durationInFrames={sceneLen(i + 1)}><S /></Sequence>
    ))}
    <Sequence from={END_AT}><EndIn /></Sequence>
    <Sequence from={END_AT - 24}><Audio src={staticFile("sfx/riser.wav")} volume={0.18} /></Sequence>
    <Audio src={staticFile("music.wav")} volume={(x) => interpolate(x, [0, 10, AD_FRAMES - 40, AD_FRAMES], [0, 0.14, 0.14, 0], clamp)} />
  </AbsoluteFill>
);
