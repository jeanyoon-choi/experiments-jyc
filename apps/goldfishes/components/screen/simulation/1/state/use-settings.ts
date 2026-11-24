// The panels' state for the component: the reducer's state, the setters and actions the panels call (stable, so a
// memoised panel is not redrawn by them), the raft's own side of a change, and what the frame loop reads.

import { useEffect, useMemo, useReducer, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { matchPreset, openingUnder, type Preset } from "../presets";
import type { Raft } from "../raft/raft";
import type { ViewId } from "../raft/views";
import type { LoopSettings } from "../loop/frame-loop";
import { RULES } from "../model/agents";
import { DEFAULT_PARAMETERS } from "../web/model";
import { OPENING } from "./opening";
import { initialSettings, reduceSettings, type SettingsAction } from "./reducer";
import type { Model, Rates, Settings } from "./schema";
import { saveSnapshot } from "./snapshot";

const SLICES = ["model", "view", "rates", "damping", "population", "groups", "diversity", "visual", "fishCount", "fish", "fishPalette", "feedback", "life", "objects", "sound", "mode", "lab", "spread"] as const satisfies readonly (keyof Settings)[];

/** One setter per slice, taking a value or an updater as a useState setter does. */
export type SettingsSetters = { readonly [Slice in keyof Settings]: Dispatch<SetStateAction<Settings[Slice]>> };

function settersOf(dispatch: Dispatch<SettingsAction>): SettingsSetters {
  const setter = <Slice extends keyof Settings>(slice: Slice) => [slice, (update: SetStateAction<Settings[Slice]>) => dispatch({ type: "set", slice, update } as SettingsAction)] as const;
  return Object.fromEntries(SLICES.map(setter)) as SettingsSetters;
}

/** What the loop reads of the settings (loop/frame-loop.ts). */
function loopSettingsOf({ model, rates, visual, fishCount, fish, fishPalette, feedback, life, objects, mode, lab, spread }: Pick<Settings, "model" | "rates" | Exclude<keyof LoopSettings, "parameters" | "rules" | "transport" | "system">>): LoopSettings {
  // 터지는 크기 (the presets' and the panel's: times a bubble's fair share) is the agents' capacity too, in multiples
  // of the mean audience: with the area following the audience the two are the same measure.
  // of the mean audience: with the area following the audience the two are the same measure. 회복 is the tiring's.
  const rule = { ...RULES[model.id === "PR" ? "에이전트" : model.id], zeroSum: model.zeroSum, open: model.open, capacity: rates.burstAt, burstAt: rates.burstAt, recovery: rates.recovery };
  return { parameters: { web: { ...DEFAULT_PARAMETERS, ...rates }, rule }, rules: model.id !== "PR", transport: model.id === "PR" || model.id === "에이전트", system: model, visual, fishCount, fish, fishPalette, feedback, life, objects, mode, lab, spread };
}

/** `setup`: the member of the first preset family to open on (../clock.tsx), read once. */
export function useSettings(raft: Raft, setup: number) {
  const [opening] = useState(() => openingUnder(setup));
  const [state, dispatch] = useReducer(reduceSettings, opening, initialSettings);

  // What the frame loop reads every frame, kept current after each render.
  const settingsRef = useRef<LoopSettings>(loopSettingsOf(state));
  const { model, rates, visual, fishCount, fish, fishPalette, feedback, life, objects, mode, lab, spread } = state;
  useEffect(() => {
    settingsRef.current = loopSettingsOf({ model, rates, visual, fishCount, fish, fishPalette, feedback, life, objects, mode, lab, spread });
  }, [model, rates, visual, fishCount, fish, fishPalette, feedback, life, objects, mode, lab, spread]);

  // The state as last drawn, for the actions that read it (다시 섞기's restart, JSON 내려받기).
  const latest = useRef(state);
  useEffect(() => {
    latest.current = state;
  });

  const set = useMemo(() => settersOf(dispatch), []);
  // The changes that are the raft's too, each told to it as it is made; then the presets and the resets.
  const actions = useMemo(() => {
    const restart = () => raft.requestRestart(latest.current.population);
    return {
      view(next: ViewId) {
        set.view(next);
        raft.changeView(next);
      },
      rates: (change: Partial<Rates>) => set.rates((current) => ({ ...current, ...change })),
      /** 규칙: another model, or another condition of the agents, starts the screen over; the size switch does not. */
      model(change: Partial<Model>) {
        set.model((current) => ({ ...current, ...change }));
        if (change.id !== undefined && change.id !== latest.current.model.id) restart();
      },
      damping(value: number) {
        set.damping(value);
        raft.setDamping(value);
      },
      population(count: number) {
        set.population(count);
        raft.requestRestart(count);
      },
      groups(count: number) {
        set.groups(count);
        raft.setGroups(count);
        restart();
      },
      diversity(value: number) {
        set.diversity(value);
        raft.setDiversity(value);
        restart();
      },
      reshuffle() {
        raft.reshuffle();
        restart();
      },
      flow: (on: boolean) => set.visual((current) => ({ ...current, flow: on ? 1 : 0 })),
      portions: (value: number) => set.visual((current) => ({ ...current, portions: value })),
      // Values only: the web, the school and whatever is on the screen carry on under them.
      preset: (preset: Preset) => dispatch({ type: "preset", preset }),
      fishDefaults: (second: boolean) => dispatch({ type: "fish-defaults", second }),
      /** 기본값 3. */
      opening() {
        dispatch({ type: "opening", opening });
        raft.changeView("network");
        raft.setDamping(OPENING.damping);
        raft.setGroups(OPENING.groups);
        raft.requestRestart(OPENING.pages);
      },
      export: () => saveSnapshot(latest.current),
    };
  }, [raft, set, opening]);
  // Which preset the values now are (presets PRESET_FAMILIES).
  const preset = useMemo(() => matchPreset({ rates, fish, feedback, objects, visual }), [rates, fish, feedback, objects, visual]);

  return { state, set, actions, preset, settingsRef };
}
