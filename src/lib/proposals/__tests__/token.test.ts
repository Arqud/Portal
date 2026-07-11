import { describe, expect, it } from "vitest";
import { generateShareToken } from "@/lib/proposals/token";

describe("generateShareToken", () => {
  it("returns 32 characters", () => {
    expect(generateShareToken()).toHaveLength(32);
  });

  it("is lowercase hex only", () => {
    expect(generateShareToken()).toMatch(/^[0-9a-f]{32}$/);
  });

  it("returns a different token on every call", () => {
    expect(generateShareToken()).not.toBe(generateShareToken());
  });
});
