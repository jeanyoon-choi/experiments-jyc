"use client";

// Every phone link shares this frame: what the operation is, a live preview of
// the shared screen (so the gesture's effect is visible in the hand), and the
// operation's own control below.

import type { PointerEventHandler, ReactNode, RefObject } from "react";
import type { SpacetimeSnapshot } from "../model";
import { defaultSpacetimeClipId } from "../media";
import { useSpacetimeCanvas, type SpacetimeView } from "../render/use-spacetime-canvas";
import { defaultSpacetimeOperations } from "../screen/settings";
import styles from "./mobile.module.css";

const PREVIEW_PIXEL_RATIO = 1.5;

export function useSpacetimePreview(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  snapshotRef: RefObject<SpacetimeSnapshot | null>,
) {
  return useSpacetimeCanvas({
    canvasRef,
    snapshotRef,
    operations: defaultSpacetimeOperations,
    clipId: defaultSpacetimeClipId,
    maxPixelRatio: PREVIEW_PIXEL_RATIO,
  });
}

export type { SpacetimeView };

export default function MobileStage({
  title,
  lede,
  canvasRef,
  onPreviewPointerDown,
  onPreviewPointerMove,
  onPreviewPointerEnd,
  children,
}: {
  title: string;
  lede: string;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  onPreviewPointerDown?: PointerEventHandler<HTMLCanvasElement>;
  onPreviewPointerMove?: PointerEventHandler<HTMLCanvasElement>;
  onPreviewPointerEnd?: PointerEventHandler<HTMLCanvasElement>;
  children: ReactNode;
}) {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.lede}>{lede}</p>
      </header>
      <canvas
        ref={canvasRef}
        className={styles.preview}
        aria-label={title}
        onPointerDown={onPreviewPointerDown}
        onPointerMove={onPreviewPointerMove}
        onPointerUp={onPreviewPointerEnd}
        onPointerCancel={onPreviewPointerEnd}
      />
      <div className={styles.controlArea}>{children}</div>
    </main>
  );
}
