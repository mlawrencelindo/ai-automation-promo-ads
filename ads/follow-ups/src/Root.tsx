import React from "react";
import { Composition } from "remotion";
import { EndCard, END_FRAMES } from "./Brand";
import { Ad, AD_FRAMES } from "./Ad";

export const Root: React.FC = () => (
  <>
    <Composition id="Ad" component={Ad} durationInFrames={AD_FRAMES} fps={30} width={1920} height={1080} />
    <Composition id="EndCard" component={EndCard} durationInFrames={END_FRAMES} fps={30} width={1920} height={1080} />
  </>
);
