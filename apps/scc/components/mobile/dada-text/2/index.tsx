"use client";

import { useRef, useState } from "react";
import Panel from "./panel/panel";
import Renderer from "./renderer";
import { defaultSettings, type Settings } from "./panel/settings";
import Instagram from "./instagram";
import Mirror from "./split/mirror";

/**
 * dada-text/2: /default split down the screen's middle. The live clone is replaced as in /default; its untouched copy covers
 * the left half, so the left reads as Instagram and the right as its replacement, one interface across both.
 */
export default function DadaTextTwo() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const live = useRef<HTMLDivElement>(null);
  return (
    <>
      <div ref={live} style={{ display: "contents" }}>
        <Instagram />
      </div>
      <Mirror source={live} />
      {settings.replaced && <Renderer group={settings.group} look={settings.look} reach={settings.reach} />}
      <Panel settings={settings} onChange={setSettings} />
    </>
  );
}
