"use client";

import dynamic from "next/dynamic";
import {
  CloudSun,
  Download,
  Edit3,
  Loader2,
  LocateFixed,
  MapPin,
  Newspaper,
  Save,
  Search,
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
const candidateName = process.env.NEXT_PUBLIC_CANDIDATE_NAME ?? "Neil C.";
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
    <main className="min-h-screen bg-[#f6f8f4] text-stone-950">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-stone-200 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Full-stack assessment
            </p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight text-stone-950">
              {appName}
            </h1>
          </div>
          <div className="rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700 shadow-sm">
            Built by <span className="font-semibold text-stone-950">{candidateName}</span>
          </div>
        </header>

        <section className="grid gap-5 lg:grid-cols-[380px_1fr]">
          <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <CloudSun className="h-5 w-5 text-emerald-700" />
              <h2 className="text-xl font-semibold">Weather Lookup</h2>
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
                  className="mt-2 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
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
                  className="mt-2 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-[1fr_1.45fr]">
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
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
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-stone-300 px-4 py-2 font-semibold text-stone-800 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60"
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

            <div className="mt-6 border-t border-stone-200 pt-5">
              <p className="text-sm font-medium text-stone-700">
                Temperature unit
              </p>
              <div className="mt-2 grid grid-cols-2 rounded-lg border border-stone-300 bg-stone-100 p-1">
                <button
                  className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                    temperatureUnit === "celsius"
                      ? "bg-white text-stone-950 shadow-sm"
                      : "text-stone-600 hover:text-stone-950"
                  }`}
                  onClick={() => setTemperatureUnit("celsius")}
                  type="button"
                >
                  Celsius
                </button>
                <button
                  className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                    temperatureUnit === "fahrenheit"
                      ? "bg-white text-stone-950 shadow-sm"
                      : "text-stone-600 hover:text-stone-950"
                  }`}
                  onClick={() => setTemperatureUnit("fahrenheit")}
                  type="button"
                >
                  Fahrenheit
                </button>
              </div>
            </div>

            <form className="mt-6 space-y-4 border-t border-stone-200 pt-5" onSubmit={handleSave}>
              <h3 className="font-semibold">Save Weather Request</h3>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-sm font-medium text-stone-700">Start</span>
                  <input
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                    type="date"
                    className="mt-2 w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-stone-700">End</span>
                  <input
                    value={endDate}
                    onChange={(event) => setEndDate(event.target.value)}
                    type="date"
                    className="mt-2 w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  />
                </label>
              </div>
              <button
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-stone-950 px-4 py-2 font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
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
                className={`mt-5 rounded-lg border px-3 py-2 text-sm ${
                  error
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-800"
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

        <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold">Assessment Info</h2>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-stone-700">
            This submission completes both Tech Assessment #1 and Tech Assessment
            #2. It includes a JavaScript frontend, backend API routes, database
            CRUD, validation, live weather API integration, air-quality API
            integration, JSON/CSV export, and deployment-ready Vercel/Neon
            configuration.
          </p>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-stone-700">
            Product Manager Accelerator supports professionals building product
            management skills through community, education, and practical career
            development. Confirm the exact company description from PM
            Accelerator&apos;s LinkedIn page before final submission.
          </p>
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
      <section className="flex min-h-[520px] items-center justify-center rounded-lg border border-dashed border-stone-300 bg-white p-6 text-center shadow-sm">
        <div>
          <CloudSun className="mx-auto h-12 w-12 text-emerald-700" />
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
        <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                <MapPin className="h-4 w-4" />
                {weather.location.name}
              </div>
              <h2 className="mt-3 text-5xl font-semibold">
                {formatTemperature(weather.current.temperature, temperatureUnit)}
              </h2>
              <p className="mt-2 text-lg text-stone-700">
                {weather.current.summary}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm sm:min-w-64">
              <Metric
                label="Feels"
                value={formatTemperature(
                  weather.current.apparentTemperature,
                  temperatureUnit,
                )}
              />
              <Metric label="Humidity" value={`${formatNumber(weather.current.humidity)}%`} />
              <Metric label="Wind" value={`${formatNumber(weather.current.windSpeed)} km/h`} />
              <Metric label="Rain" value={`${formatNumber(weather.current.precipitation)} mm`} />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold">5-Day Forecast</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {weather.forecast.slice(0, 5).map((day) => (
              <div
                className="rounded-lg border border-stone-200 bg-[#fbfcf8] p-3"
                key={day.date}
              >
                <p className="text-sm font-semibold text-stone-950">
                  {formatDate(day.date)}
                </p>
                <p className="mt-2 min-h-10 text-sm text-stone-600">
                  {day.summary}
                </p>
                <p className="mt-3 text-lg font-semibold">
                  {formatTemperature(day.temperatureMax, temperatureUnit)} /{" "}
                  {formatTemperature(day.temperatureMin, temperatureUnit)}
                </p>
                <p className="mt-1 text-xs text-stone-500">
                  {formatNumber(day.precipitationSum)} mm rain
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <aside className="space-y-5">
        <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Newspaper className="h-5 w-5 text-emerald-700" />
            <h2 className="text-xl font-semibold">Location Insights</h2>
          </div>
          {isInsightLoading ? (
            <div className="mt-4 flex items-center gap-2 text-sm text-stone-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading Wikimedia insight
            </div>
          ) : insight ? (
            <div className="mt-4 space-y-3">
              {insight.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt=""
                  className="h-32 w-full rounded-lg object-cover"
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
                  className="inline-flex text-sm font-semibold text-emerald-700 hover:text-emerald-900"
                  href={insight.pageUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  View on {insight.source}
                </a>
              ) : null}
            </div>
          ) : (
            <p className="mt-3 text-sm leading-6 text-stone-600">
              {insightMessage || "No Wikimedia insight found for this location."}
            </p>
          )}
        </div>

        <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold">Air Quality</h2>
          {weather.airQuality ? (
            <div className="mt-4 space-y-3">
              <p className="text-4xl font-semibold">{weather.airQuality.usAqi ?? "N/A"}</p>
              <p className="text-stone-700">{weather.airQuality.label}</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Metric label="PM2.5" value={`${formatNumber(weather.airQuality.pm25)} µg/m³`} />
                <Metric label="PM10" value={`${formatNumber(weather.airQuality.pm10)} µg/m³`} />
                <Metric label="Ozone" value={`${formatNumber(weather.airQuality.ozone)} µg/m³`} />
                <Metric label="NO₂" value={`${formatNumber(weather.airQuality.nitrogenDioxide)} µg/m³`} />
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-stone-600">
              Air-quality data is unavailable for this location right now.
            </p>
          )}
        </div>

        <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">Map</h2>
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
    <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Saved Weather Requests</h2>
          <p className="mt-1 text-sm text-stone-600">
            Database-backed CRUD records from Neon Postgres.
          </p>
        </div>
        <div className="flex gap-2">
          <ExportLink format="json" />
          <ExportLink format="csv" />
        </div>
      </div>

      {records.length === 0 ? (
        <div className="mt-5 rounded-lg border border-dashed border-stone-300 p-8 text-center text-stone-600">
          No saved requests yet. Save one from the search panel.
        </div>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-stone-600">
                <th className="py-3 pr-3 font-semibold">Location</th>
                <th className="py-3 pr-3 font-semibold">Date Range</th>
                <th className="py-3 pr-3 font-semibold">Current</th>
                <th className="py-3 pr-3 font-semibold">Air</th>
                <th className="py-3 pr-3 font-semibold">Updated</th>
                <th className="py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr className="border-b border-stone-100 align-top" key={record.id}>
                  <td className="py-3 pr-3">
                    {editingId === record.id ? (
                      <input
                        value={editingLocation}
                        onChange={(event) =>
                          setEditingLocation(event.target.value)
                        }
                        className="w-full rounded-lg border border-stone-300 px-2 py-1 outline-none focus:border-emerald-600"
                      />
                    ) : (
                      <>
                        <p className="font-semibold">{record.resolvedName}</p>
                        <p className="text-xs text-stone-500">
                          Input: {record.inputLocation}
                        </p>
                      </>
                    )}
                  </td>
                  <td className="py-3 pr-3">
                    {editingId === record.id ? (
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          value={editingStartDate}
                          onChange={(event) =>
                            setEditingStartDate(event.target.value)
                          }
                          type="date"
                          className="rounded-lg border border-stone-300 px-2 py-1 outline-none focus:border-emerald-600"
                        />
                        <input
                          value={editingEndDate}
                          onChange={(event) =>
                            setEditingEndDate(event.target.value)
                          }
                          type="date"
                          className="rounded-lg border border-stone-300 px-2 py-1 outline-none focus:border-emerald-600"
                        />
                      </div>
                    ) : (
                      `${record.startDate} to ${record.endDate}`
                    )}
                  </td>
                  <td className="py-3 pr-3">
                    {formatTemperature(
                      record.weatherData.current.temperature,
                      temperatureUnit,
                    )}
                    ,{" "}
                    {record.weatherData.current.summary}
                  </td>
                  <td className="py-3 pr-3">
                    {record.airQualityData?.label ?? "Unavailable"}
                  </td>
                  <td className="py-3 pr-3">{formatDateTime(record.updatedAt)}</td>
                  <td className="py-3 text-right">
                    {editingId === record.id ? (
                      <div className="flex justify-end gap-2">
                        <button
                          className="rounded-lg bg-emerald-700 p-2 text-white hover:bg-emerald-800"
                          onClick={() => onUpdate(record.id)}
                          title="Save changes"
                          type="button"
                        >
                          <Save className="h-4 w-4" />
                        </button>
                        <button
                          className="rounded-lg border border-stone-300 p-2 hover:bg-stone-100"
                          onClick={onCancelEdit}
                          title="Cancel edit"
                          type="button"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-2">
                        <button
                          className="rounded-lg border border-stone-300 p-2 hover:bg-stone-100"
                          onClick={() => onEdit(record)}
                          title="Edit record"
                          type="button"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          className="rounded-lg border border-red-200 p-2 text-red-700 hover:bg-red-50"
                          onClick={() => onDelete(record.id)}
                          title="Delete record"
                          type="button"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-stone-100 px-3 py-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
        {label}
      </p>
      <p className="mt-1 font-semibold text-stone-950">{value}</p>
    </div>
  );
}

function ExportLink({ format }: { format: "json" | "csv" }) {
  return (
    <a
      className="inline-flex items-center justify-center gap-2 rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-800 transition hover:bg-stone-100"
      href={`/api/weather-requests/export?format=${format}`}
    >
      <Download className="h-4 w-4" />
      {format.toUpperCase()}
    </a>
  );
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
