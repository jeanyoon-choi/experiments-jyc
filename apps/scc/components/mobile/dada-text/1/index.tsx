"use client";

import { useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Panel from "./panel/panel";
import Renderer from "./renderer";
import { defaultSettings, type Settings } from "./panel/settings";
import Instagram from "./instagram";

const base = "/mobile/dada-text/1";

/**
 * dada-text/1: only Explore and the post it opens, each its own route (`/1`, `/1/<post>`), so the browser's back
 * moves between the two instead of leaving. The route's layout keeps this mounted across both, so the panel holds.
 */
export default function DadaTextOne() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const { post } = useParams<{ post?: string }>();
  const router = useRouter();
  // Back from a post opened here is the browser's back; from a post opened by its URL it is a step to the grid.
  const openedHere = useRef(false);
  return (
    <>
      <Instagram
        post={post ?? null}
        pictureEvery={settings.pictures === "on" ? settings.pictureEvery : null}
        autoPictures={settings.pictures === "auto"}
        onOpen={(id) => { openedHere.current = true; router.push(`${base}/${id}`); }}
        onBack={() => { if (openedHere.current) router.back(); else router.push(base); openedHere.current = false; }}
      />
      <Renderer group={settings.group} dealt={settings.dealt} hype={settings.hype} look={settings.look} />
      <Panel settings={settings} onChange={setSettings} />
    </>
  );
}
