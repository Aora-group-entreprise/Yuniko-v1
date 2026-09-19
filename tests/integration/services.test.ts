import { describe, expect, it } from "vitest";
import { paginateAfter, rankWithDiversity } from "../../src/lib/algorithms/production";

describe("service-level contracts", () => {
  it("supports stable feed pages", () => {
    const source = Array.from({ length: 20 }, (_, i) => ({ id: String(i), score: 20 - i }));
    const first = rankWithDiversity(source, new Set(), 10);
    const second = paginateAfter(source, first.at(-1)?.id, 10);
    expect(new Set(second.map(x => x.id)).size).toBe(second.length);
    expect(second.some(x => first.some(y => y.id === x.id))).toBe(false);
  });
});
