import { getLocationInsight } from "@/lib/location-insights";
import { jsonError } from "@/lib/records";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const location = searchParams.get("location")?.trim();
  const lat = searchParams.get("lat")?.trim();
  const lon = searchParams.get("lon")?.trim();
  const query = location || [lat, lon].filter(Boolean).join(", ");

  if (!query) {
    return jsonError("Provide a location or coordinates.");
  }

  const result = await getLocationInsight(query);

  return Response.json(result);
}
