import { describe, expect, it } from "vitest";
import { reverseResolveLocation } from "./weather";

describe("reverseResolveLocation", () => {
  it("labels manually entered coordinates as coordinates", async () => {
    const location = await reverseResolveLocation(47.6062, -122.3321);

    expect(location.input).toBe("47.6062, -122.3321");
    expect(location.name).toBe("47.6062, -122.3321");
  });

  it("labels browser geolocation as current location", async () => {
    const location = await reverseResolveLocation(47.6062, -122.3321, {
      isCurrentLocation: true,
    });

    expect(location.input).toBe("47.6062, -122.3321");
    expect(location.name).toBe("Current location (47.6062, -122.3321)");
  });
});
