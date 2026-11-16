import React, { useEffect, useRef } from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  Sequence,
  continueRender,
  delayRender,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { Environment, Lightformer, RoundedBox, Text } from "@react-three/drei";
import * as THREE from "three";
import { C, DISPLAY, FPS, f, W, LINE_START, lineEnd } from "./theme";

export const SHOT3D_FRAMES = Math.ceil((lineEnd(1) + 0.5) * FPS);

const INK = "#10151d";
const BG = "#eceef2";
const F_DISPLAY = staticFile("fonts/montserrat-latin-800-normal.woff");
const F_UI = staticFile("fonts/inter-latin-600-normal.woff");
const F_UI_B = staticFile("fonts/inter-latin-700-normal.woff");

const ease = Easing.bezier(0.22, 1, 0.36, 1);
const inOut = Easing.bezier(0.65, 0, 0.35, 1);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const prog = (t: number, a: number, d: number, e = ease) => interpolate(t, [a, a + d], [0, 1], { ...clamp, easing: e });
const sp = (frame: number, at: number, damping = 14, stiffness = 160) =>
  spring({ frame: frame - f(at), fps: FPS, config: { damping, stiffness, mass: 0.9 } });
const bump = (t: number, at: number, up = 0.06, down = 0.4) =>
  interpolate(t, [at, at + up, at + up + down], [0, 1, 0], { ...clamp, easing: Easing.out(Easing.quad) });
const mix = (a: number[], b: number[], p: number) => a.map((v, i) => v + (b[i] - v) * p) as [number, number, number];
const key = (t: number, ts: number[], vs: number[]) => interpolate(t, ts, vs, { ...clamp, easing: inOut });

/* ---------- times ---------- */
const T_DIG = 0.3;
const T_AM = W(1, 2);
const T_SWAP = 1.45;
const T_NAME = W(1, 4);
const T_CO = W(1, 5);
const T_MSG = W(1, 6);
const T_SEND = W(1, 7);
const T_ENV = W(1, 8) + 0.02;
const END = SHOT3D_FRAMES / FPS;

/* Text that holds the render until its glyphs are ready. */
const SText: React.FC<React.ComponentProps<typeof Text>> = (props) => {
  const handle = useRef<number | null>(null);
  const { advance } = useThree();
  useEffect(() => {
    const h = delayRender("troika text", { timeoutInMilliseconds: 60000 });
    handle.current = h;
    return () => {
      if (handle.current === h) handle.current = null;
      continueRender(h);
    };
  }, []);
  return (
    <Text
      {...props}
      onSync={() => {
        if (handle.current !== null) {
          const h = handle.current;
          handle.current = null;
          advance(performance.now());
          requestAnimationFrame(() => continueRender(h));
        } else {
          advance(performance.now());
        }
      }}
    />
  );
};

/* ---------- camera ---------- */
const CameraRig: React.FC<{ t: number }> = ({ t }) => {
  const { camera } = useThree();
  const ts = [0, T_SWAP, T_SWAP + 0.7, T_ENV, END];
  const x = key(t, ts, [-0.55, 0.35, 0.55, 0.3, 0.1]);
  const y = key(t, ts, [-0.75, -0.6, -0.65, -0.65, -0.6]);
  const z = key(t, ts, [5.6, 7.6, 10.4, 10.4, 9.9]);
  const lookY = key(t, ts, [-0.55, -0.55, -0.9, -0.9, -0.85]);
  const punch = 0.35 * bump(t, T_AM) + 0.3 * bump(t, T_SEND);
  camera.position.set(x, y, z - punch);
  camera.lookAt(0, lookY, 0);
  return null;
};

/* ---------- 1:14 clock ---------- */
const Clock: React.FC<{ t: number; frame: number }> = ({ t, frame }) => {
  const away = prog(t, T_SWAP, 0.7, inOut);
  const pos = mix([0, 0, 0], [1.25, 2.35, -3.8], away);
  const s = 1 - 0.45 * away;
  const arc = prog(t, 0.25, 1.4, inOut) * 0.78;
  const rise = sp(frame, T_DIG, 15, 120);
  const off = -0.75 * (1 - rise);
  const am = sp(frame, T_AM, 10, 200);
  const sway = 0.06 * Math.sin(t * 1.3);
  return (
    <group position={pos} scale={s} rotation={[0.05, -0.18 + sway - 0.5 * away, 0]}>
      <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1.0, 1.0, 0.24, 96]} />
        <meshPhysicalMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.14} roughness={0.32} clearcoat={1} clearcoatRoughness={0.15} />
      </mesh>
      <mesh position={[0, 0, 0.13]}>
        <torusGeometry args={[1.12, 0.035, 12, 140]} />
        <meshStandardMaterial color="#d5dae2" roughness={0.6} />
      </mesh>
      {arc > 0.005 && (
        <mesh position={[0, 0, 0.15]} rotation={[0, 0, Math.PI / 2]} scale={[-1, 1, 1]}>
          <torusGeometry args={[1.12, 0.06, 16, 160, arc * Math.PI * 2]} />
          <meshStandardMaterial color={C.teal} emissive={C.teal} emissiveIntensity={0.35} roughness={0.25} metalness={0.1} />
        </mesh>
      )}
      {Array.from({ length: 60 }).map((_, i) => {
        const a = Math.PI / 2 - (i / 60) * Math.PI * 2;
        const major = i % 5 === 0;
        const r = 1.3;
        const lit = i / 60 <= arc;
        return (
          <mesh key={i} position={[r * Math.cos(a), r * Math.sin(a), 0.05]} rotation={[0, 0, a]}>
            <boxGeometry args={[major ? 0.14 : 0.08, major ? 0.03 : 0.018, 0.03]} />
            <meshStandardMaterial color={lit ? C.teal : "#c6ccd6"} roughness={0.5} />
          </mesh>
        );
      })}
      <SText
        font={F_DISPLAY} fontSize={0.68} color={INK} anchorX="center" anchorY="middle" letterSpacing={-0.02}
        position={[0, 0.08 + off, 0.125]} clipRect={[-2, -0.4 - off, 2, 0.4 - off]}
      >
        1:14
      </SText>
      <SText font={F_UI_B} fontSize={0.15} color="#14b89c" anchorX="center" anchorY="middle" letterSpacing={0.25}
        position={[0, -0.42, 0.125]} scale={0.6 + 0.4 * am} fillOpacity={Math.min(1, am * 1.3)}>
        AM
      </SText>
    </group>
  );
};

/* ---------- inquiry card ---------- */
const Field: React.FC<{ y: number; label: string; value: string; width: number; p: number; at: number; t: number; frame: number }> = ({ y, label, value, width, p, at, t, frame }) => {
  const inP = prog(t, at, 0.35);
  const active = p > 0 && p < 1;
  const caretOn = active && frame % 12 < 7;
  return (
    <group position={[(1 - inP) * -0.3, y, 0]}>
      <SText font={F_UI} fontSize={0.075} color="#7b8696" anchorX="left" anchorY="middle" position={[-0.98, 0.25, 0.07]} fillOpacity={inP}>
        {label}
      </SText>
      {active && (
        <RoundedBox args={[2.0, 0.34, 0.012]} radius={0.006} smoothness={2} position={[0, 0, 0.062]}>
          <meshStandardMaterial color={C.teal} roughness={0.4} />
        </RoundedBox>
      )}
      <RoundedBox args={[1.96, 0.3, 0.02]} radius={0.01} smoothness={2} position={[0, 0, 0.068]}>
        <meshStandardMaterial color="#f1f3f7" roughness={0.6} transparent opacity={inP} />
      </RoundedBox>
      <SText font={F_UI} fontSize={0.13} color={INK} anchorX="left" anchorY="middle" position={[-0.88, 0, 0.085]} clipRect={[-0.01, -1, width * p, 1]}>
        {value}
      </SText>
      {caretOn && (
        <mesh position={[-0.88 + width * p + 0.02, 0, 0.085]}>
          <boxGeometry args={[0.012, 0.16, 0.005]} />
          <meshBasicMaterial color={C.teal} />
        </mesh>
      )}
    </group>
  );
};

const Card: React.FC<{ t: number; frame: number }> = ({ t, frame }) => {
  if (t < T_SWAP - 0.05) return null;
  const inS = sp(frame, T_SWAP, 16, 110);
  const out = prog(t, T_ENV + 0.05, 0.6, Easing.in(Easing.cubic));
  const pos = mix(mix([-3.4, -2.2, -6.5], [0, 0.3, 0], inS), [-0.4, 0.2, -9], out);
  const rot = mix(mix([0.35, 1.1, 0.25], [0.07, -0.16, 0], inS), [0.3, -0.6, 0.1], out);
  const press = bump(t, T_SEND, 0.06, 0.18);
  const sent = t >= T_SEND + 0.06;
  const pulse = 0.5 + 0.5 * Math.sin(t * 9);
  return (
    <group position={pos} rotation={rot} scale={0.92}>
      <RoundedBox args={[2.3, 2.7, 0.12]} radius={0.07} smoothness={5} castShadow>
        <meshPhysicalMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.12} roughness={0.35} clearcoat={1} clearcoatRoughness={0.2} />
      </RoundedBox>
      <mesh position={[-0.95, 1.12, 0.065]}>
        <circleGeometry args={[0.035 + 0.01 * pulse, 24]} />
        <meshBasicMaterial color={C.teal} />
      </mesh>
      <SText font={F_UI_B} fontSize={0.075} color="#7b8696" letterSpacing={0.14} anchorX="left" anchorY="middle" position={[-0.87, 1.12, 0.07]}>
        NEW INQUIRY
      </SText>
      <SText font={F_UI} fontSize={0.075} color="#7b8696" anchorX="right" anchorY="middle" position={[0.98, 1.12, 0.07]}>
        01:14
      </SText>
      <Field y={0.62} label="Name" value="Priya Shah" width={0.78} p={prog(t, T_NAME, 0.2, Easing.linear)} at={T_SWAP + 0.25} t={t} frame={frame} />
      <Field y={0.04} label="Company" value="Shah Bookkeeping" width={1.32} p={prog(t, T_CO, 0.34, Easing.linear)} at={T_SWAP + 0.32} t={t} frame={frame} />
      {[1, 0.86, 0.58].map((w, i) => {
        const p = prog(t, T_MSG + i * 0.07, 0.25);
        const ww = Math.max(0.001, 1.96 * w * p);
        return (
          <RoundedBox key={i} args={[ww, 0.06, 0.01]} radius={0.004} smoothness={2} position={[-0.98 + ww / 2, -0.38 - i * 0.12, 0.065]}>
            <meshStandardMaterial color="#e3e7ee" roughness={0.6} />
          </RoundedBox>
        );
      })}
      <group position={[0, -0.98, 0.07]} scale={[1 - 0.05 * press, 1 - 0.05 * press, 1 - 0.6 * press]}>
        <RoundedBox args={[1.96, 0.36, 0.07]} radius={0.03} smoothness={4}>
          <meshPhysicalMaterial color={sent ? C.teal : "#e6e9ef"} roughness={0.3} clearcoat={0.6} emissive={sent ? C.teal : "#000000"} emissiveIntensity={sent ? 0.15 : 0} />
        </RoundedBox>
        <SText font={F_UI_B} fontSize={0.13} color={INK} anchorX="center" anchorY="middle" position={[0, 0, 0.04]} fillOpacity={sent ? 0 : 1}>
          Send
        </SText>
        <SText font={F_UI_B} fontSize={0.13} color={INK} anchorX="center" anchorY="middle" position={[0.06, 0, 0.04]} fillOpacity={sent ? 1 : 0}>
          Sent
        </SText>
        {sent && (
          <group position={[-0.22, 0, 0.04]} scale={prog(t, T_SEND + 0.06, 0.2)}>
            <mesh position={[-0.03, -0.01, 0]} rotation={[0, 0, -0.8]}>
              <boxGeometry args={[0.08, 0.022, 0.01]} />
              <meshBasicMaterial color={INK} />
            </mesh>
            <mesh position={[0.035, 0.02, 0]} rotation={[0, 0, 0.9]}>
              <boxGeometry args={[0.14, 0.022, 0.01]} />
              <meshBasicMaterial color={INK} />
            </mesh>
          </group>
        )}
      </group>
    </group>
  );
};

/* ---------- envelope that flies at the camera ---------- */
const Envelope: React.FC<{ t: number; frame: number }> = ({ t, frame }) => {
  if (t < T_ENV) return null;
  const popS = sp(frame, T_ENV, 11, 220);
  const fly = prog(t, T_ENV + 0.12, END - T_ENV - 0.12, Easing.in(Easing.cubic));
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.3, 0.3),
    new THREE.Vector3(0.15, 0.2, 3.0),
    new THREE.Vector3(0.1, -0.3, 6.2),
    new THREE.Vector3(0.1, -0.75, 8.9),
  ]);
  const p = curve.getPoint(fly);
  return (
    <group position={p} rotation={[0.25 - 0.25 * fly, -0.5 + Math.PI * 2 * 0.5 * fly + 0.5 * fly, 0.15 * Math.sin(fly * 6)]} scale={popS * 0.9}>
      <RoundedBox args={[1.0, 0.68, 0.06]} radius={0.04} smoothness={4} castShadow>
        <meshPhysicalMaterial color="#fbf8f2" roughness={0.45} clearcoat={0.4} />
      </RoundedBox>
      {[-1, 1].map((sgn) => (
        <mesh key={sgn} position={[sgn * 0.22, 0.12, 0.035]} rotation={[0, 0, sgn * 0.62]}>
          <boxGeometry args={[0.58, 0.03, 0.01]} />
          <meshStandardMaterial color="#c9d0da" />
        </mesh>
      ))}
      <mesh position={[0, -0.06, 0.04]}>
        <circleGeometry args={[0.07, 32]} />
        <meshStandardMaterial color={C.teal} emissive={C.teal} emissiveIntensity={0.2} />
      </mesh>
    </group>
  );
};

/* ---------- floating set pieces ---------- */
type Deco = { kind: "glass" | "ball" | "cube"; pos: [number, number, number]; r: number; color?: string; rough?: number };
const DECO: Deco[] = [
  { kind: "ball", pos: [-2.3, 3.4, -5.5], r: 1.1, color: "#d9dbe0", rough: 1 },
  { kind: "ball", pos: [2.2, 1.5, -3.2], r: 0.7, color: "#57d9c2", rough: 0.85 },
  { kind: "ball", pos: [-2.4, -1.0, -4.2], r: 0.95, color: "#94b6ff", rough: 0.8 },
  { kind: "ball", pos: [2.1, -3.1, -2.0], r: 0.5, color: "#ff9a7a", rough: 0.8 },
  { kind: "cube", pos: [1.6, 3.4, -2.4], r: 0.45, color: "#cbbdff", rough: 0.7 },
  { kind: "cube", pos: [-1.35, -2.3, 2.6], r: 0.22, color: "#57d9c2", rough: 0.7 },
  { kind: "glass", pos: [-1.55, 1.6, -0.8], r: 0.32 },
  { kind: "glass", pos: [1.25, -1.55, 1.9], r: 0.2 },
  { kind: "glass", pos: [-1.0, -3.0, -1.5], r: 0.28 },
  { kind: "glass", pos: [1.7, 0.2, 0.9], r: 0.14 },
];

const Decor: React.FC<{ t: number }> = ({ t }) => (
  <>
    {DECO.map((d, i) => {
      const y = d.pos[1] + 0.12 * Math.sin(t * 0.9 + i * 1.7);
      const rot: [number, number, number] = [t * 0.25 + i, t * 0.35 + i * 0.5, 0];
      if (d.kind === "glass")
        return (
          <mesh key={i} position={[d.pos[0], y, d.pos[2]]}>
            <sphereGeometry args={[d.r, 48, 48]} />
            <meshPhysicalMaterial transmission={1} thickness={0.4} roughness={0.03} ior={1.35} color="#ffffff" clearcoat={1} attenuationColor="#dff6f2" attenuationDistance={2} />
          </mesh>
        );
      if (d.kind === "cube")
        return (
          <RoundedBox key={i} args={[d.r * 2, d.r * 2, d.r * 2]} radius={d.r * 0.3} smoothness={5} position={[d.pos[0], y, d.pos[2]]} rotation={rot} castShadow>
            <meshStandardMaterial color={d.color} roughness={d.rough} />
          </RoundedBox>
        );
      return (
        <mesh key={i} position={[d.pos[0], y, d.pos[2]]} castShadow>
          <sphereGeometry args={[d.r, 64, 64]} />
          <meshStandardMaterial color={d.color} roughness={d.rough} />
        </mesh>
      );
    })}
  </>
);

/* ---------- scene ---------- */
const Scene: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  return (
    <>
      <color attach="background" args={[BG]} />
      <fog attach="fog" args={[BG, 12, 24]} />
      <CameraRig t={t} />
      <ambientLight intensity={0.9} />
      <directionalLight position={[1.5, 2.5, 10]} intensity={1.1} />
      <directionalLight position={[3, 6, 7]} intensity={1.6} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004}>
        <orthographicCamera attach="shadow-camera" args={[-6, 6, 6, -6, 0.5, 30]} />
      </directionalLight>
      <directionalLight position={[-5, 2, -3]} intensity={0.6} color="#dff7f2" />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={2.2} position={[0, 4, 5]} scale={[10, 3, 1]} />
        <Lightformer form="rect" intensity={1.2} position={[-6, 1, 2]} rotation-y={Math.PI / 2} scale={[8, 4, 1]} />
        <Lightformer form="rect" intensity={1.0} position={[6, 0, 0]} rotation-y={-Math.PI / 2} scale={[8, 4, 1]} />
        <Lightformer form="circle" intensity={0.8} color="#2ee6c5" position={[0, -4, 3]} scale={3} />
      </Environment>
      <Decor t={t} />
      <Clock t={t} frame={frame} />
      <Card t={t} frame={frame} />
      <Envelope t={t} frame={frame} />
    </>
  );
};

/* ---------- captions (light theme) ---------- */
type Group = { words: [string, number][]; end: number };
const G: Group[] = [
  { words: [["A", W(1, 3)], ["new", W(1, 4)], ["client", W(1, 5)], ["inquiry", W(1, 6)]], end: W(1, 7) - 0.03 },
  { words: [["comes", W(1, 7)], ["in.", W(1, 8)]], end: 99 },
];
const Captions: React.FC<{ t: number }> = ({ t }) => {
  const frame = useCurrentFrame();
  const g = G.find((x) => t >= x.words[0][1] - 0.05 && t < x.end);
  if (!g) return null;
  return (
    <div style={{ position: "absolute", left: 120, top: 1060, width: 660, height: 180, display: "flex", flexWrap: "wrap", justifyContent: "center", alignContent: "center", columnGap: 6, rowGap: 4, fontFamily: DISPLAY, fontWeight: 800, fontSize: 72, lineHeight: 1.1, textShadow: "0 0 18px rgba(236,238,242,0.95), 0 0 6px rgba(236,238,242,0.95)" }}>
      {g.words.map(([w, at], i) => {
        const p = sp(frame, at, 13, 260);
        const next = i + 1 < g.words.length ? g.words[i + 1][1] : g.end;
        const active = t >= at && t < next;
        const hl = active ? sp(frame, at, 16, 300) : 0;
        return (
          <span key={i} style={{
            display: "inline-block", padding: "2px 14px", borderRadius: 14,
            background: active ? `rgba(46,230,197,${hl})` : "transparent", color: INK,
            opacity: Math.min(1, p * 1.5),
            transform: `translateY(${(1 - p) * 26}px) scale(${(0.85 + 0.15 * p) * (active ? 1.04 : 1)}) rotate(${active ? -1.5 : 0}deg)`,
          }}>
            {w}
          </span>
        );
      })}
    </div>
  );
};

const SFX: [string, number, number, number][] = [
  ["tap", T_DIG + 0.05, 0.5, 0.5],
  ["pop", T_AM, 0.55, 0.6],
  ["whoosh-a", T_SWAP - 0.05, 0.5, 0.9],
  ["typing", T_NAME, 0.4, 0.75],
  ["click", T_SEND, 0.7, 0.5],
  ["whoosh-b", T_ENV + 0.1, 0.55, 0.9],
  ["riser", END - 0.7, 0.35, 0.7],
];

const musicVol = (frame: number) => {
  const t = frame / FPS;
  const duck = interpolate(t, [LINE_START[1] - 0.15, LINE_START[1], lineEnd(1), lineEnd(1) + 0.3], [0, 1, 1, 0], clamp);
  return (0.2 - 0.1 * duck) * interpolate(t, [0, 0.3], [0, 1], clamp);
};

export const Shot3D: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const t = frame / FPS;
  const flash = prog(t, END - 0.16, 0.16, Easing.in(Easing.quad));
  return (
    <AbsoluteFill style={{ background: BG }}>
      <ThreeCanvas width={width} height={height} shadows camera={{ fov: 40, near: 0.1, far: 60 }} gl={{ antialias: true }}>
        <Scene />
      </ThreeCanvas>
      <Captions t={t} />
      <AbsoluteFill style={{ background: "#ffffff", opacity: flash }} />
      <Audio src={staticFile("music.wav")} volume={musicVol} />
      <Sequence from={f(LINE_START[1])}>
        <Audio src={staticFile("voice/line01.wav")} />
      </Sequence>
      {SFX.map(([name, at, vol, len], i) => (
        <Sequence key={i} from={f(at)} durationInFrames={f(len)}>
          <Audio src={staticFile(`sfx/${name}.wav`)} volume={vol} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
