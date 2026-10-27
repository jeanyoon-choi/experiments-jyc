import { memo } from "react";
import { fieldConfig, type SurfaceVariant } from "../model/config";
import type { FishPhone } from "../model/field";
import { keywordSentenceAt } from "../model/keyword-sentences";
import styles from "../phone-field.module.css";
import GoogleMobile from "./google-mobile";

export default memo(function Phone({ phone, surface, width }: { phone: FishPhone; surface: SurfaceVariant; width: number }) {
  const keywordSentence = keywordSentenceAt(phone.surfaceIndex);
  return (
    <section
      aria-hidden={phone.activeColour === null}
      aria-label={phone.activeColour ? `Goldfish ${phone.id}, ${surface}` : undefined}
      className={styles.phoneSlot}
      data-present={phone.activeColour !== null}
      inert={phone.activeColour === null}
    >
      <div
        className={styles.phone}
        style={{
          width: fieldConfig.phoneWidth,
          height: fieldConfig.phoneHeight,
          transform: `scale(${width / fieldConfig.phoneWidth})`,
        }}
      >
        {surface === "google" ? (
          <GoogleMobile surfaceIndex={phone.surfaceIndex} />
        ) : surface === "colours" ? (
          <div className={styles.colour} style={{ backgroundColor: phone.activeColour ?? "transparent" }} />
        ) : surface === "keywords" ? (
          <div className={styles.keywordSurface}>
            <span className={styles.keyword}>{keywordSentence.keyword}</span>
          </div>
        ) : (
          <div className={styles.keywordSentenceSurface}>
            <div className={styles.keywordSentenceCopy}>
              <span className={styles.keywordTitle}>{keywordSentence.keyword}</span>
              <span className={styles.sentence}>{keywordSentence.sentence}</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
});
