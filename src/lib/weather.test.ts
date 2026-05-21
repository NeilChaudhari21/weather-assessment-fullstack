import { describe, expect, it } from "vitest";
import { resolveLocation, reverseResolveLocation } from "./weather";

describe("resolveLocation", () => {
  it("rejects ZIP codes when city/town is selected", async () => {
    await expect(
      resolveLocation("98052", { locationType: "cityTown" }),
    ).rejects.toThrow("Enter a city or town name, not a ZIP or postal code.");
  });

  it("rejects postal codes when city/town is selected", async () => {
    await expect(
      resolveLocation("M5V 3L9", { locationType: "cityTown" }),
    ).rejects.toThrow("Enter a city or town name, not a ZIP or postal code.");
  });
});

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
