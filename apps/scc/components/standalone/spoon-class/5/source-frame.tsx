"use client";

import { forwardRef } from "react";

export const NATIVE_GAME_HEIGHT = 150;

// A separate document preserves the original document, CSS cascade, canvas,
// global Runner singleton, input listeners and audio lifecycle. Unmounting the
// frame disposes that whole browsing context, including requestAnimationFrame.
//
// The document keeps the game's native 150px height. Its width is the row's
// width divided by the scale, so after scaling the runway spans the full row
// and Runner lays out its own world at that width.
const SourceFrame = forwardRef<
  HTMLIFrameElement,
  { html: string; title: string; width: number; scale: number; offset: number }
>(function SourceFrame({ html, title, width, scale, offset }, ref) {
  return (
    <iframe
      ref={ref}
      title={title}
      srcDoc={html}
      sandbox="allow-scripts allow-same-origin"
      allow="autoplay"
      tabIndex={0}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        display: "block",
        width,
        height: NATIVE_GAME_HEIGHT,
        border: 0,
        background: "#f7f7f7",
        transform: `translateY(${offset}px) scale(${scale})`,
        transformOrigin: "0 0",
      }}
    />
  );
});

export default SourceFrame;
