"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { defaultSettings, fieldConfig, type FieldSettings } from "./model/config";
import { advanceField, createField, updatePhone } from "./model/field";
import { fitPhoneGrid } from "./model/layout";
import Phone from "./phone";
import FieldControls from "./controls";
import styles from "./phone-field.module.css";

export default function GoldfishesPhoneField() {
  const container = useRef<HTMLElement>(null);
  const paused = useRef(new Map<string, Set<string>>());
  const elapsed = useRef(0);
  const [phones, setPhones] = useState(() => createField());
  const [settings, setSettings] = useState(defaultSettings);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const layout = fitPhoneGrid(viewport.width, viewport.height, phones.length, settings);

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setViewport({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let previous = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      const delta = Math.min(now - previous, fieldConfig.tickMs * 2);
      previous = now;
      if (document.hidden) return;
      elapsed.current += delta;
      const currentTime = elapsed.current;
      const pausedIds = new Set([...paused.current].filter(([, sources]) => sources.size > 0).map(([id]) => id));
      const samples = Array.from({ length: phones.length }, () => ({ presence: Math.random(), dwell: Math.random(), phase: Math.random() }));
      setPhones((current) => advanceField(current, currentTime, pausedIds, samples, settings));
    }, fieldConfig.tickMs);
    return () => window.clearInterval(timer);
  }, [phones.length, settings]);

  const onSetting = (key: keyof FieldSettings, value: number) => {
    const nextSettings = { ...settings, [key]: value };
    setSettings(nextSettings);
    const now = elapsed.current;
    if (key === "phoneCount") {
      const seeds = createField(value);
      const ids = new Set(seeds.map((phone) => phone.id));
      for (const id of paused.current.keys()) if (!ids.has(id)) paused.current.delete(id);
      setPhones((current) => {
        const existing = new Map(current.map((phone) => [phone.id, phone]));
        return seeds.map((phone) => existing.get(phone.id) ?? phone);
      });
    } else if (key === "keywordPresenceProbability") {
      const samples = Array.from({ length: phones.length }, () => ({ presence: Math.random(), dwell: Math.random(), phase: Math.random() }));
      paused.current.clear();
      setPhones((current) => advanceField(current.map((phone) => ({ ...phone, nextUpdateAt: now })), now, new Set(), samples, nextSettings));
    } else if (key === "speed") {
      setPhones((current) => current.map((phone) => ({ ...phone, nextUpdateAt: now + Math.max(0, phone.nextUpdateAt - now) * settings.speed / value })));
    }
  };

  const onPause = useCallback((id: string, source: "hover" | "focus", active: boolean) => {
    const sources = paused.current.get(id) ?? new Set<string>();
    if (active) sources.add(source); else sources.delete(source);
    if (sources.size) paused.current.set(id, sources); else paused.current.delete(id);
  }, []);

  const onTopic = useCallback((id: string, index: number) => {
    const currentTime = elapsed.current;
    setPhones((current) => current.map((phone) => phone.id === id ? { ...updatePhone(phone, currentTime, index), nextUpdateAt: currentTime + phone.cadenceMs / settings.speed } : phone));
  }, [settings.speed]);

  return (
    <main className={styles.field} aria-label="Goldfishes phone field">
      <section ref={container} className={styles.stage} aria-label="Phones">
      <div className={styles.grid} style={{
        visibility: layout.width > 0 ? "visible" : "hidden",
        gridTemplateColumns: `repeat(${layout.columns}, ${layout.width}px)`,
        gridAutoRows: `${layout.height}px`, gap: layout.gap,
      }}>
        {phones.map((phone) => <Phone key={phone.id} phone={phone} width={layout.width} onTopic={onTopic} onPause={onPause} />)}
      </div>
      </section>
      <FieldControls settings={settings} columns={layout.columns} rows={Math.ceil(phones.length / layout.columns)} onChange={onSetting} />
    </main>
  );
}
