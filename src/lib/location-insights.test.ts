import { describe, expect, it } from "vitest";
import {
  determineOcean,
  getCoordinateInsightQuery,
  normalizeWikimediaInsight,
} from "./location-insights";

describe("normalizeWikimediaInsight", () => {
  it("normalizes a successful Wikimedia summary", () => {
    const insight = normalizeWikimediaInsight(
      {
        title: "Seattle",
        description: "City in Washington",
      },
      {
        title: "Seattle",
        description: "City in Washington, United States",
        extract: "Seattle is a seaport city on the West Coast.",
        thumbnail: { source: "https://example.com/seattle.jpg" },
        content_urls: {
          desktop: { page: "https://en.wikipedia.org/wiki/Seattle" },
        },
      },
    );

    expect(insight).toEqual({
      title: "Seattle",
      description: "City in Washington, United States",
      summary: "Seattle is a seaport city on the West Coast.",
      thumbnailUrl: "https://example.com/seattle.jpg",
      pageUrl: "https://en.wikipedia.org/wiki/Seattle",
      source: "Wikimedia",
    });
  });

  it("returns null without a page title", () => {
    expect(normalizeWikimediaInsight({})).toBeNull();
  });

  it("falls back to search result data", () => {
    const insight = normalizeWikimediaInsight({
      title: "Space Needle",
      snippet: "<span>Space Needle</span> is a landmark.",
    });

    expect(insight?.summary).toBe("Space Needle is a landmark.");
    expect(insight?.thumbnailUrl).toBeNull();
    expect(insight?.pageUrl).toBe(
      "https://en.wikipedia.org/wiki/Space_Needle",
    );
  });
});

describe("determineOcean", () => {
  it("classifies open-ocean coordinates", () => {
    expect(determineOcean(0, -140)).toBe("Pacific Ocean");
    expect(determineOcean(40, -30)).toBe("Atlantic Ocean");
    expect(determineOcean(-20, 80)).toBe("Indian Ocean");
    expect(determineOcean(80, 0)).toBe("Arctic Ocean");
    expect(determineOcean(-70, 0)).toBe("Southern Ocean");
  });
});

describe("getCoordinateInsightQuery", () => {
  it("falls back to the ocean name when reverse geocoding returns no place", async () => {
    const originalFetch = global.fetch;

    global.fetch = async () =>
      new Response(JSON.stringify({ error: "Unable to geocode" }), {
        headers: { "content-type": "application/json" },
      });

    await expect(getCoordinateInsightQuery(0, -140)).resolves.toBe(
      "Pacific Ocean",
    );

    global.fetch = originalFetch;
  });

  it("uses nearby city or place data when reverse geocoding succeeds", async () => {
    const originalFetch = global.fetch;

    global.fetch = async () =>
      new Response(
        JSON.stringify({
          name: "Seattle",
          address: {
            city: "Seattle",
            state: "Washington",
            country: "United States",
          },
        }),
        {
          headers: { "content-type": "application/json" },
        },
      );

    await expect(getCoordinateInsightQuery(47.6062, -122.3321)).resolves.toBe(
      "Seattle",
    );

    global.fetch = originalFetch;
  });
});
