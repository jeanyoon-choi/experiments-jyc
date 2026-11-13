// The object kinds as screen/bubble/7 names them (its objects/objects.ts
// OBJECT_SETS), copied: the keywords the phones receive are these ids. The
// objects will change often upstream; a later bubble/N with other objects
// means copying its shapes/models/gpu here again and editing this list.

export const OBJECT_SETS = {
  tech: { kinds: ["sparkle", "cloud", "gpu", "robot", "humanoid", "robotDog", "roadster", "headset", "ape", "rocket", "chat", "spinner"] },
  sns: { kinds: ["heart", "like", "comment"] },
} as const;

export type ObjectKind = (typeof OBJECT_SETS)[keyof typeof OBJECT_SETS]["kinds"][number];

export const OBJECT_KINDS: readonly ObjectKind[] = [...OBJECT_SETS.tech.kinds, ...OBJECT_SETS.sns.kinds];

export function isObjectKind(kind: string): kind is ObjectKind {
  return (OBJECT_KINDS as readonly string[]).includes(kind);
}
