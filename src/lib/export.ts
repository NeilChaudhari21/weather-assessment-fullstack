import type { WeatherRequestRecord } from "./types";

export function weatherRequestsToCsv(records: WeatherRequestRecord[]) {
  const rows: unknown[][] = [];

  for (const [index, record] of records.entries()) {
    if (index > 0) {
      rows.push([]);
    }

    rows.push(["Location", record.resolvedName]);
    rows.push(["User input", record.inputLocation]);
    rows.push(["Coordinates", `${record.latitude}, ${record.longitude}`]);
    rows.push(["Saved date range", `${record.startDate} to ${record.endDate}`]);
    rows.push(["Air quality", record.airQualityData?.label ?? "Unavailable"]);
    rows.push(["Saved at", record.createdAt]);
    rows.push([]);
    rows.push([
      "Date",
      "Summary",
      "High temp (C)",
      "Low temp (C)",
      "Precipitation (mm)",
      "Max wind (km/h)",
    ]);

    const dailyRows = record.weatherData.forecast.length
      ? record.weatherData.forecast
      : [
          {
            date: record.startDate,
            summary: record.weatherData.current.summary,
            temperatureMax: record.weatherData.current.temperature,
            temperatureMin: record.weatherData.current.temperature,
            precipitationSum: record.weatherData.current.precipitation,
            windSpeedMax: record.weatherData.current.windSpeed,
          },
        ];

    for (const day of dailyRows) {
      rows.push([
        day.date,
        day.summary,
        day.temperatureMax ?? "",
        day.temperatureMin ?? "",
        day.precipitationSum ?? "",
        day.windSpeedMax ?? "",
      ]);
    }

    rows.push([]);
    rows.push([
      "Record ID",
      "Input location",
      "Resolved location",
      "Latitude",
      "Longitude",
      "Start date",
      "End date",
      "Current temp (C)",
      "Current summary",
      "Air quality",
      "Created at",
      "Updated at",
    ]);
    rows.push([
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
    ]);
  }

  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function csvCell(value: unknown) {
  const stringValue = String(value ?? "");
  if (/[",\n\r]/.test(stringValue)) {
    return `"${stringValue.replaceAll('"', '""')}"`;
  }

  return stringValue;
}
