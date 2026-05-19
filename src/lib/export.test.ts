import { describe, expect, it } from "vitest";
import { weatherRequestsToCsv } from "./export";
import type { WeatherRequestRecord } from "./types";

describe("weatherRequestsToCsv", () => {
  it("exports saved requests with escaped CSV cells", () => {
    const record: WeatherRequestRecord = {
      id: "rec_1",
      inputLocation: "Seattle, WA",
      resolvedName: "Seattle, Washington, United States",
      latitude: 47.6062,
      longitude: -122.3321,
      startDate: "2026-05-19",
      endDate: "2026-05-20",
      weatherData: {
        location: {
          input: "Seattle, WA",
          name: "Seattle, Washington, United States",
          latitude: 47.6062,
          longitude: -122.3321,
        },
        current: {
          temperature: 18,
          apparentTemperature: 17,
          humidity: 70,
          precipitation: 0,
          windSpeed: 8,
          weatherCode: 2,
          summary: "Partly cloudy",
        },
        forecast: [],
        airQuality: null,
      },
      airQualityData: {
        usAqi: 42,
        pm25: 4,
        pm10: 8,
        ozone: 30,
        nitrogenDioxide: 10,
        label: "Good",
      },
      createdAt: "2026-05-19T00:00:00.000Z",
      updatedAt: "2026-05-19T00:00:00.000Z",
    };

    const csv = weatherRequestsToCsv([record]);

    expect(csv).toContain('"Seattle, WA"');
    expect(csv).toContain('"Seattle, Washington, United States"');
    expect(csv).toContain("Partly cloudy");
    expect(csv).toContain("Good");
  });
});
