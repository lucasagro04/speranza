export const revalidate = 60;

// Cache for last successful response
let cachedData: unknown = null;
let lastSuccessfulFetch = 0;

export async function GET() {
  const url = "https://metaforge.app/api/arc-raiders/events-schedule";

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; ArcTimers/1.0; +https://github.com/arc-timers)",
      },
      signal: controller.signal,
      next: { revalidate: 60 },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      // Cache successful response
      cachedData = data;
      lastSuccessfulFetch = Date.now();
      return Response.json(data);
    }

    // If fetch failed but we have cached data less than 5 minutes old, use it
    if (cachedData && Date.now() - lastSuccessfulFetch < 5 * 60 * 1000) {
      console.log('Using cached events data due to API failure');
      return Response.json(cachedData);
    }

    // No cache available, return error
    return Response.json(
      { error: "MetaForge API temporarily unavailable", status: res.status, data: [] },
      { status: 200 } // Return 200 with empty data instead of 500
    );
  } catch (error) {
    console.error("Events API error:", error);

    // Return cached data if available
    if (cachedData && Date.now() - lastSuccessfulFetch < 5 * 60 * 1000) {
      console.log("Using cached events data due to network error");
      return Response.json(cachedData);
    }

    // No cache, return empty state
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return Response.json(
      { error: "Network error", message, data: [] },
      { status: 200 }
    );
  }
}
