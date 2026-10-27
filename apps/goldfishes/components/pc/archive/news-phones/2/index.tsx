"use client";

import { useEffect, useRef, useState } from "react";
import { defaultSettings, fieldConfig, type FieldSettings, type SurfaceVariant } from "./model/config";
import { advanceField, createField } from "./model/field";
import { fitPhoneGrid } from "./model/layout";
import FieldControls from "./controls";
import Phone from "./phone";
import styles from "./phone-field.module.css";

export default function PhoneVariations() {
  const stage = useRef<HTMLElement>(null);
  const elapsed = useRef(0);
  const [phones, setPhones] = useState(() => createField());
  const [settings, setSettings] = useState(defaultSettings);
  const [surface, setSurface] = useState<SurfaceVariant>("colours");
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const layout = fitPhoneGrid(viewport.width, viewport.height, phones.length, settings);

  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setViewport({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let previous = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      elapsed.current += Math.min(now - previous, fieldConfig.tickMs * 2);
      previous = now;
      if (document.hidden) return;
      const samples = Array.from({ length: phones.length }, () => ({ presence: Math.random(), dwell: Math.random(), phase: Math.random() }));
      setPhones((current) => advanceField(current, elapsed.current, samples, settings));
    }, fieldConfig.tickMs);
    return () => window.clearInterval(timer);
  }, [phones.length, settings]);

  function onSetting(key: keyof FieldSettings, value: number) {
    const nextSettings = { ...settings, [key]: value };
    setSettings(nextSettings);
    const now = elapsed.current;
    if (key === "phoneCount") {
      const seeds = createField(value);
      setPhones((current) => {
        const existing = new Map(current.map((phone) => [phone.id, phone]));
        return seeds.map((phone) => existing.get(phone.id) ?? phone);
      });
    } else if (key === "presenceProbability") {
      const samples = Array.from({ length: phones.length }, () => ({ presence: Math.random(), dwell: Math.random(), phase: Math.random() }));
      setPhones((current) => advanceField(current.map((phone) => ({ ...phone, nextUpdateAt: now })), now, samples, nextSettings));
    } else if (key === "speed") {
      setPhones((current) => current.map((phone) => ({ ...phone, nextUpdateAt: now + Math.max(0, phone.nextUpdateAt - now) * settings.speed / value })));
    }
  }

  return (
    <main className={styles.field} aria-label="Phone variations">
      <section className={styles.stage} ref={stage}>
        <div className={styles.grid} style={{ visibility: layout.width > 0 ? "visible" : "hidden", gridTemplateColumns: `repeat(${layout.columns}, ${layout.width}px)`, gridAutoRows: `${layout.height}px`, gap: layout.gap }}>
          {phones.map((phone) => <Phone key={phone.id} phone={phone} surface={surface} width={layout.width} />)}
        </div>
      </section>
      <FieldControls columns={layout.columns} onChange={onSetting} onSurfaceChange={setSurface} rows={Math.ceil(phones.length / layout.columns)} settings={settings} surface={surface} />
    </main>
  );
}
