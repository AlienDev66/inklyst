/** Fixed server amounts. There is no per-page and no yearly-goal kind. */
export const XP_AMOUNTS = {
  showed_up: 10,
  caught_up: 15,
  finished_together: 40,
  returned_to_chapter: 10,
  shared_process: 5,
} as const;

export type XpKind = keyof typeof XP_AMOUNTS;

export function xpAmount(kind: string): number {
  if (!Object.prototype.hasOwnProperty.call(XP_AMOUNTS, kind)) {
    throw new Error("xp kind refused");
  }
  return XP_AMOUNTS[kind as XpKind];
}

export function rankCircle(entries: { userId: string; xp: number }[]) {
  return [...entries].sort(
    (a, b) => b.xp - a.xp || a.userId.localeCompare(b.userId),
  );
}
