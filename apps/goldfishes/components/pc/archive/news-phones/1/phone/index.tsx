import { memo } from "react";
import { fieldConfig } from "../model/config";
import type { FishPhone } from "../model/field";
import NewsPage from "../news";
import styles from "../phone-field.module.css";

export default memo(function Phone({ phone, width, onTopic, onPause }: {
  phone: FishPhone;
  width: number;
  onTopic: (id: string, index: number) => void;
  onPause: (id: string, source: "hover" | "focus", paused: boolean) => void;
}) {
  return (
    <section className={styles.phoneSlot} aria-label={`Goldfish ${phone.id}, news website`}
      data-present={phone.activeKeyword !== null} aria-hidden={phone.activeKeyword === null} inert={phone.activeKeyword === null}
      onPointerEnter={() => onPause(phone.id, "hover", true)} onPointerLeave={() => onPause(phone.id, "hover", false)}
      onFocusCapture={() => onPause(phone.id, "focus", true)}
      onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) onPause(phone.id, "focus", false); }}>
      <div className={styles.phone} style={{ width: fieldConfig.phoneWidth, height: fieldConfig.phoneHeight, transform: `scale(${width / fieldConfig.phoneWidth})` }}>
      <div className={styles.glass}>
        <div className={styles.status} aria-hidden="true"><span>9:41</span><span className={styles.camera} /><span>▰</span></div>
        <div className={styles.address}>thecurrent.example</div>
        <div className={styles.viewport}>
          <NewsPage phone={phone} onTopic={(index) => onTopic(phone.id, index)} />
        </div>
        <div className={styles.home} aria-hidden="true"><span /></div>
      </div>
      </div>
    </section>
  );
});
