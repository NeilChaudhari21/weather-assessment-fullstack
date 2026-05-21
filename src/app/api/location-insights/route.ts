import {
  getCoordinateLocationInsight,
  getLocationInsight,
} from "@/lib/location-insights";
import { jsonError } from "@/lib/records";
import type { LocationInputType } from "@/lib/weather";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const location = searchParams.get("location")?.trim();
  const locationType = parseInsightLocationType(searchParams.get("locationType"));
  const lat = searchParams.get("lat")?.trim();
  const lon = searchParams.get("lon")?.trim();
  const latitude = lat ? Number(lat) : null;
  const longitude = lon ? Number(lon) : null;

  if (
    latitude !== null &&
    longitude !== null &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    shouldUseCoordinateInsight(location)
  ) {
    const result = await getCoordinateLocationInsight(latitude, longitude);

    return Response.json(result);
  }

  const query = location || [lat, lon].filter(Boolean).join(", ");

  if (!query) {
    return jsonError("Provide a location or coordinates.");
  }

  const result = await getLocationInsight(query, { locationType });

  return Response.json(result);
}

function shouldUseCoordinateInsight(location: string | undefined) {
  if (!location) {
    return true;
  }

  return (
    /^current location/i.test(location) ||
    /^-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?$/.test(location)
  );
}

function parseInsightLocationType(value: string | null) {
  const allowed = new Set(["cityTown", "zip", "coordinates", "landmark"]);

  return allowed.has(value ?? "") ? (value as LocationInputType) : undefined;
}
