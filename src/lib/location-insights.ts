import type { LocationInsight } from "./types";
import type { LocationInputType } from "./weather";

const wikiSearchUrl = "https://en.wikipedia.org/w/api.php";
const wikiSummaryUrl = "https://en.wikipedia.org/api/rest_v1/page/summary";
const nominatimReverseUrl = "https://nominatim.openstreetmap.org/reverse";

export type WikimediaSearchResponse = {
  query?: {
    search?: WikimediaSearchPage[];
  };
};

export type WikimediaSearchPage = {
  title?: string;
  snippet?: string;
};

export type WikimediaSummaryResponse = {
  title?: string;
  description?: string;
  extract?: string;
  content_urls?: {
    desktop?: {
      page?: string;
    };
  };
  thumbnail?: {
    source?: string;
  };
};

type NominatimReverseResponse = {
  error?: string;
  name?: string;
  display_name?: string;
  addresstype?: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    hamlet?: string;
    municipality?: string;
    county?: string;
    state?: string;
    country?: string;
    ocean?: string;
    sea?: string;
    bay?: string;
  };
};

export async function getLocationInsight(
  query: string,
  options: { locationType?: LocationInputType | "current" } = {},
) {
  const cleanQuery = normalizeInsightQuery(query, options.locationType);

  if (!cleanQuery) {
    return {
      insight: null,
      message: "No location insight query was provided.",
    };
  }

  try {
    if (options.locationType === "cityTown") {
      const direct = await getDirectPageInsight(cleanQuery);

      if (direct.insight) {
        return direct;
      }
    }

    const searchParams = new URLSearchParams({
      action: "query",
      list: "search",
      srsearch: cleanQuery,
      srlimit: "1",
      format: "json",
      origin: "*",
    });
    const search = await getJson<WikimediaSearchResponse>(
      `${wikiSearchUrl}?${searchParams}`,
    );
    const firstPage = search.query?.search?.[0];

    if (!firstPage?.title) {
      return {
        insight: null,
        message: `No Wikimedia insight was found for ${cleanQuery}.`,
      };
    }

    const summary = await getJson<WikimediaSummaryResponse>(
      `${wikiSummaryUrl}/${encodeURIComponent(firstPage.title)}`,
    );

    return {
      insight: normalizeWikimediaInsight(firstPage, summary),
      message: null,
    };
  } catch {
    return {
      insight: null,
      message: "Location insights are unavailable right now.",
    };
  }
}

export async function getCoordinateLocationInsight(
  latitude: number,
  longitude: number,
) {
  const query = await getCoordinateInsightQuery(latitude, longitude);

  return getLocationInsight(query);
}

export async function getCoordinateInsightQuery(
  latitude: number,
  longitude: number,
) {
  const reverse = await reverseGeocodeCoordinates(latitude, longitude);

  if (reverse) {
    return reverse;
  }

  return determineOcean(latitude, longitude);
}

export function normalizeWikimediaInsight(
  page: WikimediaSearchPage,
  summary?: WikimediaSummaryResponse,
): LocationInsight | null {
  const title = summary?.title ?? page.title;

  if (!title) {
    return null;
  }

  return {
    title,
    description: summary?.description ?? null,
    summary: summary?.extract ?? stripHtml(page.snippet) ?? null,
    thumbnailUrl: summary?.thumbnail?.source ?? null,
    pageUrl:
      summary?.content_urls?.desktop?.page ??
      `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replaceAll(" ", "_"))}`,
    source: "Wikimedia",
  };
}

export function normalizeInsightQuery(
  query: string,
  locationType?: LocationInputType | "current",
) {
  const cleaned = query
    .replace(/^Current location\s*/i, "")
    .replace(/[()]/g, "")
    .trim();

  if (locationType === "cityTown" || locationType === "zip") {
    return cleaned.split(",")[0]?.trim() ?? cleaned;
  }

  if (locationType === "landmark") {
    return cleaned.split(",")[0]?.trim() ?? cleaned;
  }

  return cleaned.split(",").slice(0, 3).join(",").trim();
}

async function getDirectPageInsight(query: string) {
  try {
    const summary = await getJson<WikimediaSummaryResponse>(
      `${wikiSummaryUrl}/${encodeURIComponent(query)}`,
    );

    return {
      insight: normalizeWikimediaInsight({ title: query }, summary),
      message: null,
    };
  } catch {
    return {
      insight: null,
      message: null,
    };
  }
}

function stripHtml(value: string | undefined) {
  return value?.replace(/<[^>]*>/g, "").trim() || null;
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    next: { revalidate: 3600 },
    headers: {
      accept: "application/json",
      "api-user-agent":
        "weather-assessment-fullstack/1.0 (https://github.com/NeilChaudhari21/weather-assessment-fullstack)",
    },
  });

  if (!response.ok) {
    throw new Error(`Wikimedia request failed with ${response.status}.`);
  }

  return response.json() as Promise<T>;
}

async function getNominatimJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    next: { revalidate: 3600 },
    headers: {
      accept: "application/json",
      "user-agent":
        "weather-assessment-fullstack/1.0 (https://github.com/NeilChaudhari21/weather-assessment-fullstack)",
      referer: "https://github.com/NeilChaudhari21/weather-assessment-fullstack",
    },
  });

  if (!response.ok) {
    throw new Error(`Nominatim request failed with ${response.status}.`);
  }

  return response.json() as Promise<T>;
}

async function reverseGeocodeCoordinates(latitude: number, longitude: number) {
  const params = new URLSearchParams({
    format: "jsonv2",
    lat: String(latitude),
    lon: String(longitude),
    zoom: "10",
    addressdetails: "1",
  });

  try {
    const data = await getNominatimJson<NominatimReverseResponse>(
      `${nominatimReverseUrl}?${params}`,
    );

    if (data.error) {
      return null;
    }

    const address = data.address ?? {};

    return (
      address.ocean ??
      address.sea ??
      address.bay ??
      address.city ??
      address.town ??
      address.village ??
      address.hamlet ??
      address.municipality ??
      data.name ??
      data.display_name?.split(",")[0]?.trim() ??
      null
    );
  } catch {
    return null;
  }
}

export function determineOcean(latitude: number, longitude: number) {
  const normalizedLongitude = normalizeLongitude(longitude);

  if (latitude >= 66.5) {
    return "Arctic Ocean";
  }

  if (latitude <= -60) {
    return "Southern Ocean";
  }

  if (normalizedLongitude >= 20 && normalizedLongitude < 120 && latitude < 30) {
    return "Indian Ocean";
  }

  if (normalizedLongitude > -70 && normalizedLongitude < 20) {
    return "Atlantic Ocean";
  }

  return "Pacific Ocean";
}

function normalizeLongitude(longitude: number) {
  return ((((longitude + 180) % 360) + 360) % 360) - 180;
}
