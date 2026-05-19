import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonError, serializeWeatherRequest } from "@/lib/records";
import {
  parseDateOnly,
  validateDateRange,
  weatherRequestSchema,
} from "@/lib/validation";
import {
  getWeatherBundleForCoordinates,
  getWeatherBundleForLocation,
} from "@/lib/weather";

export async function GET() {
  const records = await prisma.weatherRequest.findMany({
    orderBy: { createdAt: "desc" },
  });

  return Response.json(records.map(serializeWeatherRequest));
}

export async function POST(request: Request) {
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
            },
          )
        : await getWeatherBundleForLocation(parsed.data.location ?? "", {
            startDate: parsed.data.startDate,
            endDate: parsed.data.endDate,
          });
    const record = await prisma.weatherRequest.create({
      data: {
        inputLocation: parsed.data.location?.trim() || weather.location.input,
        resolvedName: weather.location.name,
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
