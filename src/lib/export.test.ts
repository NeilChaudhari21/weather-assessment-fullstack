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
        forecast: [
          {
            date: "2026-05-19",
            weatherCode: 2,
            summary: "Partly cloudy",
            temperatureMax: 21,
            temperatureMin: 12,
            precipitationSum: 0,
            windSpeedMax: 10,
          },
          {
            date: "2026-05-20",
            weatherCode: 61,
            summary: "Slight rain",
            temperatureMax: 19,
            temperatureMin: 11,
            precipitationSum: 2,
            windSpeedMax: 14,
          },
        ],
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
    expect(csv).toContain("Saved date range,2026-05-19 to 2026-05-20");
    expect(csv).toContain("Date,Summary,High temp (C),Low temp (C)");
    expect(csv).toContain("2026-05-19,Partly cloudy,21,12,0,10");
    expect(csv).toContain("2026-05-20,Slight rain,19,11,2,14");
    expect(csv).toContain("Partly cloudy");
    expect(csv).toContain("Good");
  });
});
