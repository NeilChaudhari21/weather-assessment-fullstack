"use client";

import dynamic from "next/dynamic";
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Clock3,
  Database,
  Droplets,
  Download,
  Edit3,
  Loader2,
  LocateFixed,
  MapPin,
  Newspaper,
  Save,
  Search,
  Sun,
  Trash2,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type {
  LocationInsight,
  WeatherBundle,
  WeatherRequestRecord,
} from "@/lib/types";
import { toDateInputValue } from "@/lib/validation";

const WeatherMap = dynamic(() => import("@/components/WeatherMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-72 items-center justify-center rounded-lg border border-stone-200 bg-stone-100 text-sm text-stone-600">
      Loading map
    </div>
  ),
});

const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "Weather Assessment";
const candidateName = "Neil Chaudhari";
const locationInputTypes = [
  { value: "cityTown", label: "City/Town" },
  { value: "zip", label: "ZIP / Postal Code" },
  { value: "coordinates", label: "GPS Coordinates" },
  { value: "landmark", label: "Landmark" },
] as const;

type LocationInputType = (typeof locationInputTypes)[number]["value"];
type TemperatureUnit = "celsius" | "fahrenheit";

export default function Home() {
  const today = useMemo(() => toDateInputValue(new Date()), []);
  const [locationInputType, setLocationInputType] =
    useState<LocationInputType>("cityTown");
  const [location, setLocation] = useState("Seattle");
  const [temperatureUnit, setTemperatureUnit] =
    useState<TemperatureUnit>("celsius");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [weather, setWeather] = useState<WeatherBundle | null>(null);
  const [locationInsight, setLocationInsight] =
    useState<LocationInsight | null>(null);
  const [insightMessage, setInsightMessage] = useState("");
  const [isInsightLoading, setIsInsightLoading] = useState(false);
  const [isCurrentLocationResult, setIsCurrentLocationResult] = useState(false);
  const [records, setRecords] = useState<WeatherRequestRecord[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLocation, setEditingLocation] = useState("");
  const [editingStartDate, setEditingStartDate] = useState(today);
  const [editingEndDate, setEditingEndDate] = useState(today);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUsingLocation, setIsUsingLocation] = useState(false);

  useEffect(() => {
    async function loadRecords() {
      const response = await fetch("/api/weather-requests");
      const data = await response.json();

      if (response.ok) {
        setRecords(data);
      }
    }

    void loadRecords();
  }, []);

  async function handleSearch(event: FormEvent) {
    event.preventDefault();
    setIsSearching(true);
    setError("");
    setStatus("");

    try {
      const data =
        locationInputType === "coordinates"
          ? await apiFetch<WeatherBundle>(coordinateWeatherUrl(location))
          : await apiFetch<WeatherBundle>(
              locationWeatherUrl(location, locationInputType),
            );
      setWeather(data);
      await loadLocationInsight(data);
      setIsCurrentLocationResult(false);
      setStatus(successWeatherMessage(data, locationInputType));
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setIsSearching(false);
    }
  }

  async function handleUseCurrentLocation() {
    setError("");
    setStatus("");

    if (!navigator.geolocation) {
      setError("Your browser does not support geolocation.");
      return;
    }

    setIsUsingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const data = await apiFetch<WeatherBundle>(
            `/api/weather/current?lat=${latitude}&lon=${longitude}&source=current`,
          );
          setWeather(data);
          await loadLocationInsight(data);
          setIsCurrentLocationResult(true);
          setLocationInputType("coordinates");
          setLocation(data.location.input);
          setStatus(`Showing weather for ${data.location.name}.`);
        } catch (caught) {
          setError(errorMessage(caught));
        } finally {
          setIsUsingLocation(false);
        }
      },
      () => {
        setError("Location permission was denied or unavailable.");
        setIsUsingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    setStatus("");

    try {
      const coordinatePayload =
        locationInputType === "coordinates" ? parseCoordinates(location) : null;
      const record = await apiFetch<WeatherRequestRecord>("/api/weather-requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          location:
            locationInputType === "coordinates" ? location : location.trim(),
          locationType: locationInputType,
          startDate,
          endDate,
          isCurrentLocation: isCurrentLocationResult,
          ...coordinatePayload,
        }),
      });
      setRecords((current) => [record, ...current]);
      const dashboardWeather = await fetchDashboardWeather({
        location:
          locationInputType === "coordinates" ? undefined : location.trim(),
        locationType: locationInputType,
        coordinates: coordinatePayload,
        isCurrentLocation: isCurrentLocationResult,
      });
      setWeather(dashboardWeather);
      await loadLocationInsight(dashboardWeather);
      setStatus(`Saved ${record.resolvedName}.`);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setIsSaving(false);
    }
  }

  function startEditing(record: WeatherRequestRecord) {
    setEditingId(record.id);
    setEditingLocation(record.inputLocation);
    setEditingStartDate(record.startDate);
    setEditingEndDate(record.endDate);
    setError("");
    setStatus("");
  }

  async function updateRecord(id: string) {
    setError("");
    setStatus("");

    try {
      const record = await apiFetch<WeatherRequestRecord>(
        `/api/weather-requests/${id}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            location: editingLocation,
            startDate: editingStartDate,
            endDate: editingEndDate,
          }),
        },
      );
      setRecords((current) =>
        current.map((item) => (item.id === id ? record : item)),
      );
      setWeather(record.weatherData);
      await loadLocationInsight(record.weatherData);
      setEditingId(null);
      setStatus(`Updated ${record.resolvedName}.`);
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  async function deleteRecord(id: string) {
    setError("");
    setStatus("");

    try {
      await apiFetch(`/api/weather-requests/${id}`, { method: "DELETE" });
      setRecords((current) => current.filter((item) => item.id !== id));
      setStatus("Saved request deleted.");
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  async function loadLocationInsight(nextWeather: WeatherBundle) {
    setIsInsightLoading(true);
    setLocationInsight(null);
    setInsightMessage("");

    try {
      const query = nextWeather.location.name || nextWeather.location.input;
      const params = new URLSearchParams({
        location: query,
        locationType: locationInputType,
        lat: String(nextWeather.location.latitude),
        lon: String(nextWeather.location.longitude),
      });
      const data = await apiFetch<{
        insight: LocationInsight | null;
        message: string | null;
      }>(`/api/location-insights?${params}`);

      setLocationInsight(data.insight);
      setInsightMessage(data.message ?? "");
    } catch {
      setLocationInsight(null);
      setInsightMessage("Location insights are unavailable right now.");
    } finally {
      setIsInsightLoading(false);
    }
  }

  return (
    <main className="weather-app-shell min-h-screen text-slate-950">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="glass-card flex flex-col gap-4 px-5 py-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">
              Full-stack assessment
            </p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">
              {appName}
            </h1>
          </div>
          <div className="rounded-2xl border border-white/70 bg-white/75 px-4 py-3 text-sm text-slate-700 shadow-sm">
            Built by <span className="font-semibold text-slate-950">{candidateName}</span>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[400px_1fr]">
          <div className="control-panel-card p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-sky-500/15 p-3">
                <CloudSun className="h-6 w-6 text-sky-700" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
                  Search
                </p>
                <h2 className="text-2xl font-semibold">Weather Lookup</h2>
              </div>
            </div>

            <form className="mt-5 space-y-4" onSubmit={handleSearch}>
              <label className="block">
                <span className="text-sm font-medium text-stone-700">
                  Location type
                </span>
                <select
                  value={locationInputType}
                  onChange={(event) => {
                    setLocationInputType(event.target.value as LocationInputType);
                    setIsCurrentLocationResult(false);
                  }}
                  className="input-surface mt-2"
                >
                  {locationInputTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-stone-700">
                  Location
                </span>
                <input
                  value={location}
                  onChange={(event) => {
                    setLocation(event.target.value);
                    setIsCurrentLocationResult(false);
                  }}
                  placeholder={locationPlaceholder(locationInputType)}
                  className="input-surface mt-2"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-[1fr_1.45fr]">
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-600 px-4 py-2.5 font-semibold text-white shadow-lg shadow-sky-500/25 transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSearching}
                  type="submit"
                >
                  {isSearching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  Search
                </button>
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/70 bg-white/70 px-4 py-2.5 font-semibold text-slate-800 shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isUsingLocation}
                  type="button"
                  onClick={handleUseCurrentLocation}
                >
                  {isUsingLocation ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LocateFixed className="h-4 w-4" />
                  )}
                  Use my current location
                </button>
              </div>
            </form>

            <div className="mt-6 rounded-3xl border border-white/70 bg-white/55 p-4 shadow-inner">
              <p className="text-sm font-medium text-stone-700">
                Temperature unit
              </p>
              <div className="mt-2 grid grid-cols-2 rounded-2xl border border-white/70 bg-white/55 p-1 shadow-inner">
                <button
                  className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                    temperatureUnit === "celsius"
                      ? "bg-slate-950 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-950"
                  }`}
                  onClick={() => setTemperatureUnit("celsius")}
                  type="button"
                >
                  Celsius
                </button>
                <button
                  className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                    temperatureUnit === "fahrenheit"
                      ? "bg-slate-950 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-950"
                  }`}
                  onClick={() => setTemperatureUnit("fahrenheit")}
                  type="button"
                >
                  Fahrenheit
                </button>
              </div>
            </div>

            <form className="mt-5 space-y-4 rounded-3xl border border-indigo-100 bg-indigo-50/45 p-4" onSubmit={handleSave}>
              <h3 className="font-semibold text-indigo-950">Save Weather Request</h3>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-sm font-medium text-stone-700">Start</span>
                  <input
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                    type="date"
                    className="input-surface mt-2"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-stone-700">End</span>
                  <input
                    value={endDate}
                    onChange={(event) => setEndDate(event.target.value)}
                    type="date"
                    className="input-surface mt-2"
                  />
                </label>
              </div>
              <button
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-slate-950 to-indigo-900 px-4 py-2.5 font-semibold text-white shadow-lg shadow-indigo-900/20 transition hover:from-slate-800 hover:to-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSaving}
                type="submit"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save to Database
              </button>
            </form>

            {(error || status) && (
              <div
                className={`mt-5 rounded-2xl border px-4 py-3 text-sm shadow-sm ${
                  error
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-sky-200 bg-sky-50 text-sky-800"
                }`}
              >
                {error || status}
              </div>
            )}
          </div>

          <WeatherResults
            insight={locationInsight}
            insightMessage={insightMessage}
            isInsightLoading={isInsightLoading}
            temperatureUnit={temperatureUnit}
            weather={weather}
          />
        </section>

        <SavedRequests
          temperatureUnit={temperatureUnit}
          records={records}
          editingId={editingId}
          editingLocation={editingLocation}
          editingStartDate={editingStartDate}
          editingEndDate={editingEndDate}
          onEdit={startEditing}
          onCancelEdit={() => setEditingId(null)}
          onDelete={deleteRecord}
          onUpdate={updateRecord}
          setEditingLocation={setEditingLocation}
          setEditingStartDate={setEditingStartDate}
          setEditingEndDate={setEditingEndDate}
        />

        <section className="glass-card p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-700">
            Submission Details
          </p>
          <h2 className="mt-1 text-2xl font-semibold">Assessment Info</h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-3xl border border-white/70 bg-white/60 p-5 shadow-sm">
              <h3 className="font-semibold text-slate-950">Project Summary</h3>
              <p className="mt-3 text-sm leading-6 text-stone-700">
                This full-stack weather application was built by {candidateName}{" "}
                for the AI Engineer Intern technical assessment. It completes
                both Tech Assessment #1 and Tech Assessment #2 with a Next.js
                and TypeScript frontend, backend API routes, Neon Postgres
                persistence, Prisma CRUD operations, input validation,
                session-scoped saved requests, JSON/CSV export, and
                deployment-ready Vercel configuration.
              </p>
              <p className="mt-3 text-sm leading-6 text-stone-700">
                The app supports city/town, ZIP/postal code, GPS coordinate,
                landmark, and browser geolocation lookups. It displays current
                conditions, a 5-day forecast, air quality, an interactive map,
                and Wikimedia-powered location insights.
              </p>
            </div>
            <div className="rounded-3xl border border-white/70 bg-white/60 p-5 shadow-sm">
              <h3 className="font-semibold text-slate-950">
                Product Manager Accelerator
              </h3>
              <p className="mt-3 text-sm leading-6 text-stone-700">
                The Product Manager Accelerator Program is designed to support
                PM professionals through every stage of their careers. From
                students looking for entry-level jobs to Directors looking to
                take on a leadership role, the program has helped over hundreds
                of students fulfill their career aspirations.
              </p>
              <p className="mt-3 text-sm leading-6 text-stone-700">
                The Product Manager Accelerator community is ambitious and
                committed. Through the program, members have learned, honed, and
                developed new PM and leadership skills, giving them a strong
                foundation for their future endeavors.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function WeatherResults({
  insight,
  insightMessage,
  isInsightLoading,
  temperatureUnit,
  weather,
}: {
  insight: LocationInsight | null;
  insightMessage: string;
  isInsightLoading: boolean;
  temperatureUnit: TemperatureUnit;
  weather: WeatherBundle | null;
}) {
  if (!weather) {
    return (
      <section className="glass-card flex min-h-[520px] items-center justify-center p-6 text-center">
        <div>
          <div className="weather-icon-bubble mx-auto">
            <CloudSun className="h-16 w-16 text-sky-700" />
          </div>
          <h2 className="mt-4 text-2xl font-semibold">Search for weather</h2>
          <p className="mt-2 max-w-md text-stone-600">
            Enter a place or use browser location to see current weather,
            forecast, air quality, and a map preview.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <div className="space-y-5">
        <div className="weather-hero-card p-6 text-white">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm font-medium text-sky-50 ring-1 ring-white/20">
                <MapPin className="h-4 w-4" />
                {weather.location.name}
              </div>
              <h2 className="mt-5 text-7xl font-semibold tracking-tight">
                {formatTemperature(weather.current.temperature, temperatureUnit)}
              </h2>
              <p className="mt-2 text-xl text-sky-50">
                {weather.current.summary}
              </p>
              <LocalTimeClock timezone={weather.location.timezone} />
            </div>
            <div className="flex flex-col items-stretch gap-4 sm:min-w-72">
              <div className="hero-weather-icon self-center">
                <WeatherIcon
                  className="h-24 w-24 text-white"
                  code={weather.current.weatherCode}
                />
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
              <Metric
                label="Feels"
                value={formatTemperature(
                  weather.current.apparentTemperature,
                  temperatureUnit,
                )}
                variant="dark"
              />
              <Metric label="Humidity" value={`${formatNumber(weather.current.humidity)}%`} variant="dark" />
              <Metric label="Wind" value={`${formatNumber(weather.current.windSpeed)} km/h`} variant="dark" />
              <Metric label="Rain" value={`${formatNumber(weather.current.precipitation)} mm`} variant="dark" />
              </div>
            </div>
          </div>
        </div>

        <div className="forecast-section-card p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
                Week ahead
              </p>
              <h2 className="text-2xl font-semibold text-slate-950">
                5-Day Forecast
              </h2>
            </div>
            <p className="text-sm text-slate-500">
              Daily high, low, rain, and conditions
            </p>
          </div>
          <div className="forecast-grid mt-5">
            {weather.forecast.slice(0, 5).map((day) => (
              <div
                className={`forecast-card ${forecastToneClass(day.weatherCode)} p-5`}
                key={day.date}
              >
                <div className="flex h-full flex-col">
                  <div className="forecast-card-top">
                    <div className="min-w-0">
                      <p className="text-base font-semibold leading-tight text-slate-950">
                        {formatDate(day.date)}
                      </p>
                      <p className="mt-2 text-xs font-semibold uppercase leading-5 tracking-wide text-slate-500">
                        {day.summary}
                      </p>
                    </div>
                    <div className="forecast-icon-shell">
                      <WeatherIcon
                        className="h-14 w-14 text-white"
                        code={day.weatherCode}
                      />
                    </div>
                  </div>
                  <p className="mt-6 text-3xl font-semibold leading-tight text-slate-950">
                    {formatTemperature(day.temperatureMax, temperatureUnit)}
                    <span className="mx-2 text-xl text-slate-500">/</span>
                    {formatTemperature(day.temperatureMin, temperatureUnit)}
                  </p>
                  <div className="forecast-stats mt-5">
                    <div className="forecast-stat-pill">
                      <p className="text-xs font-semibold text-slate-500">Rain</p>
                      <p className="mt-1 text-sm font-semibold text-slate-950">
                        {formatNumber(day.precipitationSum)} mm
                      </p>
                    </div>
                    <div className="forecast-stat-pill">
                      <p className="text-xs font-semibold text-slate-500">Wind</p>
                      <p className="mt-1 text-sm font-semibold text-slate-950">
                        {formatNumber(day.windSpeedMax)} km/h
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <aside className="space-y-5">
        <div className="side-panel-card overflow-hidden p-0">
          <div className="panel-header-violet flex items-center gap-3 px-5 py-4 text-white">
            <div className="rounded-2xl bg-white/20 p-2">
              <Newspaper className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-semibold">Location Insights</h2>
          </div>
          {isInsightLoading ? (
            <div className="flex items-center gap-2 px-5 py-5 text-sm text-stone-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading Wikimedia insight
            </div>
          ) : insight ? (
            <div className="space-y-4 p-5">
              {insight.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt=""
                  className="h-40 w-full rounded-3xl object-cover shadow-lg shadow-violet-900/10"
                  src={insight.thumbnailUrl}
                />
              ) : null}
              <div>
                <p className="font-semibold text-stone-950">{insight.title}</p>
                {insight.description ? (
                  <p className="mt-1 text-sm text-stone-600">
                    {insight.description}
                  </p>
                ) : null}
              </div>
              {insight.summary ? (
                <p className="text-sm leading-6 text-stone-700">
                  {insight.summary}
                </p>
              ) : null}
              {insight.pageUrl ? (
                <a
                  className="inline-flex text-sm font-semibold text-violet-700 hover:text-violet-900"
                  href={insight.pageUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  View on {insight.source}
                </a>
              ) : null}
            </div>
          ) : (
            <p className="p-5 text-sm leading-6 text-stone-600">
              {insightMessage || "No Wikimedia insight found for this location."}
            </p>
          )}
        </div>

        <div className="side-panel-card overflow-hidden p-0">
          <div className="panel-header-emerald flex items-center justify-between px-5 py-4 text-white">
            <h2 className="text-xl font-semibold">Air Quality</h2>
            <Droplets className="h-7 w-7" />
          </div>
          {weather.airQuality ? (
            <div className="space-y-4 p-5">
              <div className="flex items-center justify-between rounded-3xl bg-gradient-to-br from-emerald-100 to-sky-100 px-4 py-4 shadow-inner">
                <div>
                  <p className="text-4xl font-semibold">{weather.airQuality.usAqi ?? "N/A"}</p>
                  <p className="text-stone-700">{weather.airQuality.label}</p>
                </div>
                <div className="rounded-3xl bg-white/60 p-3">
                  <Droplets className="h-10 w-10 text-emerald-600" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Metric label="PM2.5" value={`${formatNumber(weather.airQuality.pm25)} ug/m3`} />
                <Metric label="PM10" value={`${formatNumber(weather.airQuality.pm10)} ug/m3`} />
                <Metric label="Ozone" value={`${formatNumber(weather.airQuality.ozone)} ug/m3`} />
                <Metric label="NO2" value={`${formatNumber(weather.airQuality.nitrogenDioxide)} ug/m3`} />
              </div>
            </div>
          ) : (
            <p className="p-5 text-sm text-stone-600">
              Air-quality data is unavailable for this location right now.
            </p>
          )}
        </div>

        <div className="side-panel-card overflow-hidden p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Map</h2>
            <MapPin className="h-6 w-6 text-sky-700" />
          </div>
          <WeatherMap
            latitude={weather.location.latitude}
            longitude={weather.location.longitude}
            label={weather.location.name}
          />
        </div>
      </aside>
    </section>
  );
}

function SavedRequests({
  temperatureUnit,
  records,
  editingId,
  editingLocation,
  editingStartDate,
  editingEndDate,
  onEdit,
  onCancelEdit,
  onDelete,
  onUpdate,
  setEditingLocation,
  setEditingStartDate,
  setEditingEndDate,
}: {
  temperatureUnit: TemperatureUnit;
  records: WeatherRequestRecord[];
  editingId: string | null;
  editingLocation: string;
  editingStartDate: string;
  editingEndDate: string;
  onEdit: (record: WeatherRequestRecord) => void;
  onCancelEdit: () => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string) => void;
  setEditingLocation: (value: string) => void;
  setEditingStartDate: (value: string) => void;
  setEditingEndDate: (value: string) => void;
}) {
  return (
    <section className="saved-requests-card p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="rounded-3xl bg-gradient-to-br from-indigo-600 to-sky-500 p-3 text-white shadow-lg shadow-indigo-500/20">
            <Database className="h-7 w-7" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-700">
              Neon Database
            </p>
            <h2 className="mt-1 text-2xl font-semibold">
              Saved Weather Requests
            </h2>
            <p className="mt-1 text-sm text-stone-600">
              Stored weather snapshots with full CRUD controls.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportLink format="json" />
          <ExportLink format="csv" />
        </div>
      </div>

      {records.length === 0 ? (
        <div className="mt-6 rounded-[28px] border border-dashed border-sky-300 bg-white/55 p-8 text-center text-slate-600 shadow-inner">
          <div className="weather-icon-bubble mx-auto h-20 w-20 rounded-3xl">
            <CloudSun className="h-10 w-10 text-sky-700" />
          </div>
          <p className="mt-4 font-semibold text-slate-950">
            No saved requests yet
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Save a weather lookup and it will appear here.
          </p>
        </div>
      ) : (
        <div className="saved-request-grid mt-6">
          {records.map((record) => (
            <article className="saved-request-card p-5" key={record.id}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  {editingId === record.id ? (
                    <input
                      value={editingLocation}
                      onChange={(event) =>
                        setEditingLocation(event.target.value)
                      }
                      className="input-surface"
                    />
                  ) : (
                    <>
                      <p className="truncate text-lg font-semibold text-slate-950">
                        {record.resolvedName}
                      </p>
                      <p className="mt-1 truncate text-xs font-medium text-slate-500">
                        Input: {record.inputLocation}
                      </p>
                    </>
                  )}
                </div>
                <div className="saved-request-icon-shell">
                  <WeatherIcon
                    className="h-9 w-9 text-white"
                    code={record.weatherData.current.weatherCode}
                  />
                </div>
              </div>

              <div className="mt-5 flex items-end justify-between gap-4">
                <div>
                  <p className="text-4xl font-semibold tracking-tight text-slate-950">
                    {formatTemperature(
                      record.weatherData.current.temperature,
                      temperatureUnit,
                    )}
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-600">
                    {record.weatherData.current.summary}
                  </p>
                </div>
                <div className="rounded-2xl bg-white/60 px-3 py-2 text-right shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Air
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-950">
                    {record.airQualityData?.label ?? "Unavailable"}
                  </p>
                </div>
              </div>

              {editingId === record.id ? (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Start
                    </span>
                    <input
                      value={editingStartDate}
                      onChange={(event) =>
                        setEditingStartDate(event.target.value)
                      }
                      type="date"
                      className="input-surface mt-2"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      End
                    </span>
                    <input
                      value={editingEndDate}
                      onChange={(event) =>
                        setEditingEndDate(event.target.value)
                      }
                      type="date"
                      className="input-surface mt-2"
                    />
                  </label>
                </div>
              ) : (
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="saved-request-metric">
                    <p>Date Range</p>
                    <strong>
                      {formatDate(record.startDate)} to {formatDate(record.endDate)}
                    </strong>
                  </div>
                  <div className="saved-request-metric">
                    <p>Updated</p>
                    <strong>{formatDateTime(record.updatedAt)}</strong>
                  </div>
                </div>
              )}

              <div className="mt-5 flex justify-end gap-2">
                {editingId === record.id ? (
                  <>
                    <button
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-700"
                      onClick={() => onUpdate(record.id)}
                      type="button"
                    >
                      <Save className="h-4 w-4" />
                      Save
                    </button>
                    <button
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/70 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white"
                      onClick={onCancelEdit}
                      type="button"
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/70 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white"
                      onClick={() => onEdit(record)}
                      type="button"
                    >
                      <Edit3 className="h-4 w-4" />
                      Edit
                    </button>
                    <button
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50/70 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                      onClick={() => onDelete(record.id)}
                      type="button"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function LocalTimeClock({ timezone }: { timezone?: string }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 60000);

    return () => window.clearInterval(interval);
  }, []);

  if (!timezone || !isValidTimeZone(timezone)) {
    return null;
  }

  return (
    <div className="mt-5 inline-flex items-center gap-3 rounded-3xl border border-white/20 bg-white/15 px-4 py-3 text-sky-50 shadow-lg shadow-slate-950/10 backdrop-blur">
      <div className="rounded-2xl bg-white/15 p-2">
        <Clock3 className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-100">
          Local time
        </p>
        <p className="mt-1 text-lg font-semibold text-white">
          {formatLocalTime(now, timezone)}
        </p>
        <p className="text-xs text-sky-100">{formatTimeZoneLabel(timezone)}</p>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  variant = "light",
}: {
  label: string;
  value: string;
  variant?: "light" | "dark";
}) {
  return (
    <div
      className={
        variant === "dark"
          ? "rounded-2xl border border-white/15 bg-white/15 px-3 py-2 backdrop-blur"
          : "rounded-2xl border border-white/70 bg-white/70 px-3 py-2 shadow-sm"
      }
    >
      <p
        className={`text-xs font-semibold uppercase tracking-wide ${
          variant === "dark" ? "text-sky-100" : "text-slate-500"
        }`}
      >
        {label}
      </p>
      <p className={`mt-1 font-semibold ${variant === "dark" ? "text-white" : "text-slate-950"}`}>
        {value}
      </p>
    </div>
  );
}

function ExportLink({ format }: { format: "json" | "csv" }) {
  return (
    <a
      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/70 bg-white/75 px-4 py-2.5 text-sm font-semibold text-indigo-900 shadow-sm transition hover:bg-white"
      href={`/api/weather-requests/export?format=${format}`}
    >
      <Download className="h-4 w-4" />
      {format.toUpperCase()}
    </a>
  );
}

function WeatherIcon({
  code,
  className,
}: {
  code: number | null;
  className?: string;
}) {
  if (code === 0 || code === 1) {
    return <Sun className={className} strokeWidth={1.8} />;
  }

  if (code === 2) {
    return <CloudSun className={className} strokeWidth={1.8} />;
  }

  if (code === 3) {
    return <Cloud className={className} strokeWidth={1.8} />;
  }

  if (code === 45 || code === 48) {
    return <CloudFog className={className} strokeWidth={1.8} />;
  }

  if (code !== null && code >= 51 && code <= 57) {
    return <CloudDrizzle className={className} strokeWidth={1.8} />;
  }

  if (
    code !== null &&
    ((code >= 61 && code <= 67) || (code >= 80 && code <= 82))
  ) {
    return <CloudRain className={className} strokeWidth={1.8} />;
  }

  if (
    code !== null &&
    ((code >= 71 && code <= 77) || code === 85 || code === 86)
  ) {
    return <CloudSnow className={className} strokeWidth={1.8} />;
  }

  if (code !== null && code >= 95) {
    return <CloudLightning className={className} strokeWidth={1.8} />;
  }

  return <CloudSun className={className} strokeWidth={1.8} />;
}

function forecastToneClass(code: number | null) {
  if (code === 0 || code === 1) {
    return "forecast-sun";
  }

  if (code === 2 || code === 3 || code === 45 || code === 48) {
    return "forecast-cloud";
  }

  if (
    code !== null &&
    ((code >= 51 && code <= 67) || (code >= 80 && code <= 82))
  ) {
    return "forecast-rain";
  }

  if (
    code !== null &&
    ((code >= 71 && code <= 77) || code === 85 || code === 86)
  ) {
    return "forecast-snow";
  }

  if (code !== null && code >= 95) {
    return "forecast-storm";
  }

  return "forecast-cloud";
}

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error ?? "Request failed.");
  }

  return data as T;
}

async function fetchDashboardWeather({
  location,
  locationType,
  coordinates,
  isCurrentLocation,
}: {
  location?: string;
  locationType: LocationInputType;
  coordinates: { latitude: number; longitude: number } | null;
  isCurrentLocation: boolean;
}) {
  if (coordinates) {
    const source = isCurrentLocation ? "&source=current" : "";

    return apiFetch<WeatherBundle>(
      `/api/weather/current?lat=${coordinates.latitude}&lon=${coordinates.longitude}${source}`,
    );
  }

  return apiFetch<WeatherBundle>(
    locationWeatherUrl(location ?? "", locationType),
  );
}

function locationWeatherUrl(value: string, inputType: LocationInputType) {
  const params = new URLSearchParams({
    location: value,
    locationType: inputType,
  });

  return `/api/weather/current?${params}`;
}

function coordinateWeatherUrl(value: string) {
  const { latitude, longitude } = parseCoordinates(value);

  return `/api/weather/current?lat=${latitude}&lon=${longitude}`;
}

function parseCoordinates(value: string) {
  const match = value
    .trim()
    .match(/^\s*(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)\s*$/);

  if (!match) {
    throw new Error("Enter GPS coordinates as latitude, longitude.");
  }

  const latitude = Number(match[1]);
  const longitude = Number(match[2]);

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new Error("GPS coordinates must use valid latitude and longitude.");
  }

  return { latitude, longitude };
}

function locationPlaceholder(type: LocationInputType) {
  switch (type) {
    case "zip":
      return "Example: 98101 or SW1A 1AA";
    case "coordinates":
      return "Example: 47.6062, -122.3321";
    case "landmark":
      return "Example: Space Needle";
    case "cityTown":
    default:
      return "Example: Seattle";
  }
}

function errorMessage(caught: unknown) {
  return caught instanceof Error ? caught.message : "Something went wrong.";
}

function successWeatherMessage(
  weather: WeatherBundle,
  inputType: LocationInputType,
) {
  if (inputType === "coordinates") {
    return `Showing weather for coordinates: ${weather.location.input}.`;
  }

  return `Showing weather for ${weather.location.name}.`;
}

function formatNumber(value: number | null) {
  return value === null ? "N/A" : Math.round(value).toString();
}

function formatTemperature(value: number | null, unit: TemperatureUnit) {
  if (value === null) {
    return "N/A";
  }

  const displayValue =
    unit === "fahrenheit" ? Math.round((value * 9) / 5 + 32) : Math.round(value);

  return `${displayValue}°${unit === "fahrenheit" ? "F" : "C"}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatLocalTime(value: Date, timezone: string) {
  return new Intl.DateTimeFormat("en", {
    timeZone: timezone,
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

function formatTimeZoneLabel(timezone: string) {
  return timezone.replaceAll("_", " ");
}

function isValidTimeZone(timezone: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}
