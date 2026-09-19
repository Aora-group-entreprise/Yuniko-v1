import { describe, expect, it } from "vitest";
import { cacheGet, cacheGetOrSet, cacheSet } from "../../src/lib/cache";

describe("cache", () => {
  it("expires entries", async () => {
    await cacheSet("x", 1, 1);
    await new Promise(r => setTimeout(r, 3));
    expect(await cacheGet("x")).toBeNull();
  });
  it("loads once while cached", async () => {
    let calls = 0;
    const load = () => Promise.resolve(++calls);
    expect(await cacheGetOrSet("a", load)).toBe(1);
    expect(await cacheGetOrSet("a", load)).toBe(1);
    expect(calls).toBe(1);
  });
});
