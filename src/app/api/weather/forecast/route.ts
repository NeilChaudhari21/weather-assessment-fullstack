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
    const bundle = location
      ? await getWeatherBundleForLocation(location)
      : lat !== undefined && lon !== undefined
        ? await getWeatherBundleForCoordinates(lat, lon)
        : null;

    if (!bundle) {
      return jsonError("Provide a location or coordinates.");
    }

    return Response.json({
      location: bundle.location,
      forecast: bundle.forecast,
      airQuality: bundle.airQuality,
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Forecast lookup failed.");
  }
}
