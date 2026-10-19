"use client";

import { useState } from "react";
import Panel from "./panel/panel";
import Renderer from "./renderer";
import { defaultSettings, type Settings } from "./panel/settings";
import Instagram from "./instagram";

/** dada-text/default: the Instagram clone with every text run, icon, picture and box replaced in place by a command word filling it. */
export default function DadaTextDefault() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  return (
    <>
      <Instagram />
      {settings.replaced && <Renderer group={settings.group} look={settings.look} reach={settings.reach} />}
      <Panel settings={settings} onChange={setSettings} />
    </>
  );
}
