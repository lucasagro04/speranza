export const revalidate = 300; // Cache for 5 minutes

interface Tweet {
  account: string;
  handle: string;
  text: string;
  timestamp: string;
  url: string;
  avatar: string;
  media?: string[];
}

const ACCOUNTS = [
  { handle: "ARCRaidersGame", name: "Arc Raiders", color: "blue" },
  { handle: "ARCRaidersNews", name: "Arc Raiders News", color: "purple" },
  { handle: "ARCRaidersMedia", name: "Arc Raiders Media", color: "green" },
  { handle: "ARCoholicHQ", name: "ARCoholic HQ", color: "orange" },
];

// Fetch tweets using client-side widget data (they load in browser)
// This returns account info so the frontend can load embedded timelines
async function getTwitterAccountsForWidget() {
  // Return account configuration for widget loading
  return ACCOUNTS.map((account) => ({
    ...account,
    widgetReady: true,
  }));
}

// Fallback tweets
function getFallbackTweets(): Tweet[] {
  return [
    {
      account: "Arc Raiders",
      handle: "ARCRaidersGame",
      text: "🎮 Live now! Join the action in Arc Raiders. Check out the latest events and updates in-game!",
      timestamp: new Date().toISOString(),
      url: "https://twitter.com/ARCRaidersGame",
      avatar: "blue",
    },
    {
      account: "Arc Raiders News",
      handle: "ARCRaidersNews",
      text: "📰 Patch 1.13.0 is now live! Check out the full patch notes for all the latest changes and improvements to the game.",
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      url: "https://twitter.com/ARCRaidersNews",
      avatar: "purple",
    },
    {
      account: "Arc Raiders Media",
      handle: "ARCRaidersMedia",
      text: "🎬 New gameplay highlights from the community! Amazing plays from this week's top raiders. Share your clips with us!",
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      url: "https://twitter.com/ARCRaidersMedia",
      avatar: "green",
    },
    {
      account: "ARCoholic HQ",
      handle: "ARCoholicHQ",
      text: "💡 Pro tip: Best loot locations on Dam Battlegrounds revealed! Check out our latest guide for PvP advantage.",
      timestamp: new Date(Date.now() - 10800000).toISOString(),
      url: "https://twitter.com/ARCoholicHQ",
      avatar: "orange",
    },
  ];
}

export async function GET() {
  try {
    // For now, return widget configuration
    // Tweets will be loaded directly via Twitter's widget script in the browser
    const accounts = await getTwitterAccountsForWidget();
    
    return Response.json({
      accounts,
      useWidget: true,
      source: "twitter_widget",
    });
  } catch (error) {
    console.error("Error in tweets API:", error);
    return Response.json({
      tweets: getFallbackTweets(),
      source: "fallback",
      fallback: true,
    });
  }
}
