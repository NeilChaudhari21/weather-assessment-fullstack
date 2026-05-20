import { locationQuerySchema } from "@/lib/validation";
import {
  getWeatherBundleForCoordinates,
  getWeatherBundleForLocation,
} from "@/lib/weather";
import { jsonError } from "@/lib/records";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = locationQuerySchema.safeParse({
    location: searchParams.get("location") ?? undefined,
    lat: searchParams.get("lat") ?? undefined,
    lon: searchParams.get("lon") ?? undefined,
  });

  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid query.");
  }

  try {
    const { location, lat, lon } = parsed.data;

    if (location) {
      const bundle = await getWeatherBundleForLocation(location);
      return Response.json(bundle);
    }

    if (lat !== undefined && lon !== undefined) {
      const bundle = await getWeatherBundleForCoordinates(lat, lon, {
        isCurrentLocation: searchParams.get("source") === "current",
      });
      return Response.json(bundle);
    }

    return jsonError("Provide a location or coordinates.");
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Weather lookup failed.");
  }
}
