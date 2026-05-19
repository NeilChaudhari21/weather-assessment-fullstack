import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonError, serializeWeatherRequest } from "@/lib/records";
import {
  parseDateOnly,
  validateDateRange,
  weatherRequestSchema,
} from "@/lib/validation";
import { getWeatherBundleForLocation } from "@/lib/weather";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const record = await prisma.weatherRequest.findUnique({ where: { id } });

  if (!record) {
    return jsonError("Weather request not found.", 404);
  }

  return Response.json(serializeWeatherRequest(record));
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = weatherRequestSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid request.");
  }

  try {
    validateDateRange(parsed.data.startDate, parsed.data.endDate);
    const existing = await prisma.weatherRequest.findUnique({ where: { id } });

    if (!existing) {
      return jsonError("Weather request not found.", 404);
    }

    const weather = await getWeatherBundleForLocation(parsed.data.location, {
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
    });
    const record = await prisma.weatherRequest.update({
      where: { id },
      data: {
        inputLocation: parsed.data.location,
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

    return Response.json(serializeWeatherRequest(record));
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Could not update weather request.",
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    await prisma.weatherRequest.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch {
    return jsonError("Weather request not found.", 404);
  }
}
