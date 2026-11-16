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
const GAPS = [0.5, 0.6, 0.45, 0.3, 0.35, 0.3, 0.35, 0.4, 0.4, 0.4, 0.3]; // silence after each line (s)
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

/* Demo data: the client "Bright Studio", quote #1042, the meeting, and every time shown are invented for the ad. */
const NAVY_BG = `radial-gradient(ellipse 80% 70% at 50% 120%, #1f45c9 0%, #0b1a52 45%, ${C.navy} 80%)`;

/** Small rounded label. */
const Pill: React.FC<{ text: string; on?: boolean; size?: number; style?: React.CSSProperties }> = ({ text, on = true, size = 24, style }) => (
  <span style={{
    display: "inline-block", lineHeight: 1.15, fontSize: size, fontWeight: 500, padding: `${size * 0.32}px ${size * 0.75}px`, borderRadius: 999,
    background: on ? C.pale : "#eceef3", color: on ? C.blue : "#6b7182", whiteSpace: "nowrap", ...style,
  }}>{text}</span>
);

/* ---------- a week grid used by scenes 3 to 5 ---------- */
const WDAYS = ["Mon 16", "Tue 17", "Wed 18", "Thu 19", "Fri 20"];
const WHOURS = ["9 AM", "10 AM", "11 AM", "12 PM", "1 PM"];
const COLW = 250, ROWH = 100, X0 = 110, Y0 = 60;
type Blk = { d: number; h: number; t: string; k: "work" | "biz" };
const WORK: Blk[] = [
  { d: 0, h: 0, t: "", k: "work" }, { d: 0, h: 1, t: "", k: "work" }, { d: 1, h: 2, t: "", k: "work" },
  { d: 2, h: 2, t: "", k: "work" }, { d: 3, h: 0, t: "", k: "work" }, { d: 3, h: 3, t: "", k: "work" }, { d: 4, h: 1, t: "", k: "work" },
];
const BIZ: Blk[] = [
  { d: 1, h: 0, t: "Client call", k: "biz" }, { d: 2, h: 4, t: "Edit day", k: "biz" }, { d: 4, h: 3, t: "Invoices", k: "biz" },
];
const cellPos = (d: number, h: number) => ({ left: X0 + d * COLW + 8, top: Y0 + h * ROWH + 8, width: COLW - 16, height: ROWH - 16 });

/** busyAt: when work blocks read "Busy". Before that they show blurred bars: the AI never sees meeting names. */
const Week: React.FC<{ title: string; sub: string; blocks: Blk[]; busyAt?: number; scan?: [number, number]; children?: React.ReactNode }> = ({ title, sub, blocks, busyAt = -100, scan, children }) => {
  const f = useCurrentFrame();
  const b = ramp(f, busyAt, busyAt + 10);
  const sx = scan ? interpolate(f, scan, [0, 1], clamp) : -1;
  return (
    <div style={{ ...cardStyle, width: X0 + COLW * 5 + 80, padding: "32px 40px 40px", boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 32, fontWeight: 600, color: C.ink }}>{title}</div>
        <div style={{ fontSize: 24, color: C.grey }}>{sub}</div>
      </div>
      <div style={{ position: "relative", height: Y0 + ROWH * WHOURS.length }}>
        {WDAYS.map((x, i) => <div key={x} style={{ position: "absolute", left: X0 + i * COLW, top: 8, width: COLW, textAlign: "center", fontSize: 24, fontWeight: 500, color: C.grey }}>{x}</div>)}
        {WHOURS.map((h, j) => (
          <div key={h} style={{ position: "absolute", left: 0, top: Y0 + j * ROWH, width: X0 + COLW * 5, height: ROWH, borderTop: `1px solid ${C.line}` }}>
            <div style={{ fontSize: 21, color: C.grey, paddingTop: 8 }}>{h}</div>
          </div>
        ))}
        {blocks.map((k, i) => (
          <div key={i} style={{
            position: "absolute", ...cellPos(k.d, k.h), borderRadius: 14, boxSizing: "border-box", padding: "14px 18px",
            background: k.k === "work" ? "#eef0f5" : C.blue, color: k.k === "work" ? "#7a8091" : "#fff", fontSize: 23, fontWeight: 500,
            boxShadow: k.k === "biz" ? "0 14px 30px rgba(47,91,234,0.3)" : "none",
          }}>
            {k.k === "work" ? (
              <>
                <div style={{ position: "absolute", left: 18, top: 20, width: "62%", height: 12, borderRadius: 6, background: "#cfd4e0", filter: "blur(3px)", opacity: 1 - b }} />
                <div style={{ position: "absolute", left: 18, top: 42, width: "40%", height: 10, borderRadius: 5, background: "#dde1ea", filter: "blur(3px)", opacity: 1 - b }} />
                <div style={{ opacity: b, filter: `blur(${(1 - b) * 6}px)` }}>Busy</div>
              </>
            ) : k.t}
          </div>
        ))}
        {sx >= 0 && sx < 1 && (
          <div style={{ position: "absolute", top: Y0, height: ROWH * WHOURS.length, left: X0 + sx * COLW * 5 - 3, width: 6, borderRadius: 3, background: C.blue, boxShadow: `0 0 30px 8px rgba(47,91,234,0.35)` }} />
        )}
        {children}
      </div>
    </div>
  );
};

/* ---------- the event card used by scenes 8 and 11 ---------- */
const LINKS = [["Quote", "docs.example.com/quote-1042"], ["Client page", "crm.example.com/bright-studio"]];
const STEPS3 = ["Open the quote", "Check the price is still right", "Send the follow-up note"];
const EventCard: React.FC<{ linkAt: number[]; topAt: number; dueAt: number; stepAt: number[]; done?: number[] }> = ({ linkAt, topAt, dueAt, stepAt, done = [1e6, 1e6, 1e6] }) => {
  const f = useCurrentFrame();
  const top = ramp(f, topAt, topAt + 10) * (1 - ramp(f, topAt + 22, topAt + 40));
  const due = ramp(f, dueAt, dueAt + 10);
  return (
    <div style={{ ...cardStyle, width: 1200, padding: "40px 56px 44px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, background: C.blue }} />
          <div style={{ fontSize: 38, fontWeight: 600, color: C.ink }}>Follow up: Bright Studio</div>
        </div>
        <div style={{ fontSize: 26, color: C.grey }}>Wed 18 · 12:00 PM</div>
      </div>
      <div style={{ borderRadius: 20, padding: "6px 0", background: `rgba(47,91,234,${top * 0.08})`, boxShadow: `0 0 0 ${top * 3}px rgba(47,91,234,${top * 0.6})` }}>
        {LINKS.map(([k, v], i) => {
          const k2 = ramp(f, linkAt[i], linkAt[i] + 10);
          return (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 20, padding: "14px 18px", fontSize: 30, opacity: k2, transform: `translateX(${(1 - k2) * -40}px)`, filter: `blur(${(1 - k2) * 6}px)` }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: C.pale, color: C.blue, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 600 }}>↗</div>
              <div style={{ width: 200, color: C.grey }}>{k}</div>
              <div style={{ color: C.blue, fontWeight: 500, textDecoration: "underline", textUnderlineOffset: 6 }}>{v}</div>
            </div>
          );
        })}
      </div>
      <div style={{ height: 1, background: C.line, margin: "18px 0 20px" }} />
      <div style={{ fontSize: 28, fontWeight: 600, color: C.ink, opacity: 0.15 + due * 0.85, filter: `blur(${(1 - due) * 5}px)`, marginBottom: 10 }}>
        Due by 12:30 PM <span style={{ color: C.grey, fontWeight: 400 }}>· three taps</span>
      </div>
      {STEPS3.map((t, i) => {
        const k2 = ramp(f, stepAt[i], stepAt[i] + 10);
        const dn = ramp(f, done[i], done[i] + 6);
        return (
          <div key={t} style={{ position: "relative", padding: "12px 0" }}>
          <div style={{ position: "absolute", left: 0, top: 18, display: "flex", gap: 20, alignItems: "center", opacity: (1 - k2) * 0.8 }}>
            <div style={{ width: 46, height: 46, borderRadius: 23, background: "#eef0f5" }} />
            <div style={{ width: 300 + i * 60, height: 18, borderRadius: 9, background: "#eef0f5" }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 31, opacity: k2, transform: `translateY(${(1 - k2) * 18}px)` }}>
            <div style={{
              width: 46, height: 46, borderRadius: 23, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 600,
              background: dn > 0.5 ? C.blue : C.pale, color: dn > 0.5 ? "#fff" : C.blue,
            }}>{dn > 0.5 ? "✓" : i + 1}</div>
            <div style={{ color: dn > 0.5 ? C.grey : C.ink }}>{t}</div>
          </div>
          </div>
        );
      })}
    </div>
  );
};

/* ---------- the task card used by scenes 1 and 2 ---------- */
const TaskCard: React.FC<{ tagAt: number; redAt: number }> = ({ tagAt, redAt }) => {
  const f = useCurrentFrame();
  const tg = ramp(f, tagAt, tagAt + 8), rd = ramp(f, redAt, redAt + 8);
  return (
    <div style={{ ...cardStyle, width: 1000, padding: "44px 56px 48px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
        <div style={{ fontSize: 26, color: C.grey, letterSpacing: 2, fontFamily: MONO }}>TO DO</div>
        <div style={{ opacity: tg, transform: `scale(${0.8 + tg * 0.2})`, display: "flex", alignItems: "center", gap: 10, fontSize: 26, fontWeight: 600, color: "#e0484d" }}>
          <div style={{ width: 16, height: 16, borderRadius: 8, background: "#e0484d", opacity: 0.55 + 0.45 * Math.sin(f / 5) }} />Overdue
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, border: `3px solid ${C.line}`, flexShrink: 0 }} />
        <div style={{ fontSize: 52, fontWeight: 500, color: C.ink, letterSpacing: -1 }}>Follow up with Bright Studio</div>
      </div>
      <div style={{ marginTop: 22, marginLeft: 72, fontSize: 32, fontWeight: 500, color: rd > 0.5 ? "#e0484d" : C.grey, transform: `scale(${1 + Math.sin(rd * Math.PI) * 0.08})`, transformOrigin: "0 50%" }}>
        Due today · 12:00 PM
      </div>
    </div>
  );
};

/* ---------- scene 1: 4:50 on a Friday, you just remembered ---------- */
const S1: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const len = sceneLen(1);
  const tTime = L + WD(1, 1), tFri = L + WD(1, 5), CARD = L + WD(1, 8) - 4;
  const lift = ramp(f, CARD - 2, CARD + 12);
  const cs = spring({ frame: f - CARD, fps, config: { damping: 18, mass: 0.9, stiffness: 90 } });
  const drift = interpolate(f, [CARD, len], [0, 1], clamp);
  return (
    <Shot len={len}>
      <AbsoluteFill style={{ background: NAVY_BG }} />
      {f < CARD + 14 && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: 1 - lift, transform: `translateY(${-lift * 120}px) scale(${1 - lift * 0.1})`, filter: `blur(${lift * 8}px)` }}>
          <div style={{ fontSize: 140, fontWeight: 300, letterSpacing: -3, fontVariantNumeric: "tabular-nums" }}>
            <Word big text="4:50" at={tTime} color={C.soft} />
            <Word big text="PM." at={L + WD(1, 2)} color="#fff" />
            <Word big text="Friday." at={tFri} color="#fff" />
          </div>
        </AbsoluteFill>
      )}
      {f >= CARD && (
        <AbsoluteFill style={{ perspective: 1800, alignItems: "center", justifyContent: "center" }}>
          <div style={{
            transform: `translateY(${interpolate(cs, [0, 1], [560, 10]) - drift * 14}px) rotateX(${interpolate(cs, [0, 1], [32, 9]) - drift * 3}deg) rotateY(${interpolate(cs, [0, 1], [-26, -7]) + drift * 4}deg)`,
            opacity: interpolate(cs, [0, 0.2], [0, 1], clamp),
          }}>
            <TaskCard tagAt={L + WD(1, 10)} redAt={1e6} />
          </div>
        </AbsoluteFill>
      )}
      <Voice n={1} />
      <Sfx at={tTime} s="tink" />
      <Sfx at={CARD - 2} s="whoosh-b" v={0.4} />
      <Sfx at={L + WD(1, 10)} s="tap" v={0.3} />
    </Shot>
  );
};

/* ---------- scene 2: due at noon, the client went elsewhere ---------- */
const S2: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const len = sceneLen(2);
  const tNoon = L + WD(2, 4), tClient = L + WD(2, 6), tElse = L + WD(2, 10);
  const em = spring({ frame: f - (tClient - 4), fps, config: { damping: 17, stiffness: 110 } });
  const st = spring({ frame: f - tElse, fps, config: { damping: 11, stiffness: 160 } });
  const d = interpolate(f, [0, len], [0, 1]);
  return (
    <Shot len={len}>
      <AbsoluteFill style={{ background: NAVY_BG }} />
      <AbsoluteFill style={{ perspective: 1800 }}>
        <div style={{ position: "absolute", left: 120, top: 170, transform: `scale(0.82) rotateY(${-7 + d * 3}deg) rotateX(8deg)`, transformOrigin: "0 0", opacity: 1 - em * 0.35, filter: `blur(${em * 2}px)` }}>
          <TaskCard tagAt={-50} redAt={tNoon} />
        </div>
        <div style={{ position: "absolute", right: 140, top: 430, opacity: em, transform: `translateX(${(1 - em) * 520}px) rotateY(${-6 + d * 3}deg) rotateX(6deg)` }}>
          <div style={{ ...cardStyle, width: 940, padding: "36px 48px 40px", position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 18 }}>
              <div style={{ width: 60, height: 60, borderRadius: 30, background: C.pale, color: C.blue, fontSize: 24, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>BS</div>
              <div>
                <div style={{ fontSize: 28, fontWeight: 600, color: C.ink }}>Bright Studio</div>
                <div style={{ fontSize: 22, color: C.grey }}>Re: Quote #1042 · 3:12 PM</div>
              </div>
            </div>
            <div style={{ fontSize: 34, color: C.ink, lineHeight: 1.35 }}>Thanks, but we went with another studio.</div>
            <div style={{
              position: "absolute", right: 30, top: -40, background: "#fff", padding: "10px 26px", border: "5px solid #e0484d", borderRadius: 14, color: "#e0484d",
              fontSize: 42, fontWeight: 600, letterSpacing: 4, fontFamily: MONO, opacity: Math.min(1, st * 1.5), transform: `rotate(-10deg) scale(${interpolate(st, [0, 1], [2.2, 1])})`,
            }}>MISSED</div>
          </div>
        </div>
      </AbsoluteFill>
      <Voice n={2} />
      <Sfx at={tNoon} s="tap" v={0.3} />
      <Sfx at={tClient - 4} s="whoosh-a" v={0.35} />
      <Sfx at={tClient + 2} s="ding" v={0.18} />
      <Sfx at={tElse} s="click" v={0.5} />
    </Shot>
  );
};

/* ---------- scene 3: the turn, dark to light ---------- */
const S3: React.FC = () => {
  const f = useCurrentFrame();
  const len = sceneLen(3);
  const t0 = L + WD(3, 0);
  const lt = ramp(f, t0 - 2, t0 + 18);
  const words = ["Here's", "how", "that", "never", "happens", "again."];
  return (
    <Shot len={len}>
      <AbsoluteFill style={{ background: NAVY_BG, opacity: 1 - lt }} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 110, fontWeight: 300, letterSpacing: -3, textAlign: "center", maxWidth: 1500 }}>
          {words.map((w, i) => <Word key={w} text={w} at={L + WD(3, i)} color={i === 3 ? C.blue : C.ink} />)}
        </div>
      </AbsoluteFill>
      <Voice n={3} />
      <Sfx at={t0 - 6} s="riser" v={0.12} />
      <Sfx at={L + WD(3, 3)} s="tink" v={0.28} />
    </Shot>
  );
};

/* ---------- scene 4: reminders drop into the calendar you already use ---------- */
const S4: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const len = sceneLen(4);
  const tEvery = L + WD(4, 2), tGoogle = L + WD(4, 8);
  const cc = spring({ frame: f - 2, fps, config: { damping: 20, stiffness: 85 } });
  const d = interpolate(f, [0, len], [0, 1]);
  const drops = [{ d: 0, h: 3 }, { d: 1, h: 1 }, { d: 2, h: 3 }, { d: 3, h: 2 }, { d: 4, h: 4 }];
  return (
    <Shot len={len}>
      <AbsoluteFill style={{ perspective: 2200, alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "relative", opacity: cc, transform: `translateY(${(1 - cc) * 200}px) rotateX(${13 - d * 4}deg) rotateY(${-7 + d * 4}deg)` }}>
          <Week title="Calendar" sub="Week of November 16" blocks={BIZ}>
            {drops.map((c, i) => {
              const at = tEvery + i * 4;
              const s = spring({ frame: f - at, fps, config: { damping: 14, stiffness: 140 } });
              return (
                <div key={i} style={{
                  position: "absolute", ...cellPos(c.d, c.h), borderRadius: 14, boxSizing: "border-box", padding: "12px 16px", background: "#fff",
                  border: `3px solid ${C.blue}`, opacity: ramp(f, at - 2, at + 3), transform: `translateY(${(1 - s) * -220}px)`, boxShadow: "0 16px 40px rgba(47,91,234,0.3)",
                }}>
                  <div style={{ fontSize: 22, fontWeight: 600, color: C.ink, whiteSpace: "nowrap" }}>Follow-up</div>
                  <div style={{ fontSize: 19, color: C.blue, fontWeight: 500, whiteSpace: "nowrap" }}>Reminder</div>
                </div>
              );
            })}
          </Week>
          <div style={{ position: "absolute", right: 40, top: 28, opacity: ramp(f, tGoogle, tGoogle + 8), transform: `scale(${0.8 + ramp(f, tGoogle, tGoogle + 10) * 0.2})` }}>
            <Pill text="Your Google Calendar" size={26} />
          </div>
        </div>
      </AbsoluteFill>
      <Voice n={4} />
      <Sfx at={0} s="whoosh-c" v={0.35} />
      {drops.map((_, i) => <Sfx key={i} at={tEvery + i * 4} s="pop" v={0.2} />)}
      <Sfx at={tGoogle} s="tink" v={0.25} />
    </Shot>
  );
};

/* ---------- scene 5: no new app, nothing new to learn ---------- */
const S5: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const len = sceneLen(5);
  const tApp = L + WD(5, 2), tNothing = L + WD(5, 3);
  const ts = spring({ frame: f - 2, fps, config: { damping: 18, stiffness: 100 } });
  const x = ramp(f, tApp - 2, tApp + 6);
  const gone = ramp(f, tNothing + 4, tNothing + 16);
  const line2 = ["Nothing", "new", "to", "learn."];
  return (
    <Shot len={len}>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 60 }}>
        <div style={{ position: "relative", opacity: ts * (1 - gone * 0.6), transform: `translateY(${(1 - ts) * 80}px) scale(${1 - gone * 0.08})`, filter: `grayscale(${x}) blur(${gone * 3}px)` }}>
          <div style={{ ...cardStyle, width: 760, padding: "34px 40px", display: "flex", alignItems: "center", gap: 30 }}>
            <div style={{ width: 120, height: 120, borderRadius: 30, background: `linear-gradient(140deg, #8fa8ff, ${C.blue})`, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 38, fontWeight: 600, color: C.ink }}>Yet Another App</div>
              <div style={{ fontSize: 24, color: C.grey, marginTop: 6 }}>New account · 14-step setup</div>
            </div>
            <div style={{ fontSize: 26, fontWeight: 600, padding: "14px 34px", borderRadius: 999, color: "#fff", background: C.blue }}>Install</div>
          </div>
          <div style={{ position: "absolute", left: -30, right: -30, top: "50%", height: 10, marginTop: -5, borderRadius: 5, background: "#e0484d", transform: `scaleX(${x}) rotate(-4deg)`, transformOrigin: "0 50%" }} />
        </div>
        <div style={{ fontSize: 96, fontWeight: 300, letterSpacing: -2, textAlign: "center" }}>
          <div>
            <Word text="No" at={L + WD(5, 0)} color={C.ink} />
            <Word text="new" at={L + WD(5, 1)} color={C.ink} />
            <Word text="app." at={tApp} color={C.blue} />
          </div>
          <div>
            {line2.map((w, i) => <Word key={i} text={w} at={L + WD(5, 3 + i)} color={i === 3 ? C.blue : C.ink} />)}
          </div>
        </div>
      </AbsoluteFill>
      <Voice n={5} />
      <Sfx at={0} s="whoosh-b" v={0.3} />
      <Sfx at={tApp} s="tap" v={0.4} />
      <Sfx at={L + WD(5, 6)} s="tink" v={0.22} />
    </Shot>
  );
};

/* ---------- scene 6: checks when you're busy, never sees what meetings are about ---------- */
const S6: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const len = sceneLen(6);
  const tChecks = L + WD(6, 1), tBusy = L + WD(6, 4), tNever = L + WD(6, 6), tMeet = L + WD(6, 10);
  const cc = spring({ frame: f - 2, fps, config: { damping: 20, stiffness: 85 } });
  const d = interpolate(f, [0, len], [0, 1]);
  const fr = ramp(f, tBusy + 6, tBusy + 16);
  const free = [{ d: 1, h: 1 }, { d: 2, h: 3 }, { d: 4, h: 4 }];
  return (
    <Shot len={len}>
      <AbsoluteFill style={{ perspective: 2200, alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "relative", opacity: cc, transform: `translateY(${(1 - cc) * 200}px) rotateX(${14 - d * 4}deg) rotateY(${-8 + d * 4}deg)` }}>
          <Week title="Work calendar" sub="read only" blocks={WORK} busyAt={tBusy} scan={[tChecks, tBusy + 4]}>
            {free.map((c, i) => (
              <div key={i} style={{ position: "absolute", ...cellPos(c.d, c.h), borderRadius: 14, border: `3px dashed ${C.blue}`, boxSizing: "border-box", background: "rgba(47,91,234,0.07)", opacity: fr, color: C.blue, fontSize: 23, fontWeight: 500, padding: "12px 16px" }}>Free</div>
            ))}
          </Week>
          <div style={{ position: "absolute", right: 40, top: 28, opacity: ramp(f, tNever, tNever + 8), transform: `scale(${0.8 + ramp(f, tNever, tNever + 10) * 0.2 + Math.sin(ramp(f, tMeet, tMeet + 10) * Math.PI) * 0.06})` }}>
            <Pill text="Busy or free only · no meeting names" size={25} />
          </div>
        </div>
      </AbsoluteFill>
      <Voice n={6} />
      <Sfx at={0} s="whoosh-c" v={0.35} />
      <Sfx at={tChecks} s="typing" v={0.12} d={tBusy - tChecks} />
      <Sfx at={tBusy} s="click" v={0.3} />
      <Sfx at={tNever} s="tink" v={0.25} />
      <Sfx at={tBusy + 6} s="pop" v={0.22} />
    </Shot>
  );
};

/* ---------- scene 7: a reminder on a busy time gets moved ---------- */
const S7: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const len = sceneLen(7);
  const tSlot = L + WD(7, 2), tBusy = L + WD(7, 6), tMove = L + WD(7, 9);
  const drop = spring({ frame: f - (tSlot - 4), fps, config: { damping: 15, stiffness: 130 } });
  const mv = spring({ frame: f - tMove, fps, config: { damping: 16, stiffness: 120 } });
  const clash = ramp(f, tBusy, tBusy + 6) * (1 - ramp(f, tMove, tMove + 8));
  const shake = clash > 0 ? Math.sin(f * 1.6) * 6 * (1 - ramp(f, tBusy + 10, tBusy + 22)) : 0;
  const ok = ramp(f, tMove + 8, tMove + 16);
  const d = interpolate(f, [0, len], [0, 1]);
  const A = cellPos(2, 2), B = cellPos(2, 3);
  return (
    <Shot len={len}>
      <AbsoluteFill style={{ perspective: 2200, alignItems: "center", justifyContent: "center" }}>
        <div style={{ transform: `rotateX(${13 - d * 4}deg) rotateY(${6 - d * 4}deg)` }}>
          <Week title="Your week" sub="work and business, side by side" blocks={[...WORK, ...BIZ]} busyAt={-100}>
            <div style={{
              position: "absolute", left: A.left + shake, top: interpolate(mv, [0, 1], [A.top, B.top]), width: A.width, height: A.height,
              borderRadius: 14, boxSizing: "border-box", padding: "10px 16px", background: "#fff",
              border: `3px solid ${clash > 0.5 ? "#e0484d" : C.blue}`, zIndex: 3,
              transform: `translateY(${(1 - drop) * -240}px)`, opacity: ramp(f, tSlot - 4, tSlot + 2),
              boxShadow: `0 20px 50px rgba(47,91,234,0.35), 0 0 0 ${ok * 18}px rgba(47,91,234,${0.22 * (1 - ok)})`,
            }}>
              <div style={{ fontSize: 22, fontWeight: 600, color: C.ink, whiteSpace: "nowrap" }}>Follow-up</div>
              <div style={{ fontSize: 19, marginTop: 4, whiteSpace: "nowrap", color: clash > 0.5 ? "#e0484d" : C.blue, fontWeight: 500 }}>{clash > 0.5 ? "Clash: Busy" : ok > 0.5 ? "✓ 12 PM, free" : "11 AM"}</div>
            </div>
          </Week>
        </div>
      </AbsoluteFill>
      <Voice n={7} />
      <Sfx at={0} s="whoosh-a" v={0.35} />
      <Sfx at={tSlot} s="pop" v={0.3} />
      <Sfx at={tBusy} s="tap" v={0.35} />
      <Sfx at={tMove} s="whoosh-c" v={0.25} />
      <Sfx at={tMove + 10} s="tink" v={0.28} />
    </Shot>
  );
};

/* ---------- scene 8: links on top, the exact steps below ---------- */
const S8: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const len = sceneLen(8);
  const tLinks = L + WD(8, 4), tTop = L + WD(8, 6);
  const st = [L + WD(8, 9), L + WD(8, 10), L + WD(8, 11)];
  const s = spring({ frame: f - 2, fps, config: { damping: 20, stiffness: 90 } });
  const d = interpolate(f, [0, len], [0, 1]);
  return (
    <Shot len={len}>
      <AbsoluteFill style={{ perspective: 2000, alignItems: "center", justifyContent: "center" }}>
        <div style={{ opacity: s, transform: `translateY(${(1 - s) * 160 - d * 30}px) rotateY(${8 - d * 9}deg) rotateX(7deg)` }}>
          <EventCard linkAt={[tLinks, tLinks + 5]} topAt={tTop} dueAt={L + WD(8, 7)} stepAt={st} />
        </div>
      </AbsoluteFill>
      <Voice n={8} />
      <Sfx at={0} s="whoosh-c" v={0.35} />
      <Sfx at={tLinks} s="click" v={0.3} />
      <Sfx at={tLinks + 5} s="click" v={0.25} />
      <Sfx at={tTop} s="tink" v={0.28} />
      {st.map((t) => <Sfx key={t} at={t} s="pop" v={0.25} />)}
    </Shot>
  );
};

/* ---------- a phone used by scenes 9 and 11 ---------- */
const Phone: React.FC<{ time: string; children?: React.ReactNode }> = ({ time, children }) => (
  <div style={{ width: 440, height: 880, borderRadius: 74, background: "#0b0f1c", padding: 16, boxSizing: "border-box", boxShadow: "0 60px 140px rgba(7,18,51,0.45)" }}>
    <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: 64, overflow: "hidden", background: "linear-gradient(170deg, #3a63f0 0%, #1b3aa8 55%, #0b1a52 100%)" }}>
      <div style={{ position: "absolute", top: 18, left: "50%", width: 130, height: 34, marginLeft: -65, borderRadius: 17, background: "#0b0f1c" }} />
      <div style={{ position: "absolute", top: 110, width: "100%", textAlign: "center", color: "#fff" }}>
        <div style={{ fontSize: 26, opacity: 0.8 }}>Wednesday, November 18</div>
        <div style={{ fontSize: 130, fontWeight: 300, letterSpacing: -3, lineHeight: 1.1, fontVariantNumeric: "tabular-nums" }}>{time}</div>
      </div>
      {children}
    </div>
  </div>
);
const Notif: React.FC<{ when: string; at: number; children?: React.ReactNode }> = ({ when, at, children }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - at, fps, config: { damping: 16, stiffness: 140 } });
  return (
    <div style={{ position: "relative", margin: "0 18px 14px", borderRadius: 30, background: "rgba(255,255,255,0.92)", padding: "20px 24px", opacity: s, transform: `translateY(${(1 - s) * -50}px) scale(${0.9 + s * 0.1})` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 19, color: C.grey, marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}><div style={{ width: 22, height: 22, borderRadius: 6, background: C.blue }} />CALENDAR</div>
        <div>{when}</div>
      </div>
      <div style={{ fontSize: 24, fontWeight: 600, color: C.ink }}>Follow up: Bright Studio</div>
      <div style={{ fontSize: 21, color: "#3c4150" }}>12:00 PM · quote and steps inside</div>
      {children}
    </div>
  );
};

/* ---------- scene 9: one alert ten minutes before, one on time ---------- */
const S9: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const len = sceneLen(9);
  const t1 = L + WD(9, 1), t2 = L + WD(9, 5);
  const ps = spring({ frame: f - 2, fps, config: { damping: 20, stiffness: 80 } });
  const d = interpolate(f, [0, len], [0, 1]);
  const tag = (at: number) => ({ opacity: ramp(f, at, at + 8), transform: `translateX(${(1 - ramp(f, at, at + 12)) * -30}px)` });
  return (
    <Shot len={len}>
      <AbsoluteFill style={{ perspective: 2000, alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 90 }}>
          <div style={{ transform: `translateY(${(1 - ps) * 300}px) rotateY(${14 - d * 6}deg) rotateX(4deg)`, opacity: ps }}>
            <Phone time={f >= t2 - 4 ? "12:00" : "11:50"}>
              <div style={{ position: "absolute", top: 350, left: 0, right: 0 }}>
                {f >= t2 - 2 && <Notif when="now" at={t2 - 2} />}
                <Notif when={f >= t2 - 2 ? "10 min ago" : "now"} at={t1 - 2} />
              </div>
            </Phone>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 40, fontWeight: 300 }}>
            <div style={{ ...tag(t1), fontSize: 64, color: C.ink, letterSpacing: -1 }}><span style={{ color: C.blue, fontWeight: 400 }}>10 min</span> before</div>
            <div style={{ ...tag(t2), fontSize: 64, color: C.ink, letterSpacing: -1 }}><span style={{ color: C.blue, fontWeight: 400 }}>Right</span> on time</div>
          </div>
        </div>
      </AbsoluteFill>
      <Voice n={9} />
      <Sfx at={0} s="whoosh-b" v={0.35} />
      <Sfx at={t1} s="ding" v={0.3} />
      <Sfx at={t2} s="ding" v={0.3} />
    </Shot>
  );
};

/* ---------- scene 10: sixty-four reminders, none typed by hand ---------- */
const S10: React.FC = () => {
  const f = useCurrentFrame();
  const len = sceneLen(10);
  const tSet = L + WD(10, 2), tNot = L + WD(10, 4), tHand = L + WD(10, 8);
  const p = interpolate(f, [L, tSet], [0, 1], { ...clamp, easing: Easing.inOut(Easing.quad) });
  const n = Math.round(p * 64);
  const z = ramp(f, tNot, tNot + 10);
  return (
    <Shot len={len}>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 30 }}>
          <div style={{ fontSize: 260, fontWeight: 300, fontVariantNumeric: "tabular-nums", color: n === 64 ? C.blue : C.ink, letterSpacing: -8, lineHeight: 1 }}>{n}</div>
          <div style={{ fontSize: 70, fontWeight: 300, color: C.ink }}>reminders set</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(16, 52px)", gap: 14, marginTop: 50 }}>
          {Array.from({ length: 64 }, (_, i) => {
            const on = i < n;
            return <div key={i} style={{ height: 30, borderRadius: 8, background: on ? C.blue : "#e3e8f6", opacity: on ? 1 : 0.7, transform: `scale(${on ? 1 : 0.85})` }} />;
          })}
        </div>
        <div style={{ marginTop: 60, fontSize: 46, fontWeight: 300, color: C.ink, opacity: z, transform: `translateY(${(1 - z) * 20}px)`, filter: `blur(${(1 - z) * 8}px)` }}>
          Typed by hand: <span style={{ color: C.blue, fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>0</span>
        </div>
      </AbsoluteFill>
      <Voice n={10} />
      <Sfx at={0} s="whoosh-c" v={0.35} />
      <Sfx at={L} s="typing" v={0.12} d={tSet - L} />
      <Sfx at={tSet} s="ding" v={0.25} />
      <Sfx at={tNot} s="tap" v={0.3} />
      <Sfx at={tHand} s="tink" v={0.2} />
    </Shot>
  );
};
const Cursor: React.FC = () => (
  <svg width={54} height={66} viewBox="0 0 18 22"><path d="M1 1 L1 18 L5.5 13.8 L8.6 20.6 L11.4 19.4 L8.4 12.8 L14.6 12.6 Z" fill="#14161b" stroke="#fff" strokeWidth={1.3} strokeLinejoin="round" /></svg>
);
/* ---------- scene 11: tap the alert, follow the steps ---------- */
const S11: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const len = sceneLen(11);
  const tTap = L + WD(11, 2), tFollow = L + WD(11, 6);
  const mv = interpolate(f, [L, tTap], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const press = ramp(f, tTap, tTap + 3) * (1 - ramp(f, tTap + 4, tTap + 10));
  const open = spring({ frame: f - (tTap + 4), fps, config: { damping: 20, stiffness: 110 } });
  const done = [tFollow, L + WD(11, 7) + 4, L + WD(11, 8) + 6];
  const d = interpolate(f, [0, len], [0, 1]);
  return (
    <Shot len={len}>
      <AbsoluteFill style={{ perspective: 2000, alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 70 }}>
          <div style={{ transform: `rotateY(${10 - d * 6}deg) rotateX(4deg)` }}>
            <Phone time="12:00">
              <div style={{ position: "absolute", top: 350, left: 0, right: 0, transform: `scale(${1 - press * 0.04})` }}>
                <Notif when="now" at={-50}>
                  {/* cursor tip lands on the notification centre */}
                  <div style={{ position: "absolute", left: interpolate(mv, [0, 1], [520, 190]), top: interpolate(mv, [0, 1], [420, 50]), transform: `scale(${1 - press * 0.12})`, transformOrigin: "0 0", opacity: ramp(f, L - 6, L) * (1 - open), zIndex: 5 }}>
                    <Cursor />
                  </div>
                </Notif>
              </div>
            </Phone>
          </div>
          <div style={{ width: 900, height: 600, opacity: open, transform: `translateX(${(1 - open) * -120}px)` }}>
            <div style={{ transform: "scale(0.75)", transformOrigin: "0 0" }}>
              <EventCard linkAt={[-50, -50]} topAt={-100} dueAt={-50} stepAt={[-50, -50, -50]} done={done} />
            </div>
          </div>
        </div>
      </AbsoluteFill>
      <Voice n={11} />
      <Sfx at={0} s="whoosh-c" v={0.35} />
      <Sfx at={tTap} s="click" v={0.45} />
      <Sfx at={tTap + 4} s="whoosh-a" v={0.2} />
      {done.map((t) => <Sfx key={t} at={t} s="tink" v={0.22} />)}
    </Shot>
  );
};
/* ---------- the full ad ---------- */
const END = { lead: "AI", product: "Follow-Ups" }; // end card title: plain word, then the cobalt product name
const SCENES = [S1, S2, S3, S4, S5, S6, S7, S8, S9, S10, S11];

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
