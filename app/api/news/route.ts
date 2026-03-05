export const revalidate = 300; // Cache for 5 minutes

interface NewsArticle {
  title: string;
  content: string;
  summary: string;
  publishedDate: string;
  url: string;
  /** Card image URL from arcraiders.com (storage.googleapis.com/...article-cards/...) */
  imageUrl?: string;
  /** True when the card has the "Patch Notes" tag on arcraiders.com */
  isPatchNotes?: boolean;
}

interface NewsItem {
  id: number;
  title: string;
  description: string;
  articles: NewsArticle[];
  url: string;
  category: string;
  importance: "high" | "medium" | "low";
  date: string;
  /** Card image URL for latest-news style cards from arcraiders.com */
  imageUrl?: string;
}

// Extract text from HTML
function extractTextFromHTML(html: string): string {
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<[^>]+>/g, ' ');
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}

// Generate summary from text
function generateSummary(text: string, maxLength: number = 250): string {
  const cleaned = text.trim();
  if (cleaned.length <= maxLength) return cleaned;
  
  const truncated = cleaned.substring(0, maxLength);
  const lastPeriod = truncated.lastIndexOf('.');
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastPeriod > maxLength * 0.7) {
    return truncated.substring(0, lastPeriod + 1);
  } else if (lastSpace > maxLength * 0.8) {
    return truncated.substring(0, lastSpace) + '...';
  }
  
  return truncated + '...';
}

// Fetch actual news articles from official site
async function fetchOfficialNews(): Promise<NewsArticle[]> {
  try {
    const response = await fetch('https://arcraiders.nexon.com/en-US/news', {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.log('Failed to fetch official news:', response.status);
      return [];
    }
    
    const html = await response.text();
    const articles: NewsArticle[] = [];

    // Look for news items - they appear to use specific class patterns
    // Extract article cards/links
    const linkMatches = html.matchAll(/href="\/en-US\/news\/(\d+)(?:\?[^"]*)?"/gi);
    const seenIds = new Set<string>();
    
    for (const match of linkMatches) {
      const newsId = match[1];
      if (seenIds.has(newsId) || articles.length >= 3) continue;
      seenIds.add(newsId);

      try {
        // Fetch individual article
        const articleUrl = `https://arcraiders.nexon.com/en-US/news/${newsId}`;
        const articleResponse = await fetch(articleUrl, {
          headers: { 
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          signal: AbortSignal.timeout(8000),
        });

        if (!articleResponse.ok) continue;
        const articleHtml = await articleResponse.text();

        // Extract title - look for main heading
        let title = '';
        const h1Match = articleHtml.match(/<h1[^>]*>(.*?)<\/h1>/is);
        const h2Match = articleHtml.match(/<h2[^>]*>(?!news\.)(.*?)<\/h2>/is);
        
        if (h1Match) {
          title = extractTextFromHTML(h1Match[1]);
        } else if (h2Match) {
          title = extractTextFromHTML(h2Match[1]);
        }

        // Extract date
        let publishedDate = new Date().toISOString();
        const dateMatch = articleHtml.match(/(\d{4})\.(\d{2})\.(\d{2})/);
        if (dateMatch) {
          publishedDate = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}T00:00:00Z`;
        }

        // Extract main content
        const contentSections: string[] = [];
        
        // Look for "What's New" section
        const whatsNewMatch = articleHtml.match(/What's New\?<\/h2>([\s\S]*?)(?:<h2|<\/div>)/i);
        if (whatsNewMatch) {
          const items = whatsNewMatch[1].match(/<li[^>]*>(.*?)<\/li>/gis) || [];
          items.slice(0, 3).forEach(item => {
            const text = extractTextFromHTML(item);
            if (text) contentSections.push(text);
          });
        }

        // Look for highlights section
        const highlightsMatch = articleHtml.match(/Patch Highlights<\/h2>([\s\S]*?)(?:<h2|<\/div>)/i);
        if (highlightsMatch && contentSections.length < 3) {
          const items = highlightsMatch[1].match(/<li[^>]*>(.*?)<\/li>/gis) || [];
          items.slice(0, 2).forEach(item => {
            const text = extractTextFromHTML(item);
            if (text) contentSections.push(text);
          });
        }

        const summary = contentSections.length > 0 
          ? contentSections.join(' • ')
          : generateSummary(extractTextFromHTML(articleHtml), 200);

        if (title && summary) {
          articles.push({
            title: title.trim(),
            content: summary,
            summary,
            publishedDate,
            url: articleUrl,
          });
        }
      } catch (err) {
        console.error(`Error fetching article ${newsId}:`, err);
        continue;
      }
    }

    return articles;
  } catch (error) {
    console.error("Error fetching official news:", error);
    return [];
  }
}

// Fetch patch notes
async function fetchPatchNotes(): Promise<NewsArticle[]> {
  try {
    const response = await fetch('https://arcraiders.nexon.com/en-US/news?category=patchnotes', {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.log('Failed to fetch patch notes:', response.status);
      return [];
    }
    
    const html = await response.text();
    const articles: NewsArticle[] = [];

    // Extract patch note links
    const linkMatches = html.matchAll(/href="\/en-US\/news\/(\d+)\?category=patchnotes"/gi);
    const seenIds = new Set<string>();
    
    for (const match of linkMatches) {
      const newsId = match[1];
      if (seenIds.has(newsId) || articles.length >= 2) continue;
      seenIds.add(newsId);

      try {
        const articleUrl = `https://arcraiders.nexon.com/en-US/news/${newsId}?category=patchnotes`;
        const articleResponse = await fetch(articleUrl, {
          headers: { 
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          signal: AbortSignal.timeout(8000),
        });

        if (!articleResponse.ok) continue;
        const articleHtml = await articleResponse.text();

        // Extract patch title
        let title = '';
        const titleMatch = articleHtml.match(/<h1[^>]*>(.*?)<\/h1>/is) || 
                          articleHtml.match(/Update\s+[\d.]+|Patch\s+[\d.]+/i);
        if (titleMatch) {
          title = extractTextFromHTML(titleMatch[1] || titleMatch[0]);
        }

        // Extract date
        let publishedDate = new Date().toISOString();
        const dateMatch = articleHtml.match(/(\d{4})\.(\d{2})\.(\d{2})/);
        if (dateMatch) {
          publishedDate = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}T00:00:00Z`;
        }

        // Extract key highlights
        const highlights: string[] = [];
        
        // What's New section
        const whatsNewMatch = articleHtml.match(/What's New\?[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i);
        if (whatsNewMatch) {
          const items = whatsNewMatch[1].match(/<li[^>]*>(.*?)<\/li>/gis) || [];
          items.slice(0, 2).forEach(item => {
            const strongMatch = item.match(/<strong[^>]*>(.*?)<\/strong>/i);
            if (strongMatch) {
              highlights.push(extractTextFromHTML(strongMatch[1]));
            }
          });
        }

        // Patch Highlights
        const highlightsMatch = articleHtml.match(/Patch Highlights[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i);
        if (highlightsMatch && highlights.length < 3) {
          const items = highlightsMatch[1].match(/<li[^>]*>(.*?)<\/li>/gis) || [];
          items.slice(0, 2).forEach(item => {
            const text = extractTextFromHTML(item);
            if (text && !highlights.includes(text)) {
              highlights.push(text);
            }
          });
        }

        const summary = highlights.length > 0 
          ? highlights.join(' • ')
          : generateSummary(extractTextFromHTML(articleHtml), 200);

        if (title && summary) {
          articles.push({
            title: title.trim(),
            content: summary,
            summary,
            publishedDate,
            url: articleUrl,
          });
        }
      } catch (err) {
        console.error(`Error fetching patch ${newsId}:`, err);
        continue;
      }
    }

    return articles;
  } catch (error) {
    console.error('Error fetching patch notes:', error);
    return [];
  }
}

const ARC_SITE_BASE = "https://arcraiders.com";

// Fetch latest news cards from arcraiders.com/news using the same structure as the site:
// card link, image (300x200), title, date, and optional "Patch Notes" tag.
async function fetchArcSiteNews(): Promise<NewsArticle[]> {
  try {
    const response = await fetch(`${ARC_SITE_BASE}/news`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.log("Failed to fetch arcraiders.com news:", response.status);
      return [];
    }

    const html = await response.text();
    const articles: NewsArticle[] = [];

    // Match each news card: <a class="news-article-card_container__..." href="/news/SLUG"> ... <img ... src="IMAGE_URL" ... /> ... title ... date
    const cardRegex =
      /<a\s+class="news-article-card_container__[^"]*"\s+href="\/news\/([^"]+)">[\s\S]*?<img[^>]+src="(https:\/\/[^"]+)"[^>]*>[\s\S]*?news-article-card_title__[^"]*">([^<]+)<\/div>[\s\S]*?news-article-card_date__[^"]*">([^<]+)<\/div>/gi;

    let match: RegExpExecArray | null;
    const seenSlugs = new Set<string>();

    while ((match = cardRegex.exec(html)) && articles.length < 16) {
      const slug = match[1];
      const imageUrl = match[2];
      const title = match[3].trim();
      const dateText = match[4].trim();

      if (!slug || !title || !dateText || seenSlugs.has(slug)) continue;
      seenSlugs.add(slug);

      // Check if this card has the "Patch Notes" tag (look in the segment before title)
      const cardStart = match.index;
      const titleStart = html.indexOf(match[3], cardStart);
      const segmentBeforeTitle = html.slice(cardStart, titleStart);
      const isPatchNotes = /news-article-card_tag__[^"]*">\s*Patch Notes\s*</i.test(segmentBeforeTitle);

      const fullUrl = `${ARC_SITE_BASE}/news/${slug}`;
      const publishedDate = new Date(dateText).toISOString();

      articles.push({
        title,
        content: dateText,
        summary: dateText,
        publishedDate,
        url: fullUrl,
        imageUrl: imageUrl || undefined,
        isPatchNotes,
      });
    }

    return articles;
  } catch (error) {
    console.error("Error fetching arcraiders.com news:", error);
    return [];
  }
}

export async function GET() {
  try {
    // Fetch real news content
    const [officialArticles, patchArticles, siteArticles] = await Promise.all([
      fetchOfficialNews(),
      fetchPatchNotes(),
      fetchArcSiteNews(),
    ]);

    const newsItems: NewsItem[] = [];

    // Latest news cards from arcraiders.com (same cards as on the site: image, title, date, Patch Notes)
    if (siteArticles.length > 0) {
      siteArticles.slice(0, 12).forEach((article, index) => {
        newsItems.push({
          id: 100 + index,
          title: article.title,
          description: article.summary,
          articles: [article],
          url: article.url,
          category: article.isPatchNotes ? "Patch Notes" : "Official",
          importance: "high",
          date: article.publishedDate,
          imageUrl: article.imageUrl,
        });
      });
    }

    // Official News (grouped from nexon site)
    if (officialArticles.length > 0) {
      newsItems.push({
        id: 1,
        title: "Official ARC Raiders News (Legacy)",
        description: `${officialArticles.length} latest articles from the Nexon news page`,
        articles: officialArticles,
        url: "https://arcraiders.nexon.com/en-US/news",
        category: "Official",
        importance: "medium",
        date: new Date().toISOString(),
      });
    }

    // Patch Notes
    if (patchArticles.length > 0) {
      newsItems.push({
        id: 2,
        title: "Latest Patch Notes",
        description: `${patchArticles.length} recent patch notes and updates`,
        articles: patchArticles,
        url: "https://arcraiders.nexon.com/en-US/news?category=patchnotes",
        category: "Patch Notes",
        importance: "high",
        date: new Date().toISOString(),
      });
    }

    // Additional news sources
    const additionalItems: NewsItem[] = [
      {
        id: 3,
        title: "Steam News & Updates",
        description: "Official Arc Raiders store page — open in browser and use the News tab for announcements",
        articles: [
          {
            title: "Arc Raiders on Steam",
            content: "Open the official Arc Raiders Steam app page. Use the News tab there for the latest announcements, patch notes, and community discussions.",
            summary: "Steam app page; use the News tab for updates and announcements.",
            publishedDate: new Date(Date.now() - 172800000).toISOString(),
            url: "https://store.steampowered.com/app/1858910/Arc_Raiders/",
          },
        ],
        url: "https://store.steampowered.com/app/1858910/Arc_Raiders/",
        category: "Steam",
        importance: "high",
        date: new Date().toISOString(),
      },
      {
        id: 4,
        title: "Development Roadmap",
        description: "Official roadmap and upcoming features",
        articles: [
          {
            title: "2026 Roadmap",
            content: "Explore the official Arc Raiders roadmap to discover upcoming features, new content drops, and planned improvements.",
            summary: "View what's coming to Arc Raiders including new maps, weapons, game modes, and seasonal events.",
            publishedDate: new Date(Date.now() - 604800000).toISOString(),
            url: "https://arcraiders.nexon.com/en-US/roadmap",
          },
        ],
        url: "https://arcraiders.nexon.com/en-US/roadmap",
        category: "Roadmap",
        importance: "high",
        date: new Date().toISOString(),
      },
      {
        id: 5,
        title: "Discord Announcements",
        description: "Official Discord server updates",
        articles: [
          {
            title: "Join the Official Discord",
            content: "Stay connected with the community and get real-time updates, announcements, and participate in discussions with developers and players.",
            summary: "Access exclusive announcements, developer Q&As, community events, and connect with thousands of players.",
            publishedDate: new Date(Date.now() - 86400000).toISOString(),
            url: "https://discord.gg/arcraiders",
          },
        ],
        url: "https://discord.gg/arcraiders",
        category: "Community",
        importance: "medium",
        date: new Date().toISOString(),
      },
      {
        id: 6,
        title: "Reddit Community",
        description: "Community discussions and player content",
        articles: [
          {
            title: "r/ArcRaiders",
            content: "Join the Arc Raiders subreddit for community discussions, tips, gameplay clips, and the latest player-driven content.",
            summary: "Active community subreddit featuring guides, gameplay highlights, patch discussions, and player feedback.",
            publishedDate: new Date(Date.now() - 259200000).toISOString(),
            url: "https://www.reddit.com/r/ArcRaiders/",
          },
        ],
        url: "https://www.reddit.com/r/ArcRaiders/",
        category: "Community",
        importance: "medium",
        date: new Date().toISOString(),
      },
      {
        id: 7,
        title: "Wiki & Game Guides",
        description: "Community-maintained knowledge base",
        articles: [
          {
            title: "Arc Raiders Wiki",
            content: "Comprehensive community wiki with detailed information on weapons, maps, game mechanics, and strategy guides.",
            summary: "Complete game database featuring weapon stats, map guides, character builds, and comprehensive patch history.",
            publishedDate: new Date(Date.now() - 345600000).toISOString(),
            url: "https://arcraiders.fandom.com/wiki/Arc_Raiders_Wiki",
          },
        ],
        url: "https://arcraiders.fandom.com/wiki/Arc_Raiders_Wiki",
        category: "Guides",
        importance: "medium",
        date: new Date().toISOString(),
      },
      {
        id: 8,
        title: "MetaForge Hub",
        description: "Advanced stats and loadout tracker",
        articles: [
          {
            title: "MetaForge Stats",
            content: "Track your stats, optimize loadouts, view the current meta, and analyze your performance with comprehensive analytics.",
            summary: "Professional stat tracking featuring loadout optimization, meta analysis, performance metrics, and leaderboards.",
            publishedDate: new Date(Date.now() - 518400000).toISOString(),
            url: "https://metaforge.app/arc-raiders",
          },
        ],
        url: "https://metaforge.app/arc-raiders",
        category: "Stats",
        importance: "medium",
        date: new Date().toISOString(),
      },
    ];

    // Combine real and additional items
    const allNews = [...newsItems, ...additionalItems];

    return Response.json({
      success: true,
      data: allNews,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("News API error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch news";
    return Response.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
