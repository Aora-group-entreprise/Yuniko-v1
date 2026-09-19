export type RankedItem = { id: string; score: number; authorId?: string; topic?: string };

export function rankWithDiversity(items: RankedItem[], seenIds: ReadonlySet<string>, limit: number): RankedItem[] {
  const unique = new Map<string, RankedItem>();
  for (const item of items) if (!seenIds.has(item.id) && !unique.has(item.id)) unique.set(item.id, item);
  return [...unique.values()].sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)).slice(0, Math.max(0, limit));
}

export function paginateAfter<T extends { id: string }>(items: T[], after: string | undefined, limit: number): T[] {
  const start = after ? Math.max(0, items.findIndex(x => x.id === after) + 1) : 0;
  return items.slice(start, start + Math.max(0, limit));
}

export function wilsonLowerBound(successes: number, trials: number, z = 1.96): number {
  if (trials <= 0) return 0;
  const p = Math.min(1, Math.max(0, successes / trials));
  const z2 = z * z;
  const denominator = 1 + z2 / trials;
  const centre = p + z2 / (2 * trials);
  const spread = z * Math.sqrt((p * (1 - p) + z2 / (4 * trials)) / trials);
  return Math.max(0, (centre - spread) / denominator);
}

export function distributionStage(er: number, velocity: number, reportRate: number): number {
  if (reportRate >= 0.05) return 0;
  if (er >= 0.25 && velocity >= 0.5) return 7;
  if (er >= 0.15 && velocity >= 0.25) return 5;
  if (er >= 0.08 && velocity >= 0.1) return 3;
  return 0;
}
