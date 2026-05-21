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
    if (shouldTryDirectPageInsight(cleanQuery, options.locationType)) {
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

  if (locationType === "zip") {
    return normalizePostalInsightQuery(cleaned);
  }

  if (locationType === "cityTown") {
    return normalizePlaceInsightQuery(cleaned);
  }

  if (locationType === "landmark") {
    return cleaned.split(",")[0]?.trim() ?? cleaned;
  }

  return cleaned.split(",").slice(0, 3).join(",").trim();
}

function normalizePostalInsightQuery(query: string) {
  const parts = query
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const placeParts = parts.filter(
    (part) => !isPostalCodeLike(part) && !isCountyLike(part),
  );

  return formatPlaceWithRegion(placeParts) ?? parts[0] ?? query;
}

function normalizePlaceInsightQuery(query: string) {
  const parts = query
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => !isCountyLike(part));

  return formatPlaceWithRegion(parts) ?? query;
}

function formatPlaceWithRegion(parts: string[]) {
  const [place, region] = parts;

  if (!place) {
    return null;
  }

  return region ? `${place}, ${region}` : place;
}

function shouldTryDirectPageInsight(
  query: string,
  locationType?: LocationInputType | "current",
) {
  return locationType === "cityTown" || locationType === "zip" || query.includes(",");
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

function isPostalCodeLike(value: string) {
  const normalized = value.trim();

  if (!normalized || normalized.length > 12) {
    return false;
  }

  return /^(?=.*\d)[a-z0-9][a-z0-9 -]{2,10}[a-z0-9]$/i.test(normalized);
}

function isCountyLike(value: string) {
  return /\bcounty\b/i.test(value.trim());
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

    const waterPlace = address.ocean ?? address.sea ?? address.bay;

    if (waterPlace) {
      return waterPlace;
    }

    const landPlace =
      address.city ??
      address.town ??
      address.village ??
      address.hamlet ??
      address.municipality ??
      data.name ??
      data.display_name?.split(",")[0]?.trim();

    return formatPlaceWithRegion(
      [landPlace, address.state ?? address.country].filter(
        (part): part is string => Boolean(part),
      ),
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
