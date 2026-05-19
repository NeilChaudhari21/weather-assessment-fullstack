import type { WeatherRequestRecord } from "./types";

export function weatherRequestsToCsv(records: WeatherRequestRecord[]) {
  const rows = [
    [
      "id",
      "inputLocation",
      "resolvedName",
      "latitude",
      "longitude",
      "startDate",
      "endDate",
      "currentTemperature",
      "currentSummary",
      "airQuality",
      "createdAt",
      "updatedAt",
    ],
    ...records.map((record) => [
      record.id,
      record.inputLocation,
      record.resolvedName,
      record.latitude,
      record.longitude,
      record.startDate,
      record.endDate,
      record.weatherData.current.temperature ?? "",
      record.weatherData.current.summary,
      record.airQualityData?.label ?? "",
      record.createdAt,
      record.updatedAt,
    ]),
  ];

  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function csvCell(value: unknown) {
  const stringValue = String(value ?? "");
  if (/[",\n\r]/.test(stringValue)) {
    return `"${stringValue.replaceAll('"', '""')}"`;
  }

  return stringValue;
}
