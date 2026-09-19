import { describe, expect, it } from "vitest";
import { distributionStage, paginateAfter, rankWithDiversity, wilsonLowerBound } from "../../src/lib/algorithms/production";

describe("production ranking", () => {
  it("removes seen and duplicate posts while preserving score order", () => {
    const result = rankWithDiversity(
      [{ id: "a", score: 3 }, { id: "b", score: 9 }, { id: "b", score: 8 }, { id: "c", score: 5 }],
      new Set(["c"]), 10);
    expect(result.map(x => x.id)).toEqual(["b", "a"]);
  });
  it("paginates after a cursor without repeating the cursor", () => {
    expect(paginateAfter([{ id: "a" }, { id: "b" }, { id: "c" }], "b", 2).map(x => x.id)).toEqual(["c"]);
  });
  it("keeps Wilson bounds inside probability limits", () => {
    expect(wilsonLowerBound(8, 10)).toBeGreaterThan(0);
    expect(wilsonLowerBound(8, 10)).toBeLessThanOrEqual(0.8);
    expect(wilsonLowerBound(0, 0)).toBe(0);
  });
  it("advances distribution only when thresholds are met", () => {
    expect(distributionStage(0.09, 0.11, 0)).toBe(3);
    expect(distributionStage(0.16, 0.3, 0)).toBe(5);
    expect(distributionStage(0.3, 0.6, 0)).toBe(7);
    expect(distributionStage(0.3, 0.6, 0.06)).toBe(0);
  });
});
