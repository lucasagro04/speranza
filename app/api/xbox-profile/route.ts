import { NextResponse } from "next/server";

const OPENXBL_BASE = "https://xbl.io/api/v2";

/** Response from OpenXBL /search/{gamertag} - people array item */
interface OpenXBLPerson {
  xuid?: string;
  gamertag?: string;
  displayPicRaw?: string;
  gamerscore?: string;
  presenceState?: string;
  presenceText?: string;
  modernGamertag?: string;
  uniqueModernGamertag?: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const gamertag = searchParams.get("gamertag")?.trim();
  const apiKey = process.env.OPENXBL_API_KEY;

  if (!gamertag) {
    return NextResponse.json(
      { success: false, error: "Missing gamertag" },
      { status: 400 }
    );
  }

  if (!apiKey) {
    return NextResponse.json(
      {
        success: false,
        error: "Xbox profile lookup is not configured. Add OPENXBL_API_KEY to enable it.",
      },
      { status: 503 }
    );
  }

  try {
    const searchRes = await fetch(
      `${OPENXBL_BASE}/search/${encodeURIComponent(gamertag)}`,
      {
        headers: { "X-Authorization": apiKey },
        next: { revalidate: 300 },
      }
    );

    if (!searchRes.ok) {
      const text = await searchRes.text();
      return NextResponse.json(
        {
          success: false,
          error: searchRes.status === 404 ? "Gamertag not found" : `Xbox API error: ${searchRes.status}`,
        },
        { status: searchRes.status === 404 ? 404 : 502 }
      );
    }

    const searchData = (await searchRes.json()) as { people?: OpenXBLPerson[] };
    const people = searchData?.people ?? [];
    const exact = people.find(
      (p) => p.gamertag?.toLowerCase() === gamertag.toLowerCase()
    );
    const person = exact ?? people[0];

    if (!person?.xuid) {
      return NextResponse.json(
        { success: false, error: "Gamertag not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      profile: {
        xuid: person.xuid,
        gamertag: person.gamertag ?? person.modernGamertag ?? gamertag,
        displayPicRaw: person.displayPicRaw,
        gamerscore: person.gamerscore ? parseInt(person.gamerscore, 10) : 0,
        presenceState: person.presenceState ?? null,
        presenceText: person.presenceText ?? null,
      },
    });
  } catch (e) {
    console.error("Xbox profile API error:", e);
    return NextResponse.json(
      { success: false, error: "Failed to fetch Xbox profile" },
      { status: 500 }
    );
  }
}
