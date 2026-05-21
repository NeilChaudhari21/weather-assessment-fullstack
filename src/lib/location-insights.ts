import type { LocationInsight } from "./types";

const wikiSearchUrl = "https://en.wikipedia.org/w/api.php";
const wikiSummaryUrl = "https://en.wikipedia.org/api/rest_v1/page/summary";

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

export async function getLocationInsight(query: string) {
  const cleanQuery = normalizeInsightQuery(query);

  if (!cleanQuery) {
    return {
      insight: null,
      message: "No location insight query was provided.",
    };
  }

  try {
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

function normalizeInsightQuery(query: string) {
  return query
    .replace(/^Current location\s*/i, "")
    .replace(/[()]/g, "")
    .split(",")
    .slice(0, 3)
    .join(",")
    .trim();
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
