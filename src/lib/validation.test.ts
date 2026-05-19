import { describe, expect, it } from "vitest";
import { toDateInputValue, validateDateRange } from "./validation";

describe("validateDateRange", () => {
  it("accepts a same-day forecast request", () => {
    const today = toDateInputValue(new Date());

    expect(() => validateDateRange(today, today)).not.toThrow();
  });

  it("rejects an end date before the start date", () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    expect(() =>
      validateDateRange(toDateInputValue(tomorrow), toDateInputValue(today)),
    ).toThrow("End date must be the same as or after the start date.");
  });

  it("rejects ranges beyond the supported forecast window", () => {
    const today = new Date();
    const tooFar = new Date(today);
    tooFar.setDate(tooFar.getDate() + 16);

    expect(() =>
      validateDateRange(toDateInputValue(today), toDateInputValue(tooFar)),
    ).toThrow("Date range must be within the next 16 days.");
  });
});
