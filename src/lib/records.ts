import type { WeatherRequest } from "@prisma/client";
import type { AirQuality, WeatherBundle, WeatherRequestRecord } from "./types";

export function serializeWeatherRequest(
  record: WeatherRequest,
): WeatherRequestRecord {
  return {
    id: record.id,
    inputLocation: record.inputLocation,
    resolvedName: record.resolvedName,
    latitude: record.latitude,
    longitude: record.longitude,
    startDate: record.startDate.toISOString().slice(0, 10),
    endDate: record.endDate.toISOString().slice(0, 10),
    weatherData: record.weatherData as WeatherBundle,
    airQualityData: record.airQualityData as AirQuality | null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}
