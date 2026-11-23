import { useLayoutEffect, useRef } from "react";
import { techHieroglyphs } from "../model/tech-hieroglyphs";
import styles from "./story-tray.module.css";

export function TechHieroglyph({ term }: { term: string }) {
  const drawing = useRef<SVGGElement>(null);
  const sign = techHieroglyphs[term];

  useLayoutEffect(() => {
    const group = drawing.current;
    if (!group) return;
    // Center the paths themselves; no font baseline or device font is involved.
    const box = group.getBBox();
    group.setAttribute("transform", `translate(${50 - box.x - box.width / 2} ${50 - box.y - box.height / 2})`);
    group.style.visibility = "visible";
  }, [term]);

  if (!sign) return null;
  return (
    <svg aria-hidden="true" className={styles.techHieroglyph} viewBox="0 0 100 100">
      <g ref={drawing} style={{ visibility: "hidden" }}>
        {sign.parts.map((part, index) => (
          <path key={index} d={part.ink} transform={part.transform} fill="currentColor" fillRule="evenodd" />
        ))}
      </g>
    </svg>
  );
}
