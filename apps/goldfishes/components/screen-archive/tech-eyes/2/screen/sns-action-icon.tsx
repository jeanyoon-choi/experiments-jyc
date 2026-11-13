import { snsActionAt } from "../model/sns-actions";

const source = "/images/0922/icons/instagram-action-row-reference.jpg";

/** One source-matched 2D action per stable story identity. */
export function SnsActionIcon({ index }: { index: number }) {
  const action = snsActionAt(index);

  return (
    <svg
      aria-hidden="true"
      data-sns-action={action.id}
      viewBox={action.viewBox}
      style={{ display: "block", width: "74%", height: "74%", mixBlendMode: "lighten", pointerEvents: "none" }}
    >
      <image href={source} width="1178" height="202" />
    </svg>
  );
}
