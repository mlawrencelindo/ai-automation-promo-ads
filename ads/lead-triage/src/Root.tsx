import React from "react";
import { Composition } from "remotion";
import { LightTest, LIGHT_FRAMES } from "./LightTest";
import { EndCard, END_FRAMES } from "./Brand";
import { OpenTest, OPEN_FRAMES } from "./OpenTest";
import { Ad, AD_FRAMES } from "./Ad";

// Opening.tsx and Shot3D.tsx are the dropped 9:16 tests, kept as reference only (their word timings are stale).
export const Root: React.FC = () => (
  <>
    <Composition id="Ad" component={Ad} durationInFrames={AD_FRAMES} fps={30} width={1920} height={1080} />
    <Composition id="LightTest" component={LightTest} durationInFrames={LIGHT_FRAMES} fps={30} width={1920} height={1080} />
    <Composition id="OpenTest" component={OpenTest} durationInFrames={OPEN_FRAMES} fps={30} width={1920} height={1080} />
    <Composition id="EndCard" component={EndCard} durationInFrames={END_FRAMES} fps={30} width={1920} height={1080} />
  </>
);
