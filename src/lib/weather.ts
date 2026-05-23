import { describeAqi, describeWeatherCode } from "./weather-codes";
import type {
  AirQuality,
  CurrentWeather,
  DailyForecast,
  ResolvedLocation,
  WeatherBundle,
} from "./types";

const forecastBaseUrl = "https://api.open-meteo.com/v1/forecast";
const geocodingBaseUrl = "https://geocoding-api.open-meteo.com/v1/search";
const airQualityBaseUrl = "https://air-quality-api.open-meteo.com/v1/air-quality";
const nominatimBaseUrl = "https://nominatim.openstreetmap.org/search";

export type LocationInputType = "cityTown" | "zip" | "coordinates" | "landmark";

export async function resolveLocation(
  input: string,
  options: { locationType?: LocationInputType } = {},
): Promise<ResolvedLocation> {
  const trimmed = input.trim();

  if (!trimmed) {
    throw new Error("Enter a location.");
  }

  if (options.locationType === "zip") {
    return resolvePostalCodeLocation(trimmed);
  }

  if (options.locationType === "landmark") {
    return resolveLandmarkLocation(trimmed);
  }

  if (options.locationType === "cityTown" && isPostalCodeLike(trimmed)) {
    throw new Error("Enter a city or town name, not a ZIP or postal code.");
  }

  const params = new URLSearchParams({
    name: trimmed,
    count: "1",
    language: "en",
    format: "json",
  });

  const data = await getJson<{ results?: OpenMeteoGeocodingResult[] }>(
    `${geocodingBaseUrl}?${params}`,
    "Location lookup failed.",
  );
  const match = data.results?.[0];

  if (!match) {
    throw new Error(`No matching city or town found for "${trimmed}".`);
  }

  return {
    input: trimmed,
    name: formatResolvedName(match),
    country: match.country,
    admin1: match.admin1,
    latitude: match.latitude,
    longitude: match.longitude,
    timezone: match.timezone,
  };
}

async function resolvePostalCodeLocation(input: string): Promise<ResolvedLocation> {
  if (!isPostalCodeLike(input)) {
    throw new Error("Enter a valid ZIP or postal code for this location type.");
  }

  const params = new URLSearchParams({
    postalcode: input,
    format: "jsonv2",
    limit: "1",
    addressdetails: "1",
  });

  if (isUsZipCode(input)) {
    params.set("countrycodes", "us");
  }

  const data = await getNominatimResults(params, "Postal code lookup failed.");
  const match = data[0];

  if (!match) {
    throw new Error(`No matching ZIP or postal code found for "${input}".`);
  }

  return nominatimToLocation(input, match);
}

async function resolveLandmarkLocation(input: string): Promise<ResolvedLocation> {
  if (isPostalCodeLike(input)) {
    throw new Error("Enter a landmark name, not a ZIP or postal code.");
  }

  const params = new URLSearchParams({
    q: input,
    format: "jsonv2",
    limit: "1",
    addressdetails: "1",
  });
  const data = await getNominatimResults(params, "Landmark lookup failed.");
  const match = data[0];

  if (!match) {
    throw new Error(`No matching location found for "${input}".`);
  }

  if (!isLandmarkLike(match)) {
    throw new Error("Enter a landmark name for this location type.");
  }

  return nominatimToLocation(input, match);
}

async function getNominatimResults(params: URLSearchParams, errorMessage: string) {
  return getJson<NominatimResult[]>(`${nominatimBaseUrl}?${params}`, errorMessage, {
    "user-agent": "weather-assessment-fullstack/1.0",
    referer: "https://github.com/NeilChaudhari21/weather-assessment-fullstack",
  });
}

function nominatimToLocation(
  input: string,
  match: NominatimResult,
): ResolvedLocation {
  const latitude = Number(match.lat);
  const longitude = Number(match.lon);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error(`No usable coordinates found for "${input}".`);
  }

  return {
    input,
    name: match.display_name,
    latitude,
    longitude,
  };
}

export async function reverseResolveLocation(
  latitude: number,
  longitude: number,
  options: { isCurrentLocation?: boolean } = {},
): Promise<ResolvedLocation> {
  const coordinates = formatCoordinates(latitude, longitude);

  return {
    input: coordinates,
    name: options.isCurrentLocation ? `Current location (${coordinates})` : coordinates,
    latitude,
    longitude,
  };
}

export async function getWeatherBundleForLocation(
  input: string,
  options: {
    startDate?: string;
    endDate?: string;
    locationType?: LocationInputType;
  } = {},
) {
  const location = await resolveLocation(input, {
    locationType: options.locationType,
  });
  return getWeatherBundle(location, options);
}

export async function getWeatherBundleForCoordinates(
  latitude: number,
  longitude: number,
  options: {
    startDate?: string;
    endDate?: string;
    isCurrentLocation?: boolean;
  } = {},
) {
  const location = await reverseResolveLocation(latitude, longitude, {
    isCurrentLocation: options.isCurrentLocation,
  });
  return getWeatherBundle(location, options);
}

export async function getWeatherBundle(
  location: ResolvedLocation,
  options: { startDate?: string; endDate?: string } = {},
): Promise<WeatherBundle> {
  const forecast = await getForecast(location, options);
  const airQuality = await getAirQuality(location.latitude, location.longitude);

  return {
    location: {
      ...location,
      timezone: location.timezone ?? forecast.timezone,
    },
    current: forecast.current,
    forecast: forecast.forecast,
    airQuality,
  };
}

async function getForecast(
  location: ResolvedLocation,
  options: { startDate?: string; endDate?: string },
) {
  const params = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    current:
      "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m",
    daily:
      "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max",
    timezone: "auto",
  });

  if (options.startDate && options.endDate) {
    params.set("start_date", options.startDate);
    params.set("end_date", options.endDate);
  } else {
    params.set("forecast_days", "5");
  }

  const data = await getJson<OpenMeteoForecastResponse>(
    `${forecastBaseUrl}?${params}`,
    "Weather request failed.",
  );

  return {
    timezone: data.timezone,
    current: normalizeCurrent(data),
    forecast: normalizeDaily(data),
  };
}

async function getAirQuality(latitude: number, longitude: number) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: "us_aqi,pm2_5,pm10,ozone,nitrogen_dioxide",
    timezone: "auto",
  });

  try {
    const data = await getJson<OpenMeteoAirQualityResponse>(
      `${airQualityBaseUrl}?${params}`,
      "Air quality request failed.",
    );
    const current = data.current ?? {};
    const usAqi = nullableNumber(current.us_aqi);

    return {
      usAqi,
      pm25: nullableNumber(current.pm2_5),
      pm10: nullableNumber(current.pm10),
      ozone: nullableNumber(current.ozone),
      nitrogenDioxide: nullableNumber(current.nitrogen_dioxide),
      label: describeAqi(usAqi),
    } satisfies AirQuality;
  } catch {
    return null;
  }
}

async function getJson<T>(
  url: string,
  fallbackMessage: string,
  headers: HeadersInit = {},
): Promise<T> {
  const response = await fetch(url, {
    next: { revalidate: 300 },
    headers: {
      accept: "application/json",
      ...headers,
    },
  });

  if (!response.ok) {
    let detail = fallbackMessage;

    try {
      const errorBody = (await response.json()) as { reason?: string };
      detail = errorBody.reason ?? detail;
    } catch {
      detail = `${fallbackMessage} Status: ${response.status}`;
    }

    throw new Error(detail);
  }

  return response.json() as Promise<T>;
}

function normalizeCurrent(data: OpenMeteoForecastResponse): CurrentWeather {
  const current = data.current ?? {};
  const weatherCode = nullableNumber(current.weather_code);

  return {
    temperature: nullableNumber(current.temperature_2m),
    apparentTemperature: nullableNumber(current.apparent_temperature),
    humidity: nullableNumber(current.relative_humidity_2m),
    precipitation: nullableNumber(current.precipitation),
    windSpeed: nullableNumber(current.wind_speed_10m),
    weatherCode,
    summary: describeWeatherCode(weatherCode),
  };
}

function normalizeDaily(data: OpenMeteoForecastResponse): DailyForecast[] {
  const daily = data.daily;

  if (!daily?.time?.length) {
    return [];
  }

  return daily.time.map((date, index) => {
    const weatherCode = nullableNumber(daily.weather_code?.[index]);

    return {
      date,
      weatherCode,
      summary: describeWeatherCode(weatherCode),
      temperatureMax: nullableNumber(daily.temperature_2m_max?.[index]),
      temperatureMin: nullableNumber(daily.temperature_2m_min?.[index]),
      precipitationSum: nullableNumber(daily.precipitation_sum?.[index]),
      windSpeedMax: nullableNumber(daily.wind_speed_10m_max?.[index]),
    };
  });
}

function nullableNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function formatResolvedName(match: OpenMeteoGeocodingResult) {
  return [match.name, match.admin1, match.country].filter(Boolean).join(", ");
}

function formatCoordinates(latitude: number, longitude: number) {
  return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
}

function isPostalCodeLike(input: string) {
  const normalized = input.trim();
  const postalPatterns = [
    /^\d{5}(-\d{4})?$/,
    /^[A-Z]\d[A-Z][ -]?\d[A-Z]\d$/i,
    /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i,
    /^\d{4,6}$/,
  ];

  return postalPatterns.some((pattern) => pattern.test(normalized));
}

function isUsZipCode(input: string) {
  return /^\d{5}(-\d{4})?$/.test(input.trim());
}

function isLandmarkLike(match: NominatimResult) {
  const administrativeTypes = new Set([
    "administrative",
    "city",
    "town",
    "village",
    "hamlet",
    "suburb",
    "postcode",
    "postal_code",
    "municipality",
    "county",
    "state",
    "country",
  ]);

  return (
    !administrativeTypes.has(match.type) &&
    !administrativeTypes.has(match.addresstype ?? "") &&
    match.class !== "boundary"
  );
}

type OpenMeteoGeocodingResult = {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
  timezone?: string;
};

type NominatimResult = {
  display_name: string;
  lat: string;
  lon: string;
  class: string;
  type: string;
  addresstype?: string;
};

type OpenMeteoForecastResponse = {
  timezone?: string;
  current?: {
    temperature_2m?: number;
    relative_humidity_2m?: number;
    apparent_temperature?: number;
    precipitation?: number;
    weather_code?: number;
    wind_speed_10m?: number;
  };
  daily?: {
    time?: string[];
    weather_code?: number[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_sum?: number[];
    wind_speed_10m_max?: number[];
  };
};

type OpenMeteoAirQualityResponse = {
  current?: {
    us_aqi?: number;
    pm2_5?: number;
    pm10?: number;
    ozone?: number;
    nitrogen_dioxide?: number;
  };
};
