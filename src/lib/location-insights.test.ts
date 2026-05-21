import { describe, expect, it } from "vitest";
import { normalizeWikimediaInsight } from "./location-insights";

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
