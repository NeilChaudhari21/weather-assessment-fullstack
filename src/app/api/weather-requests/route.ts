import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonError, serializeWeatherRequest } from "@/lib/records";
import { getWeatherSessionId } from "@/lib/session";
import {
  parseDateOnly,
  validateDateRange,
  weatherRequestSchema,
} from "@/lib/validation";
import {
  getWeatherBundleForCoordinates,
  getWeatherBundleForLocation,
} from "@/lib/weather";

function savedResolvedName(inputLocation: string | undefined, weatherName: string) {
  return inputLocation?.trim() || weatherName;
}

export async function GET() {
  const sessionId = await getWeatherSessionId();
  const records = await prisma.weatherRequest.findMany({
    where: { sessionId },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(records.map(serializeWeatherRequest));
}

export async function POST(request: Request) {
  const sessionId = await getWeatherSessionId();
  const body = await request.json().catch(() => null);
  const parsed = weatherRequestSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid request.");
  }

  try {
    validateDateRange(parsed.data.startDate, parsed.data.endDate);
    const weather =
      parsed.data.latitude !== undefined && parsed.data.longitude !== undefined
        ? await getWeatherBundleForCoordinates(
            parsed.data.latitude,
            parsed.data.longitude,
            {
              startDate: parsed.data.startDate,
              endDate: parsed.data.endDate,
              isCurrentLocation: parsed.data.isCurrentLocation,
            },
          )
        : await getWeatherBundleForLocation(parsed.data.location ?? "", {
            startDate: parsed.data.startDate,
            endDate: parsed.data.endDate,
            locationType: parsed.data.locationType,
          });
    const savedInputLocation =
      parsed.data.isCurrentLocation
        ? "Current location"
        : parsed.data.location?.trim() || weather.location.input;
    const record = await prisma.weatherRequest.create({
      data: {
        sessionId,
        inputLocation: savedInputLocation,
        resolvedName:
          parsed.data.locationType === "landmark"
            ? savedResolvedName(parsed.data.location, weather.location.name)
            : weather.location.name,
        latitude: weather.location.latitude,
        longitude: weather.location.longitude,
        startDate: parseDateOnly(parsed.data.startDate),
        endDate: parseDateOnly(parsed.data.endDate),
        weatherData: weather as unknown as Prisma.InputJsonValue,
        airQualityData:
          weather.airQuality === null
            ? Prisma.JsonNull
            : (weather.airQuality as unknown as Prisma.InputJsonValue),
      },
    });

    return Response.json(serializeWeatherRequest(record), { status: 201 });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Could not save weather request.",
    );
  }
}
