export type ResolvedLocation = {
  input: string;
  name: string;
  country?: string;
  admin1?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
};

export type CurrentWeather = {
  temperature: number | null;
  apparentTemperature: number | null;
  humidity: number | null;
  precipitation: number | null;
  windSpeed: number | null;
  weatherCode: number | null;
  summary: string;
};

export type DailyForecast = {
  date: string;
  weatherCode: number | null;
  summary: string;
  temperatureMax: number | null;
  temperatureMin: number | null;
  precipitationSum: number | null;
  windSpeedMax: number | null;
};

export type AirQuality = {
  usAqi: number | null;
  pm25: number | null;
  pm10: number | null;
  ozone: number | null;
  nitrogenDioxide: number | null;
  label: string;
};

export type WeatherBundle = {
  location: ResolvedLocation;
  current: CurrentWeather;
  forecast: DailyForecast[];
  airQuality: AirQuality | null;
};

export type LocationInsight = {
  title: string;
  description: string | null;
  summary: string | null;
  thumbnailUrl: string | null;
  pageUrl: string | null;
  source: "Wikimedia";
};

export type WeatherRequestRecord = {
  id: string;
  inputLocation: string;
  resolvedName: string;
  latitude: number;
  longitude: number;
  startDate: string;
  endDate: string;
  weatherData: WeatherBundle;
  airQualityData: AirQuality | null;
  createdAt: string;
  updatedAt: string;
};
