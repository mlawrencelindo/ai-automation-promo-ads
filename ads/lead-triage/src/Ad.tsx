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
const GAPS = [0.5, 0.35, 0.4, 0.35, 0.3, 0.3, 0.3, 0.45, 0.4, 0.3, 0.5]; // silence after each line (s)
const START: number[] = [];
{
  let t = 0.3;
  for (let n = 1; n <= 12; n++) { START.push(Math.round(t * FPS)); t += TM[n].dur + (GAPS[n - 1] ?? 0); }
}
const LS = (n: number) => START[n - 1];                       // line n start, absolute frame
const WD = (n: number, i: number) => Math.round(TM[n].words[i].s * FPS); // word i of line n, frames from line start
const PRE = 10;  // a scene opens 10 frames before its line
const TAIL = 14; // and overlaps the next scene by 14 frames
const L = PRE;   // voice start inside a scene
const END_AT = LS(12) - 4;
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

/* ---------- scene 1: 1:14 AM, a new inquiry ---------- */
const MSG = (h: number[]) => [
  { t: "Hi! We need a new " }, { t: "booking page and intake form", hl: h[0] }, { t: " for our bookkeeping clients before tax season. Budget is around " },
  { t: "$2,500", hl: h[1] }, { t: " and we would like it live " }, { t: "by the end of this month", hl: h[2] }, { t: ". Can we set up a call?" },
];
const MSG_LEN = MSG([0, 0, 0]).reduce((n, s) => n + s.t.length, 0);

/** The website-form inquiry: real data from the 2026-11-16 test run. */
const Inquiry: React.FC<{ typeAt: number; hl?: number[] }> = ({ typeAt, hl = [1e6, 1e6, 1e6] }) => {
  const f = useCurrentFrame();
  const chars = Math.floor(interpolate(f, [typeAt, typeAt + 32], [0, MSG_LEN], clamp));
  let left = chars;
  return (
    <div style={{ ...cardStyle, width: 1380, padding: "52px 68px 58px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 18, height: 18, borderRadius: 9, background: C.blue, boxShadow: `0 0 16px ${C.soft}` }} />
          <div style={{ fontSize: 34, fontWeight: 600, color: C.ink }}>New inquiry</div>
          <div style={{ fontSize: 25, color: C.blue, background: C.pale, padding: "6px 14px", borderRadius: 999, fontWeight: 500 }}>Website form</div>
        </div>
        <div style={{ fontSize: 29, color: C.grey }}>1:14 AM</div>
      </div>
      {[["Name", "Priya Shah"], ["Company", "Shah Bookkeeping"], ["Email", "priya.shah@example.com"]].map(([k, v]) => (
        <div key={k} style={{ display: "flex", gap: 24, padding: "16px 0", borderBottom: `1px solid ${C.line}`, fontSize: 31 }}>
          <div style={{ width: 170, color: C.grey }}>{k}</div>
          <div style={{ color: C.ink, fontWeight: 500 }}>{v}</div>
        </div>
      ))}
      <div style={{ fontSize: 31, color: C.grey, marginTop: 24, marginBottom: 8 }}>Message</div>
      <div style={{ fontSize: 35, lineHeight: 1.5, color: C.ink, minHeight: 200 }}>
        {MSG(hl).map((s, i) => {
          const shown = s.t.slice(0, Math.max(0, left));
          left -= s.t.length;
          const h = s.hl === undefined ? 0 : ramp(f, s.hl, s.hl + 10);
          return (
            <span key={i} style={{
              backgroundImage: "linear-gradient(rgba(47,91,234,0.16), rgba(47,91,234,0.16))",
              backgroundSize: `${h * 100}% 100%`, backgroundRepeat: "no-repeat", borderRadius: 6,
              color: h > 0.5 ? C.blue : C.ink, fontWeight: h > 0.5 ? 500 : 400,
            }}>{shown}</span>
          );
        })}
        {chars < MSG_LEN && <span style={{ opacity: Math.floor(f / 8) % 2 ? 0 : 1, color: C.blue }}>|</span>}
      </div>
    </div>
  );
};

const Pile: React.FC = () => {
  const f = useCurrentFrame();
  const pills = [{ x: 180, d: 0, w: 420 }, { x: 1320, d: 14, w: 380 }, { x: 260, d: 34, w: 360 }, { x: 1240, d: 50, w: 440 }, { x: 760, d: 66, w: 400 }];
  return (
    <AbsoluteFill>
      {pills.map((p, i) => (
        <div key={i} style={{
          position: "absolute", left: p.x, top: 1120 - (f - p.d) * 5.2, width: p.w, padding: "20px 26px", borderRadius: 22,
          background: "rgba(255,255,255,0.75)", boxShadow: "0 20px 50px rgba(47,91,234,0.12)",
          opacity: ramp(f, p.d, p.d + 30) * 0.85, filter: `blur(${i % 2 ? 3 : 1.5}px)`, display: "flex", alignItems: "center", gap: 16,
        }}>
          <div style={{ width: 14, height: 14, borderRadius: 7, background: C.blue }} />
          <div style={{ fontSize: 24, fontWeight: 600, color: C.ink }}>New inquiry</div>
          <div style={{ flex: 1, height: 10, borderRadius: 5, background: "#e3e8f6" }} />
        </div>
      ))}
    </AbsoluteFill>
  );
};

const S1: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const len = sceneLen(1);
  const t1 = L + WD(1, 1), tAM = L + WD(1, 5), tA = L + WD(1, 6), tInq = L + WD(1, 9), CARD = L + WD(1, 10) - 4;
  const lift = ramp(f, CARD - 2, CARD + 12);
  const cs = spring({ frame: f - CARD, fps, config: { damping: 18, mass: 0.9, stiffness: 90 } });
  const drift = interpolate(f, [CARD, len], [0, 1], clamp);
  return (
    <Shot len={len}>
      <Pile />
      {f < CARD + 14 && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: 1 - lift, transform: `translateY(${-lift * 120}px) scale(${1 - lift * 0.1})`, filter: `blur(${lift * 8}px)` }}>
          <div style={{ fontSize: 120, fontWeight: 300, letterSpacing: -3, position: "absolute" }}>
            <Word text="1:14" at={t1} color={C.blue} out={tA - 8} />
            <Word text="AM." at={tAM} color={C.ink} out={tA - 8} />
          </div>
          <div style={{ fontSize: 120, fontWeight: 300, letterSpacing: -3, position: "absolute" }}>
            <Word text="A" at={tA} color={C.ink} />
            <Word text="new" at={tA + 4} color={C.ink} />
            <Word text="inquiry." at={tInq} color={C.blue} />
          </div>
        </AbsoluteFill>
      )}
      {f >= CARD && (
        <AbsoluteFill style={{ perspective: 1800, alignItems: "center", justifyContent: "center" }}>
          <div style={{
            transform: `translateY(${interpolate(cs, [0, 1], [560, 10]) - drift * 14}px) rotateX(${interpolate(cs, [0, 1], [32, 9]) - drift * 3}deg) rotateY(${interpolate(cs, [0, 1], [-26, -7]) + drift * 4}deg) scale(${0.97 + drift * 0.04})`,
            opacity: interpolate(cs, [0, 0.2], [0, 1], clamp),
          }}>
            <Inquiry typeAt={CARD + 10} />
          </div>
        </AbsoluteFill>
      )}
      <Voice n={1} />
      <Sfx at={t1} s="tink" />
      <Sfx at={CARD - 8} s="whoosh-b" v={0.4} />
      <Sfx at={CARD + 10} s="typing" v={0.2} d={32} />
    </Shot>
  );
};

/* ---------- scene 2: you're asleep ---------- */
const S2: React.FC = () => {
  const f = useCurrentFrame();
  const len = sceneLen(2);
  const tYour = L + WD(2, 2), tLead = L + WD(2, 3), tSys = L + WD(2, 4), tIsnt = L + WD(2, 5);
  return (
    <Shot len={len}>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", background: `radial-gradient(ellipse 80% 70% at 50% 120%, #1f45c9 0%, #0b1a52 45%, ${C.navy} 80%)` }}>
        <div style={{ fontSize: 150, fontWeight: 300, letterSpacing: -4, position: "absolute" }}>
          <Word big text="You're" at={L} color="#fff" out={tYour - 10} />
          <Word big text="asleep." at={L + WD(2, 1)} color="#fff" out={tYour - 10} />
        </div>
        <div style={{ fontSize: 120, fontWeight: 300, letterSpacing: -3, position: "absolute", display: "flex", alignItems: "center" }}>
          <Word text="Your" at={tYour} color="#fff" />
          <Word text="lead" at={tLead} color="#fff" />
          <Word text="system" at={tSys} color="#fff" />
          <span style={{ color: C.soft, opacity: ramp(f, tIsnt, tIsnt + 8), display: "inline-flex", alignItems: "center" }}>
            <span style={{ fontWeight: 200, transform: `translateX(${(1 - ramp(f, tIsnt, tIsnt + 12)) * 40}px)`, display: "inline-block" }}>[</span>
            <span style={{ padding: "0 0.18em", filter: `blur(${(1 - ramp(f, tIsnt, tIsnt + 10)) * 10}px)` }}>isn't</span>
            <span style={{ fontWeight: 200, transform: `translateX(${(1 - ramp(f, tIsnt, tIsnt + 12)) * -40}px)`, display: "inline-block" }}>]</span>
          </span>
        </div>
      </AbsoluteFill>
      <Voice n={2} />
      <Sfx at={0} s="whoosh-a" v={0.4} />
      <Sfx at={tIsnt} s="tap" v={0.35} />
    </Shot>
  );
};

/* ---------- scene 3: AI reads the message ---------- */
const AIPanel: React.FC<{ at: number; rows: number[] }> = ({ at, rows }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - at, fps, config: { damping: 20, stiffness: 90 } });
  const items = [{ k: "NEED", v: "Booking page and intake form" }, { k: "BUDGET", v: "$2,500" }, { k: "DEADLINE", v: "End of this month" }];
  const read = ramp(f, at + 4, rows[2] + 10);
  return (
    <div style={{
      width: 840, borderRadius: 30, padding: "44px 52px", fontFamily: MONO,
      background: "linear-gradient(160deg, #0d1736 0%, #070d22 100%)", color: "#dfe6ff",
      boxShadow: "0 50px 120px rgba(7,18,51,0.45)", border: "1px solid rgba(143,168,255,0.18)",
      transform: `translateX(${(1 - s) * 260}px) perspective(1600px) rotateY(${(1 - s) * -24 + 6}deg)`, opacity: s,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 28, color: C.soft, marginBottom: 26 }}>
        <div style={{ width: 12, height: 12, borderRadius: 6, background: C.soft, boxShadow: `0 0 14px ${C.soft}`, opacity: 0.5 + 0.5 * Math.sin(f / 4) }} />
        AI · reading message
      </div>
      <div style={{ height: 6, borderRadius: 3, background: "rgba(143,168,255,0.15)", marginBottom: 34, overflow: "hidden" }}>
        <div style={{ width: `${read * 100}%`, height: "100%", background: C.blue, boxShadow: `0 0 18px ${C.blue}` }} />
      </div>
      {items.map((r, i) => {
        const k = ramp(f, rows[i], rows[i] + 10);
        const n = Math.floor(interpolate(f, [rows[i] + 2, rows[i] + 14], [0, r.v.length], clamp));
        return (
          <div key={r.k} style={{ display: "flex", alignItems: "flex-start", gap: 20, padding: "18px 0", borderTop: "1px solid rgba(143,168,255,0.12)", opacity: 0.25 + k * 0.75, transform: `translateY(${(1 - k) * 12}px)` }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8, marginTop: 4, flexShrink: 0,
              border: `2px solid ${k > 0.5 ? C.blue : "rgba(143,168,255,0.35)"}`, background: k > 0.5 ? C.blue : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 20,
            }}>{k > 0.5 ? "✓" : ""}</div>
            <div>
              <div style={{ fontSize: 22, letterSpacing: 3, color: "rgba(223,230,255,0.55)", marginBottom: 6 }}>{r.k}</div>
              <div style={{ fontSize: 38, fontWeight: 500, color: "#fff", minHeight: 50 }}>{r.v.slice(0, n)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const S3: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const len = sceneLen(3);
  const rows = [L + WD(3, 8), L + WD(3, 10), L + WD(3, 13)];
  const cc = spring({ frame: f - 2, fps, config: { damping: 20, stiffness: 85 } });
  const d = interpolate(f, [0, len], [0, 1]);
  return (
    <Shot len={len}>
      <AbsoluteFill style={{ perspective: 2000 }}>
        <div style={{
          position: "absolute", left: 60, top: 235, transformOrigin: "0 0",
          transform: `translateX(${(1 - cc) * -500}px) translateY(${-d * 16}px) rotateY(${interpolate(cc, [0, 1], [30, 8]) + d * 2}deg) scale(0.8)`,
          opacity: cc,
        }}>
          <Inquiry typeAt={-100} hl={rows} />
        </div>
        <div style={{ position: "absolute", right: 70, top: 235 }}><AIPanel at={L + 4} rows={rows} /></div>
      </AbsoluteFill>
      <Voice n={3} />
      <Sfx at={0} s="whoosh-c" v={0.35} />
      {rows.map((t) => <Sfx key={t} at={t} s="click" />)}
    </Shot>
  );
};

/* ---------- scene 4: hot, warm, or spam ---------- */
const Bucket: React.FC<{ c: "HOT" | "WARM" | "SPAM"; sub: string; at: number; lit: number; pulse?: number; children?: React.ReactNode }> = ({ c, sub, at, lit, pulse, children }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - at, fps, config: { damping: 16, stiffness: 110 } });
  const on = ramp(f, lit, lit + 8);
  const pu = pulse === undefined ? 0 : ramp(f, pulse, pulse + 5) * (1 - ramp(f, pulse + 8, pulse + 20));
  return (
    <div style={{
      ...cardStyle, width: 500, height: 460, padding: "40px 44px", position: "relative",
      opacity: s, transform: `translateY(${(1 - s) * 120}px) scale(${1 + pu * 0.04})`,
      border: `2px solid ${on > 0.5 ? C.blue : pu > 0.3 ? C.soft : C.line}`,
      boxShadow: on > 0.5 ? "0 50px 120px rgba(47,91,234,0.4)" : cardStyle.boxShadow,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Tag c={c} size={26} />
        <div style={{ fontSize: 24, color: C.grey }}>{sub}</div>
      </div>
      {children}
    </div>
  );
};

const S4: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const len = sceneLen(4);
  const tSort = L + WD(4, 2), tHot = L + WD(4, 6), tWarm = L + WD(4, 7), tSpam = L + WD(4, 9);
  const fly = spring({ frame: f - (tHot - 6), fps, config: { damping: 18, stiffness: 120 } });
  const reason = "Real request, clear budget, deadline in 30 days.";
  const rn = Math.floor(interpolate(f, [tHot + 12, tHot + 40], [0, reason.length], clamp));
  const sway = interpolate(f, [0, len], [-4, 3]);
  return (
    <Shot len={len}>
      <AbsoluteFill style={{ perspective: 2200 }}>
        <div style={{ position: "absolute", left: 140, top: 340, display: "flex", gap: 70, transform: `rotateX(12deg) rotateY(${sway}deg)`, transformOrigin: "50% 0" }}>
          <Bucket c="HOT" sub="Reply today" at={tSort} lit={tHot}>
            <div style={{ position: "absolute", left: 44, right: 44, bottom: 40, fontSize: 27, lineHeight: 1.4, color: C.ink, minHeight: 76 }}>{reason.slice(0, rn)}</div>
          </Bucket>
          <Bucket c="WARM" sub="Reply this week" at={tSort + 5} lit={1e6} pulse={tWarm} />
          <Bucket c="SPAM" sub="Log only" at={tSort + 10} lit={1e6} pulse={tSpam} />
        </div>
        {/* the lead chip drops from the top into HOT */}
        <div style={{
          position: "absolute", left: 510, top: 110, width: 900, ...cardStyle, borderRadius: 26, padding: "28px 36px",
          display: "flex", alignItems: "center", gap: 22, transformOrigin: "50% 50%",
          transform: `translate(${fly * -560}px, ${fly * 370}px) scale(${1 - fly * 0.45})`,
          opacity: ramp(f, 0, 10),
        }}>
          <div style={{ width: 64, height: 64, borderRadius: 32, background: C.pale, color: C.blue, fontSize: 28, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>PS</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 34, fontWeight: 600, color: C.ink }}>Priya Shah</div>
            <div style={{ fontSize: 26, color: C.grey }}>Booking page · $2,500 · end of month</div>
          </div>
          <div style={{ opacity: ramp(f, tHot + 4, tHot + 10) }}><Tag c="HOT" size={24} /></div>
        </div>
      </AbsoluteFill>
      <Voice n={4} />
      <Sfx at={0} s="whoosh-b" v={0.35} />
      {[tSort, tSort + 5, tSort + 10].map((t) => <Sfx key={t} at={t} s="pop" v={0.22} />)}
      <Sfx at={tHot} s="ding" v={0.25} />
      <Sfx at={tWarm} s="tap" v={0.2} />
      <Sfx at={tSpam} s="tap" v={0.2} />
    </Shot>
  );
};

/* ---------- scene 5: logged in the sheet ---------- */
const COLS = [{ k: "Received", w: 280 }, { k: "Name", w: 220 }, { k: "Need", w: 480 }, { k: "Budget", w: 170 }, { k: "Timeline", w: 220 }, { k: "Category", w: 170 }];
const ROWS: [string, string, string, string, string, "HOT" | "WARM" | "SPAM"][] = [
  ["Nov 15, 9:42 PM", "Dana Reyes", "Website chat assistant", "$1,500", "3 weeks", "HOT"],
  ["Nov 15, 11:05 PM", "Tom Becker", "Questions about pricing", "Not stated", "Not stated", "WARM"],
  ["Nov 16, 12:30 AM", "Ryan", "Selling SEO services", "", "", "SPAM"],
];
const SheetRow: React.FC<{ r: (typeof ROWS)[number]; hl?: number; dim?: boolean }> = ({ r, hl = 0, dim }) => (
  <div style={{ display: "flex", alignItems: "center", height: 84, borderBottom: `1px solid ${C.line}`, background: `rgba(47,91,234,${hl * 0.1})`, opacity: dim ? 0.55 : 1 }}>
    {COLS.map((c, i) => (
      <div key={c.k} style={{ width: c.w, padding: "0 20px", fontSize: 27, color: i === 1 ? C.ink : "#3c4150", fontWeight: i === 1 ? 600 : 400, whiteSpace: "nowrap", overflow: i === 5 ? "visible" : "hidden" }}>
        {i === 5 ? <Tag c={r[5]} size={20} /> : r[i]}
      </div>
    ))}
  </div>
);

const S5: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const len = sceneLen(5);
  const tLog = L + WD(5, 3);
  const s = spring({ frame: f - (tLog - 4), fps, config: { damping: 18, stiffness: 120 } });
  const hl = ramp(f, tLog, tLog + 6) * (1 - 0.5 * ramp(f, tLog + 20, tLog + 40));
  const d = interpolate(f, [0, len], [0, 1]);
  return (
    <Shot len={len}>
      <AbsoluteFill style={{ perspective: 2200, alignItems: "center", justifyContent: "center" }}>
        <div style={{ ...cardStyle, width: 1620, padding: "34px 40px 30px", transform: `rotateX(${16 - d * 4}deg) rotateY(${-7 + d * 3}deg) translateY(${30 - d * 20}px)` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 22 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: C.pale, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3, padding: 8 }}>
              {[0, 1, 2, 3].map((i) => <div key={i} style={{ background: C.blue, borderRadius: 2 }} />)}
            </div>
            <div style={{ fontSize: 32, fontWeight: 600, color: C.ink }}>Lead Triage CRM</div>
            <div style={{ fontSize: 24, color: C.grey }}>Sheet1</div>
          </div>
          <div style={{ display: "flex", background: "#f4f6fc", borderRadius: 12, height: 62, alignItems: "center" }}>
            {COLS.map((c) => <div key={c.k} style={{ width: c.w, padding: "0 20px", fontSize: 23, fontWeight: 500, color: C.grey, letterSpacing: 0.5 }}>{c.k}</div>)}
          </div>
          {ROWS.map((r) => <SheetRow key={r[1]} r={r} dim />)}
          <div style={{ height: 84 * s, overflow: "hidden" }}>
            <div style={{ transform: `translateY(${(1 - s) * 40}px)`, filter: `blur(${(1 - s) * 6}px)` }}>
              <SheetRow r={["Nov 16, 1:14 AM", "Priya Shah", "Booking page and intake form", "$2,500", "End of month", "HOT"]} hl={hl} />
            </div>
          </div>
        </div>
      </AbsoluteFill>
      <Voice n={5} />
      <Sfx at={0} s="whoosh-c" v={0.35} />
      <Sfx at={tLog} s="click" v={0.35} />
    </Shot>
  );
};

/* ---------- scene 6: a personal reply saved as a draft ---------- */
const BODY = [
  "Hi Priya,",
  "Thanks for reaching out. You're looking for a booking page and intake form for Shah Bookkeeping clients, ready before tax season.",
  "We can discuss how to meet your end-of-month timeline within your $2,500 budget. Which two times this week suit you for a 15-minute call?",
];
const DraftCard: React.FC<{ width: number; reveal: number[]; body: string[]; saved: number; children?: React.ReactNode }> = ({ width, reveal, body, saved, children }) => {
  const f = useCurrentFrame();
  const sv = ramp(f, saved, saved + 8);
  return (
    <div style={{ ...cardStyle, width, padding: "40px 56px 44px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ fontSize: 32, fontWeight: 600, color: C.ink }}>Reply draft</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 25, fontWeight: 500, color: C.blue, background: C.pale, padding: "8px 18px", borderRadius: 999, opacity: sv, transform: `scale(${0.8 + sv * 0.2})` }}>
          ✓ Saved in Gmail drafts
        </div>
      </div>
      {[["To", "priya.shah@example.com"], ["Subject", "Re: your inquiry for Shah Bookkeeping"]].map(([k, v]) => (
        <div key={k} style={{ display: "flex", gap: 24, padding: "14px 0", borderBottom: `1px solid ${C.line}`, fontSize: 28 }}>
          <div style={{ width: 130, color: C.grey }}>{k}</div><div style={{ color: C.ink, fontWeight: 500 }}>{v}</div>
        </div>
      ))}
      <div style={{ marginTop: 22, fontSize: 30, lineHeight: 1.5, color: "#2a2e38" }}>
        {body.map((p, i) => {
          const k = ramp(f, reveal[i], reveal[i] + 10);
          return <p key={i} style={{ margin: "0 0 16px", opacity: k, transform: `translateY(${(1 - k) * 16}px)`, filter: `blur(${(1 - k) * 6}px)` }}>{p}</p>;
        })}
      </div>
      {children}
    </div>
  );
};

const S6: React.FC = () => {
  const len = sceneLen(6);
  const f = useCurrentFrame();
  const tDraft = L + WD(6, 7);
  const d = interpolate(f, [0, len], [0, 1]);
  return (
    <Shot len={len}>
      <AbsoluteFill style={{ perspective: 2000, alignItems: "center", justifyContent: "center" }}>
        <div style={{ transform: `rotateY(${-10 + d * 5}deg) rotateX(6deg) translateX(${-20 + d * 30}px)` }}>
          <DraftCard width={1300} reveal={[L + 2, L + 12, L + 26]} body={BODY} saved={tDraft} />
        </div>
      </AbsoluteFill>
      <Voice n={6} />
      <Sfx at={0} s="whoosh-a" v={0.35} />
      <Sfx at={L + 2} s="typing" v={0.18} d={34} />
      <Sfx at={tDraft} s="tink" v={0.3} />
    </Shot>
  );
};

/* ---------- scene 7: follow-up on the calendar ---------- */
const DAYS = ["Mon 16", "Tue 17", "Wed 18", "Thu 19", "Fri 20"];
const HOURS = ["9 AM", "10 AM", "11 AM", "12 PM"];
const S7: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const len = sceneLen(7);
  const tFollow = L + WD(7, 4), tCal = L + WD(7, 8);
  const drop = spring({ frame: f - (tFollow - 4), fps, config: { damping: 14, stiffness: 130 } });
  const ring = ramp(f, tCal, tCal + 18);
  const d = interpolate(f, [0, len], [0, 1]);
  const COLW = 270, ROWH = 120, X0 = 130, Y0 = 70;
  const busy = [{ d: 0, h: 0, t: "Admin" }, { d: 2, h: 2, t: "Client call" }, { d: 3, h: 0, t: "Invoices" }, { d: 4, h: 1, t: "Planning" }];
  return (
    <Shot len={len}>
      <AbsoluteFill style={{ perspective: 2200, alignItems: "center", justifyContent: "center" }}>
        <div style={{ ...cardStyle, width: 1560, padding: "36px 44px 44px", transform: `rotateX(${14 - d * 4}deg) rotateY(${6 - d * 4}deg)` }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 18, marginBottom: 20 }}>
            <div style={{ fontSize: 34, fontWeight: 600, color: C.ink }}>November 2026</div>
            <div style={{ fontSize: 25, color: C.grey }}>Calendar</div>
          </div>
          <div style={{ position: "relative", height: Y0 + ROWH * HOURS.length }}>
            {DAYS.map((x, i) => <div key={x} style={{ position: "absolute", left: X0 + i * COLW, top: 10, width: COLW, textAlign: "center", fontSize: 26, fontWeight: 500, color: i === 1 ? C.blue : C.grey }}>{x}</div>)}
            {HOURS.map((h, j) => (
              <div key={h} style={{ position: "absolute", left: 0, top: Y0 + j * ROWH, width: X0 + COLW * 5, height: ROWH, borderTop: `1px solid ${C.line}` }}>
                <div style={{ fontSize: 22, color: C.grey, paddingTop: 8 }}>{h}</div>
              </div>
            ))}
            {busy.map((b) => (
              <div key={b.t} style={{ position: "absolute", left: X0 + b.d * COLW + 10, top: Y0 + b.h * ROWH + 10, width: COLW - 20, height: ROWH - 20, borderRadius: 14, background: "#f1f3f8", color: "#7a8091", fontSize: 24, padding: "14px 18px", boxSizing: "border-box" }}>{b.t}</div>
            ))}
            {/* the follow-up drops into Tue 10 AM */}
            <div style={{
              position: "absolute", left: X0 + COLW + 10, top: Y0 + ROWH + 10, width: COLW - 20, height: ROWH - 20, borderRadius: 14,
              background: C.blue, color: "#fff", padding: "12px 18px", boxSizing: "border-box",
              transform: `translateY(${(1 - drop) * -260}px) scale(${0.9 + drop * 0.1})`, opacity: ramp(f, tFollow - 4, tFollow + 2),
              boxShadow: `0 20px 50px rgba(47,91,234,0.45), 0 0 0 ${ring * 22}px rgba(47,91,234,${0.25 * (1 - ring)})`,
            }}>
              <div style={{ fontSize: 23, fontWeight: 600 }}>Follow up: Priya Shah</div>
              <div style={{ fontSize: 20, opacity: 0.85, marginTop: 4 }}>10:00 AM · hot lead</div>
            </div>
          </div>
        </div>
      </AbsoluteFill>
      <Voice n={7} />
      <Sfx at={0} s="whoosh-b" v={0.35} />
      <Sfx at={tFollow} s="pop" v={0.3} />
      <Sfx at={tCal} s="tink" v={0.25} />
    </Shot>
  );
};

/* ---------- scene 8: spam logged, never answered ---------- */
const S8: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const len = sceneLen(8);
  const tLog = L + WD(8, 2), tNever = L + WD(8, 4);
  const st = spring({ frame: f - tLog, fps, config: { damping: 12, stiffness: 200 } });
  const nv = ramp(f, tNever, tNever + 10);
  const d = interpolate(f, [0, len], [0, 1]);
  return (
    <Shot len={len}>
      <AbsoluteFill style={{ perspective: 2000, alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "relative", transform: `rotateY(${8 - d * 5}deg) rotateX(6deg)` }}>
          <div style={{ ...cardStyle, width: 1300, padding: "46px 60px 40px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 18, height: 18, borderRadius: 9, background: "#b9bfcc" }} />
                <div style={{ fontSize: 34, fontWeight: 600, color: C.ink }}>New inquiry</div>
              </div>
              <div style={{ fontSize: 28, color: C.grey }}>12:30 AM</div>
            </div>
            <div style={{ display: "flex", gap: 24, padding: "14px 0", borderBottom: `1px solid ${C.line}`, fontSize: 30 }}>
              <div style={{ width: 150, color: C.grey }}>Name</div><div style={{ color: C.ink, fontWeight: 500 }}>Ryan, SEO Growth Pros</div>
            </div>
            <div style={{ fontSize: 34, lineHeight: 1.5, color: "#3c4150", margin: "24px 0 30px" }}>
              We can get your site to #1 on Google in 7 days, guaranteed. Reply now for a free audit!
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: `1px solid ${C.line}`, paddingTop: 26 }}>
              <div style={{ fontSize: 27, color: C.blue, fontWeight: 500, opacity: ramp(f, tLog + 4, tLog + 12) }}>✓ Logged in sheet</div>
              <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                <div style={{ fontSize: 27, color: C.grey, opacity: nv }}>No reply sent</div>
                <div style={{
                  fontSize: 27, fontWeight: 500, padding: "12px 30px", borderRadius: 999, position: "relative",
                  background: nv > 0.5 ? "#eceef3" : C.blue, color: nv > 0.5 ? "#9aa0ae" : "#fff",
                }}>
                  Reply
                  <div style={{ position: "absolute", left: 18, right: 18, top: "50%", height: 3, background: "#9aa0ae", transform: `scaleX(${nv})`, transformOrigin: "0 50%" }} />
                </div>
              </div>
            </div>
          </div>
          <div style={{
            position: "absolute", right: 70, top: 40, padding: "10px 34px", borderRadius: 18, border: "6px solid #6b7182",
            fontFamily: MONO, fontSize: 72, fontWeight: 500, color: "#6b7182", letterSpacing: 6, background: "rgba(255,255,255,0.8)",
            opacity: st > 0.02 ? 1 : 0, transform: `rotate(-9deg) scale(${interpolate(st, [0, 1], [2.2, 1])})`,
          }}>SPAM</div>
        </div>
      </AbsoluteFill>
      <Voice n={8} />
      <Sfx at={0} s="whoosh-c" v={0.35} />
      <Sfx at={tLog} s="stamp" v={0.4} />
      <Sfx at={tNever} s="tap" v={0.25} />
    </Shot>
  );
};

/* ---------- scene 9: about six seconds ---------- */
const STEPS = ["Form", "AI", "Sheet", "Gmail", "Calendar"];
const S9: React.FC = () => {
  const f = useCurrentFrame();
  const len = sceneLen(9);
  const tEnd = L + WD(9, 5);
  const p = interpolate(f, [L, tEnd], [0, 1], { ...clamp, easing: Easing.inOut(Easing.quad) });
  const secs = (p * 6).toFixed(1);
  const done = ramp(f, tEnd, tEnd + 8);
  return (
    <Shot len={len}>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
        <div style={{ fontSize: 30, color: C.grey, letterSpacing: 4, fontFamily: MONO, marginBottom: 6 }}>START TO FINISH</div>
        <div style={{ fontSize: 300, fontWeight: 300, fontVariantNumeric: "tabular-nums", color: done > 0.5 ? C.blue : C.ink, letterSpacing: -8, lineHeight: 1, transform: `scale(${1 + done * 0.03})` }}>
          {secs}<span style={{ fontSize: 120, color: C.grey, marginLeft: 16 }}>s</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", marginTop: 70 }}>
          {STEPS.map((s, i) => {
            const on = p >= i / (STEPS.length - 1) - 0.001;
            const k = ramp(f, L + (tEnd - L) * (i / (STEPS.length - 1)), L + (tEnd - L) * (i / (STEPS.length - 1)) + 6);
            return (
              <React.Fragment key={s}>
                {i > 0 && (
                  <div style={{ width: 110, height: 4, background: C.line, position: "relative" }}>
                    <div style={{ position: "absolute", inset: 0, background: C.blue, transformOrigin: "0 50%", transform: `scaleX(${interpolate(p, [(i - 1) / 4, i / 4], [0, 1], clamp)})` }} />
                  </div>
                )}
                <div style={{
                  ...cardStyle, borderRadius: 999, padding: "18px 34px", fontSize: 32, fontWeight: 500,
                  background: on ? C.blue : "#fff", color: on ? "#fff" : C.grey, border: `1px solid ${on ? C.blue : C.line}`,
                  transform: `scale(${1 + k * 0.06 - ramp(f, L + (tEnd - L) * (i / 4) + 6, L + (tEnd - L) * (i / 4) + 14) * 0.06})`,
                }}>{s}</div>
              </React.Fragment>
            );
          })}
        </div>
      </AbsoluteFill>
      <Voice n={9} />
      <Sfx at={0} s="whoosh-a" v={0.35} />
      {STEPS.map((_, i) => <Sfx key={i} at={Math.round(L + (tEnd - L) * (i / 4))} s="click" v={0.25} />)}
      <Sfx at={tEnd} s="ding" v={0.25} />
    </Shot>
  );
};

/* ---------- scene 10: sorted before you wake up ---------- */
const LEADS: [string, string, "HOT" | "WARM" | "SPAM"][] = [
  ["Priya Shah", "Booking page and intake form", "HOT"], ["Dana Reyes", "Website chat assistant", "HOT"],
  ["Tom Becker", "Questions about pricing", "WARM"], ["Ryan", "Selling SEO services", "SPAM"],
];
const S10: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const len = sceneLen(10);
  const tWake = L + WD(10, 6);
  const day = ramp(f, tWake - 16, tWake + 6);
  return (
    <Shot len={len}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 80% 70% at 50% 120%, #1f45c9 0%, #0b1a52 45%, ${C.navy} 80%)`, opacity: 1 - day }} />
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 110 }}>
        <div style={{ position: "relative", height: 170, width: 900, textAlign: "center", fontWeight: 300, fontSize: 150, letterSpacing: -4 }}>
          <div style={{ position: "absolute", inset: 0, color: "#fff", opacity: 1 - day, filter: `blur(${day * 10}px)` }}>1:14 AM</div>
          <div style={{ position: "absolute", inset: 0, color: C.ink, opacity: day, filter: `blur(${(1 - day) * 10}px)` }}>7:00 <span style={{ color: C.blue }}>AM</span></div>
        </div>
        <div style={{ fontSize: 30, color: day > 0.5 ? C.grey : "rgba(255,255,255,0.7)", marginBottom: 40, fontFamily: MONO, letterSpacing: 3 }}>4 NEW LEADS · ALL SORTED</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {LEADS.map((r, i) => {
            const s = spring({ frame: f - (L + i * 6), fps, config: { damping: 18, stiffness: 120 } });
            return (
              <div key={r[0]} style={{ ...cardStyle, borderRadius: 22, width: 1100, padding: "22px 34px", display: "flex", alignItems: "center", gap: 24, opacity: s, transform: `translateY(${(1 - s) * 60}px)` }}>
                <div style={{ width: 230, fontSize: 31, fontWeight: 600, color: C.ink }}>{r[0]}</div>
                <div style={{ flex: 1, fontSize: 28, color: C.grey }}>{r[1]}</div>
                <Tag c={r[2]} size={22} />
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
      <Voice n={10} />
      <Sfx at={0} s="whoosh-b" v={0.35} />
      {LEADS.map((_, i) => <Sfx key={i} at={L + i * 6} s="pop" v={0.16} />)}
      <Sfx at={tWake - 6} s="sting" v={0.25} />
    </Shot>
  );
};

/* ---------- scene 11: read the reply, hit Send ---------- */
const Cursor: React.FC = () => (
  <svg width={54} height={66} viewBox="0 0 18 22"><path d="M1 1 L1 18 L5.5 13.8 L8.6 20.6 L11.4 19.4 L8.4 12.8 L14.6 12.6 Z" fill="#14161b" stroke="#fff" strokeWidth={1.3} strokeLinejoin="round" /></svg>
);
const S11: React.FC = () => {
  const f = useCurrentFrame();
  const len = sceneLen(11);
  const tHit = L + WD(11, 6), tSend = L + WD(11, 7);
  const mv = interpolate(f, [L + 4, tHit + 2], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const press = ramp(f, tSend, tSend + 3) * (1 - ramp(f, tSend + 4, tSend + 10));
  const sent = ramp(f, tSend + 3, tSend + 12);
  return (
    <Shot len={len}>
      <AbsoluteFill style={{ perspective: 2000, alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "relative", transform: "rotateX(5deg) rotateY(-4deg)" }}>
          <DraftCard width={1300} reveal={[-50, -50, -50]} body={BODY.slice(0, 2)} saved={-50}>
            <div style={{ display: "flex", alignItems: "center", gap: 24, marginTop: 10 }}>
              <div style={{ position: "relative" }}>
                <div style={{
                  fontSize: 32, fontWeight: 600, padding: "18px 54px", borderRadius: 999, color: "#fff",
                  background: sent > 0.5 ? "#1d3fb8" : C.blue, transform: `scale(${1 - press * 0.07})`, boxShadow: "0 16px 40px rgba(47,91,234,0.4)",
                }}>{sent > 0.5 ? "✓ Sent" : "Send"}</div>
                {/* cursor tip lands on the button centre */}
                <div style={{ position: "absolute", left: interpolate(mv, [0, 1], [1000, 92]), top: interpolate(mv, [0, 1], [260, 30]), transform: `scale(${1 - press * 0.12})`, transformOrigin: "0 0", opacity: ramp(f, L, L + 6), zIndex: 5 }}>
                  <Cursor />
                </div>
              </div>
              <div style={{ fontSize: 26, color: C.grey, opacity: sent }}>Reply sent to Priya</div>
            </div>
          </DraftCard>
        </div>
      </AbsoluteFill>
      <Voice n={11} />
      <Sfx at={0} s="whoosh-c" v={0.35} />
      <Sfx at={tSend} s="click" v={0.45} />
      <Sfx at={tSend + 4} s="ding" v={0.28} />
    </Shot>
  );
};

/* ---------- the full ad ---------- */
const SCENES = [S1, S2, S3, S4, S5, S6, S7, S8, S9, S10, S11];

const EndIn: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ opacity: ramp(f, 0, 10) }}>
      <EndCard />
      <Sequence from={4}><Audio src={staticFile("voice/line12.wav")} /></Sequence>
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
