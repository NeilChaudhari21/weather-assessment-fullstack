import { weatherRequestsToCsv } from "@/lib/export";
import { prisma } from "@/lib/prisma";
import { jsonError, serializeWeatherRequest } from "@/lib/records";
import { getWeatherSessionId } from "@/lib/session";

export async function GET(request: Request) {
  const sessionId = await getWeatherSessionId();
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") ?? "json";
  const records = (
    await prisma.weatherRequest.findMany({
      where: { sessionId },
      orderBy: { createdAt: "desc" },
    })
  ).map(serializeWeatherRequest);

  if (format === "json") {
    return Response.json(records, {
      headers: {
        "content-disposition": 'attachment; filename="weather-requests.json"',
      },
    });
  }

  if (format === "csv") {
    return new Response(weatherRequestsToCsv(records), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": 'attachment; filename="weather-requests.csv"',
      },
    });
  }

  return jsonError("Unsupported export format. Use json or csv.");
}
