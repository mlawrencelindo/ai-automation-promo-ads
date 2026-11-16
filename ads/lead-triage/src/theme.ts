import { loadFont as loadMontserrat } from "@remotion/google-fonts/Montserrat";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono } from "@remotion/google-fonts/IBMPlexMono";
import timing from "./timing.json";

export const DISPLAY = loadMontserrat("normal", { weights: ["700", "800"], subsets: ["latin"] }).fontFamily;
export const UI = loadInter("normal", { weights: ["500", "600", "700"], subsets: ["latin"] }).fontFamily;
export const MONO = loadMono("normal", { weights: ["500", "600"], subsets: ["latin"] }).fontFamily;

export const C = {
  ground: "#0b0f14",
  ground2: "#111823",
  line: "#253041",
  teal: "#2ee6c5",
  coral: "#ff5a36",
  cream: "#f6f1e7",
  white: "#ffffff",
  grey: "#8a96a8",
};

export const FPS = 30;
export const f = (s: number) => Math.round(s * FPS);

type Line = { text: string; dur: number; words: { w: string; s: number; e: number }[] };
export const T = timing as unknown as Record<string, Line>;

/** Seconds where each voice line starts on the film's clock. */
export const LINE_START: Record<number, number> = {};
{
  let t = 0.3;
  for (const k of Object.keys(T).map(Number).sort((a, b) => a - b)) {
    LINE_START[k] = t;
    t += T[k].dur + 0.2;
  }
}
/** Global second when word i of line n starts. */
export const W = (n: number, i: number) => LINE_START[n] + T[n].words[i].s;
export const lineEnd = (n: number) => LINE_START[n] + T[n].dur;
