import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 60; // Revalidate every 60 seconds

// Favorite streamers list
const FAVORITE_STREAMERS = [
  "lululuvely",
  "tfue",
  "ninja",
  "theburntpeanut",
  "nickmercs",
  "cloakzy",
  "hutchmf",
];

type TwitchStream = {
  id: string;
  user_id: string;
  user_login: string;
  user_name: string;
  game_id: string;
  game_name: string;
  type: string;
  title: string;
  viewer_count: number;
  started_at: string;
  language: string;
  thumbnail_url: string;
  tag_ids: string[];
  is_mature: boolean;
};

type TwitchTokenResponse = {
  access_token: string;
  expires_in: number;
  token_type: string;
};

async function getTwitchAccessToken(): Promise<string | null> {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error("Missing Twitch credentials");
    return null;
  }

  try {
    const response = await fetch(
      `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`,
      { method: "POST" }
    );

    if (!response.ok) {
      console.error("Failed to get Twitch access token:", response.status);
      return null;
    }

    const data: TwitchTokenResponse = await response.json();
    return data.access_token;
  } catch (error) {
    console.error("Error getting Twitch access token:", error);
    return null;
  }
}

export async function GET() {
  const clientId = process.env.TWITCH_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json(
      { error: "Twitch API not configured", streamers: [] },
      { status: 200 }
    );
  }

  try {
    // Get access token
    const accessToken = await getTwitchAccessToken();
    if (!accessToken) {
      return NextResponse.json(
        { error: "Failed to authenticate with Twitch", streamers: [] },
        { status: 200 }
      );
    }

    // Get user info for all favorite streamers
    const userLogins = FAVORITE_STREAMERS.join("&login=");
    const usersResponse = await fetch(
      `https://api.twitch.tv/helix/users?login=${userLogins}`,
      {
        headers: {
          "Client-ID": clientId,
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!usersResponse.ok) {
      console.error("Failed to fetch Twitch users:", usersResponse.status);
      return NextResponse.json(
        { error: "Failed to fetch users", streamers: [] },
        { status: 200 }
      );
    }

    const usersData = await usersResponse.json();
    const users = usersData.data || [];

    // Get streams for favorite streamers
    const streamUserLogins = FAVORITE_STREAMERS.join("&user_login=");
    const streamsResponse = await fetch(
      `https://api.twitch.tv/helix/streams?user_login=${streamUserLogins}&first=100`,
      {
        headers: {
          "Client-ID": clientId,
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!streamsResponse.ok) {
      console.error("Failed to fetch Twitch streams:", streamsResponse.status);
      return NextResponse.json(
        { error: "Failed to fetch streams", streamers: [] },
        { status: 200 }
      );
    }

    const streamsData = (await streamsResponse.json()) as {
      data?: TwitchStream[];
    };
    const allStreams: TwitchStream[] = streamsData.data || [];

    // Create a map of live streams
    const liveStreamsMap = new Map(
      allStreams.map((stream) => [stream.user_login.toLowerCase(), stream])
    );

    // Format all streamers (online and offline)
    const formattedStreamers = users.map(
      (user: {
        id: string;
        display_name: string;
        login: string;
        profile_image_url: string;
      }) => {
      const liveStream = liveStreamsMap.get(user.login.toLowerCase());
      const isLive = !!liveStream;

      console.log(
        `${user.display_name} (${user.login}): ${isLive ? "LIVE" : "OFFLINE"}`
      );

      if (isLive && liveStream) {
        return {
          id: user.id,
          userName: user.display_name,
          userLogin: user.login,
          profileImageUrl: user.profile_image_url,
          isLive: true,
          title: liveStream.title,
          viewerCount: liveStream.viewer_count,
          thumbnailUrl: liveStream.thumbnail_url
            .replace("{width}", "640")
            .replace("{height}", "360"),
          gameName: liveStream.game_name,
          startedAt: liveStream.started_at,
          url: `https://twitch.tv/${user.login}`,
        };
      }

      // Offline streamer
      return {
        id: user.id,
        userName: user.display_name,
        userLogin: user.login,
        profileImageUrl: user.profile_image_url,
        isLive: false,
        title: null,
        viewerCount: 0,
        thumbnailUrl: null,
        gameName: null,
        startedAt: null,
        url: `https://twitch.tv/${user.login}`,
      };
    });

    // Sort: live streams first (by viewer count descending), then offline
    formattedStreamers.sort((a, b) => {
      // Both live - sort by viewer count (highest first)
      if (a.isLive && b.isLive) {
        return b.viewerCount - a.viewerCount;
      }
      // One live, one offline - live comes first
      if (a.isLive && !b.isLive) return -1;
      if (!a.isLive && b.isLive) return 1;
      // Both offline - keep original order
      return 0;
    });

    return NextResponse.json({
      success: true,
      streamers: formattedStreamers,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching Twitch streamers:", error);
    return NextResponse.json(
      { error: "Internal server error", streamers: [] },
      { status: 200 }
    );
  }
}
