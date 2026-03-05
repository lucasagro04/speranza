"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type EventItem = {
  name: string;
  map: string;
  icon?: string;
  startTime: number;
  endTime: number;
};

type ApiResponse = {
  data: EventItem[];
};

type NewsItem = {
  id: number;
  title: string;
  description: string;
  url: string;
  category: string;
  importance: "high" | "medium" | "low";
  date: string;
  summary?: string;
  /** Card image from arcraiders.com latest news */
  imageUrl?: string;
};

type Tab = "events" | "trials" | "news" | "twitch";

type TrialItem = {
  id: string;
  name: string;
  category: string;
  image?: string;
  basePointsPerAction?: number;
  targetFor3Stars?: number;
  actionsTo3Stars?: string;
  bestMaps?: { map: string; reason: string }[];
  idealConditions?: string[];
  tips?: string[];
  strategies?: string[];
  loadout?: string;
};

type TwitchStreamer = {
  id: string;
  userName: string;
  userLogin: string;
  profileImageUrl: string;
  isLive: boolean;
  title: string | null;
  viewerCount: number;
  thumbnailUrl: string | null;
  gameName: string | null;
  startedAt: string | null;
  url: string;
};

type PlayerTrends = {
  date: string;
  activePlayers: number;
  totalKills: number;
  totalWins: number;
};

function formatRemaining(ms: number) {
  const clamped = Math.max(0, ms);
  const totalSeconds = Math.floor(clamped / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function formatTrialsCountdown(ms: number) {
  const clamped = Math.max(0, ms);
  const totalSeconds = Math.floor(clamped / 1000);
  const d = Math.floor(totalSeconds / 86400);
  const h = Math.floor((totalSeconds % 86400) / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (d > 0) return `${d}d ${pad(h)}h ${pad(m)}m ${pad(s)}s`;
  if (h > 0) return `${pad(h)}h ${pad(m)}m ${pad(s)}s`;
  if (m > 0) return `${pad(m)}m ${pad(s)}s`;
  return `${pad(s)}s`;
}

const TABS: Tab[] = ["events", "trials", "twitch", "news"];

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>("events");
  const [events, setEvents] = useState<EventItem[]>([]);
  const [trials, setTrials] = useState<TrialItem[]>([]);
  const [trialsWeekStart, setTrialsWeekStart] = useState<string | null>(null);
  const [trialsWeekEnd, setTrialsWeekEnd] = useState<string | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [twitchStreamers, setTwitchStreamers] = useState<TwitchStreamer[]>([]);
  const [twitchError, setTwitchError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Player Stats
  const [totalOnlinePlayers, setTotalOnlinePlayers] = useState<number>(0);
  const [playerTrends, setPlayerTrends] = useState<PlayerTrends[]>([]);
  const [trendsPeriod, setTrendsPeriod] = useState<"daily" | "weekly" | "monthly">("daily");
  const [playerStatsLastUpdated, setPlayerStatsLastUpdated] = useState<number | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; value: number; date: string } | null>(null);

  // Email Notifications
  const [userEmail, setUserEmail] = useState<string>("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [emailAlertsExpanded, setEmailAlertsExpanded] = useState(false);
  const notifiedEventsRef = useRef<string[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [newsLastUpdated, setNewsLastUpdated] = useState<number | null>(null);
  const [expandedTrials, setExpandedTrials] = useState<Set<string>>(new Set());

  // Sync tab from URL (e.g. ?tab=events)
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && TABS.includes(tab as Tab)) {
      setActiveTab(tab as Tab);
    }
  }, [searchParams]);

  // Tick every second
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Load email from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("userEmail");
    const enabled = localStorage.getItem("notificationsEnabled") === "true";
    if (saved) {
      setUserEmail(saved);
      setNotificationsEnabled(enabled);
    }
  }, []);

  // Check for event notifications every 2 minutes
  useEffect(() => {
    if (!notificationsEnabled || !userEmail) return;

    const checkNotifications = async () => {
      try {
        const response = await fetch("/api/notifications/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: userEmail, notifiedEvents: notifiedEventsRef.current }),
        });

        const data = await response.json();
        if (data.notifiedEvents) {
          notifiedEventsRef.current = data.notifiedEvents;
        }
      } catch (err) {
        console.error("Notification check failed:", err);
      }
    };

    checkNotifications();
    const interval = setInterval(checkNotifications, 120000);

    return () => clearInterval(interval);
  }, [notificationsEnabled, userEmail]);

  // Fetch events
  const eventsLengthRef = useRef(0);
  useEffect(() => {
    eventsLengthRef.current = events.length;
  }, [events.length]);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const res = await fetch("/api/events");
        const json = (await res.json()) as ApiResponse;
        if (!alive) return;

        if (json.data && json.data.length > 0) {
          setError(null);
          setEvents(json.data);
          setLastUpdated(Date.now());
        } else if (eventsLengthRef.current === 0) {
          setError("MetaForge API temporarily unavailable - retrying...");
        }
      } catch {
        if (alive && eventsLengthRef.current === 0) {
          setError("Connection error - retrying...");
        }
      }
    }

    load();
    const interval = setInterval(load, 60_000);

    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, []);

  // Fetch news (only when news tab is active)
  useEffect(() => {
    if (activeTab !== "news") return;

    let alive = true;

    async function loadNews() {
      try {
        const res = await fetch("/api/news");
        if (!res.ok) throw new Error(`News API failed: ${res.status}`);
        const json = await res.json();
        if (!alive) return;

        if (json.success && json.data) {
          setNews(json.data);
          setNewsLastUpdated(Date.now());
        }
      } catch {
        if (process.env.NODE_ENV === "development") {
          console.error("Failed to load news");
        }
      }
    }

    loadNews();
    const interval = setInterval(loadNews, 300_000);

    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [activeTab]);

  // Fetch player stats every 60 seconds (when events tab is active)
  useEffect(() => {
    if (activeTab !== "events") return;

    let alive = true;

    async function loadPlayerStats() {
      try {
        const res = await fetch(`/api/player-stats?period=${trendsPeriod}`);
        const json = await res.json();
        if (!alive) return;

        if (json.totalOnlinePlayers !== undefined && json.trends) {
          setTotalOnlinePlayers(json.totalOnlinePlayers);
          setPlayerTrends(json.trends);
          setPlayerStatsLastUpdated(Date.now());
        }
      } catch (e) {
        if (process.env.NODE_ENV === "development") {
          console.error("Failed to load player stats:", e);
        }
      }
    }

    loadPlayerStats();
    const interval = setInterval(loadPlayerStats, 60000); // Every 60 seconds

    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [trendsPeriod, activeTab]);

  // Fetch trials (only when trials tab is active)
  useEffect(() => {
    if (activeTab !== "trials") return;

    let alive = true;

    async function loadTrials() {
      try {
        const res = await fetch("/api/trials");
        const json = await res.json();
        if (!alive) return;

        if (json.success && Array.isArray(json.trials)) {
          setTrials(json.trials);
          if (json.weekStart) setTrialsWeekStart(json.weekStart);
          if (json.weekEnd) setTrialsWeekEnd(json.weekEnd);
        }
      } catch {
        if (process.env.NODE_ENV === "development") {
          console.error("Failed to load trials");
        }
      }
    }

    loadTrials();
    const interval = setInterval(loadTrials, 3600_000); // Refresh hourly

    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [activeTab]);

  // Fetch Twitch streamers (only when twitch tab is active)
  useEffect(() => {
    if (activeTab !== "twitch") return;

    setTwitchError(null);
    let alive = true;

    async function loadStreamers() {
      try {
        const res = await fetch("/api/twitch");
        const json = await res.json().catch(() => ({}));

        if (!alive) return;

        if (!res.ok) {
          setTwitchError(json.error || `Twitch API failed: ${res.status}`);
          setTwitchStreamers([]);
          return;
        }
        if (json.error) {
          setTwitchError(json.error);
          setTwitchStreamers(Array.isArray(json.streamers) ? json.streamers : []);
          return;
        }
        if (Array.isArray(json.streamers)) {
          setTwitchStreamers(json.streamers);
          setTwitchError(null);
        }
      } catch (e) {
        if (!alive) return;
        setTwitchError("Failed to load streamers. Check your connection.");
        setTwitchStreamers([]);
        if (process.env.NODE_ENV === "development") {
          console.error("Failed to load Twitch streamers:", e);
        }
      }
    }

    loadStreamers();
    const interval = setInterval(loadStreamers, 60_000);

    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [activeTab]);

  const EXCLUDED_EVENT_NAMES = ["hidden bunker", "launch tower loot", "lock gate", "locked gate"];
  const isExcludedEvent = useCallback((ev: EventItem) => {
    const n = ev.name.toLowerCase();
    return EXCLUDED_EVENT_NAMES.some((excluded) => n.includes(excluded));
  }, []);

  const active = useMemo(() => {
    return events.filter((ev) => !isExcludedEvent(ev) && now >= ev.startTime && now < ev.endTime);
  }, [events, now, isExcludedEvent]);

  // Active events for trials (includes Hidden Bunker, Locked Gate - 2× modifiers)
  const activeForTrials = useMemo(() => {
    return events.filter((ev) => now >= ev.startTime && now < ev.endTime);
  }, [events, now]);

  const upcoming = useMemo(() => {
    return events
      .filter((ev) => !isExcludedEvent(ev) && ev.startTime > now)
      .sort((a, b) => a.startTime - b.startTime);
  }, [events, now, isExcludedEvent]);

  // Derive event type from event name (for schedule headers and grouping)
  const getEventType = useCallback((ev: EventItem) => {
    const n = ev.name.toLowerCase();
    if (n.includes("matriarch")) return "Matriarch";
    if (n.includes("harvester")) return "Harvester";
    if (n.includes("night raid")) return "Night Raid";
    if (n.includes("cold snap")) return "Cold Snap";
    if (n.includes("bird city")) return "Bird City";
    if (n.includes("headwinds")) return "Headwinds";
    if (n.includes("shared watch")) return "Shared Watch";
    if (n.includes("exodus")) return "Exodus";
    if (n.includes("stella montis")) return "Stella Montis";
    if (n.includes("rust belt")) return "Rust Belt";
    if (n.includes("north line")) return "North Line";
    if (n.includes("duck")) return "Duck";
    return ev.name;
  }, []);

  // Favorite event types to show first in the schedule (Matriarch, Harvester)
  const FAVORITE_EVENT_TYPES = ["matriarch", "harvester"];

  // Map event name to trial ideal condition (for matching)
  const eventMatchesTrialCondition = useCallback((eventName: string, condition: string) => {
    const en = eventName.toLowerCase();
    const c = condition.toLowerCase();
    if (c === "em storm" && (en.includes("electromagnetic") || en.includes("em storm"))) return true;
    if (en.includes(c) || c.includes(en)) return true;
    return false;
  }, []);

  // Check if event map matches trial's best map
  const eventMapMatchesTrialMap = useCallback((eventMap: string, trialMap: string) => {
    const em = eventMap.toLowerCase();
    const tm = trialMap.toLowerCase();
    if (tm.includes("any map")) return true;
    if (em === "dam" && (tm.includes("dam") || tm.includes("battleground"))) return true;
    if (em === "blue gate" && (tm.includes("blue gate") || tm.includes("the blue gate"))) return true;
    if (tm.includes(em) || em.includes(tm)) return true;
    return false;
  }, []);

  // Get active events that are ideal for a trial (2× modifier on a best map)
  const getActiveIdealEventsForTrial = useCallback(
    (trial: TrialItem): EventItem[] => {
      if (!trial.idealConditions?.length || !trial.bestMaps?.length) return [];
      return activeForTrials.filter(
        (ev) =>
          trial.idealConditions!.some((c) => eventMatchesTrialCondition(ev.name, c)) &&
          trial.bestMaps!.some((m) => eventMapMatchesTrialMap(ev.map, m.map))
      );
    },
    [activeForTrials, eventMatchesTrialCondition, eventMapMatchesTrialMap]
  );

  // Trials sorted with live events first (best map currently has active 2× modifier)
  const sortedTrials = useMemo(() => {
    return [...trials].sort((a, b) => {
      const aLive = getActiveIdealEventsForTrial(a).length > 0;
      const bLive = getActiveIdealEventsForTrial(b).length > 0;
      if (aLive && !bLive) return -1;
      if (!aLive && bLive) return 1;
      return 0;
    });
  }, [trials, getActiveIdealEventsForTrial]);

  // Schedule = active + upcoming, grouped by event type; active events shown first within each group
  const scheduleEvents = useMemo(() => {
    const combined = [...active, ...upcoming];
    return combined.sort((a, b) => {
      const aActive = now >= a.startTime && now < a.endTime;
      const bActive = now >= b.startTime && now < b.endTime;
      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;
      return a.startTime - b.startTime;
    });
  }, [active, upcoming, now]);

  // Group schedule (active + upcoming) by event type; prioritize Matriarch and Harvester first
  const scheduleByEventType = useMemo(() => {
    const byType = new Map<string, { typeLabel: string; events: EventItem[] }>();
    scheduleEvents.forEach((ev) => {
      const typeLabel = getEventType(ev);
      const key = typeLabel.toLowerCase().replace(/\s+/g, "-");
      if (!byType.has(key)) byType.set(key, { typeLabel, events: [] });
      byType.get(key)!.events.push(ev);
    });
    const list = Array.from(byType.values());
    list.sort((a, b) => {
      const aKey = a.typeLabel.toLowerCase();
      const bKey = b.typeLabel.toLowerCase();
      const aFav = FAVORITE_EVENT_TYPES.indexOf(aKey) >= 0;
      const bFav = FAVORITE_EVENT_TYPES.indexOf(bKey) >= 0;
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;
      if (aFav && bFav) return FAVORITE_EVENT_TYPES.indexOf(aKey) - FAVORITE_EVENT_TYPES.indexOf(bKey);
      return 0;
    });
    return list;
  }, [scheduleEvents, getEventType]);

  // Memoize line chart calculations with smooth curves
  const chartData = useMemo(() => {
    if (playerTrends.length === 0) return null;

    const maxPlayers = Math.max(...playerTrends.map((t) => t.activePlayers));
    const minPlayers = Math.min(...playerTrends.map((t) => t.activePlayers));
    const range = maxPlayers - minPlayers || 1;

    // Fixed dimensions with padding
    const padding = { top: 20, right: 20, bottom: 20, left: 20 };
    const chartWidth = 600; // Fixed width for better control
    const chartHeight = 180; // Reduced height
    const width = chartWidth - padding.left - padding.right;
    const height = chartHeight - padding.top - padding.bottom;

    const points = playerTrends.map((trend, index) => {
      const x = padding.left + (index / (playerTrends.length - 1 || 1)) * width;
      const y = padding.top + height - ((trend.activePlayers - minPlayers) / range) * height;
      return { x, y, value: trend.activePlayers, date: trend.date };
    });

    // Create smooth curve using cubic bezier curves for better smoothness
    const createSmoothPath = (points: typeof points) => {
      if (points.length < 2) return '';
      if (points.length === 2) {
        return `M ${points[0].x},${points[0].y} L ${points[1].x},${points[1].y}`;
      }

      let path = `M ${points[0].x},${points[0].y}`;

      for (let i = 0; i < points.length - 1; i++) {
        const current = points[i];
        const next = points[i + 1];
        const prev = i > 0 ? points[i - 1] : current;
        const afterNext = i < points.length - 2 ? points[i + 2] : next;

        // Calculate control points for smooth cubic bezier curve
        const cp1x = current.x + (next.x - prev.x) * 0.15;
        const cp1y = current.y + (next.y - prev.y) * 0.15;
        const cp2x = next.x - (afterNext.x - current.x) * 0.15;
        const cp2y = next.y - (afterNext.y - current.y) * 0.15;

        // Use cubic bezier (C) for smooth curves
        path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${next.x},${next.y}`;
      }

      return path;
    };

    const linePath = createSmoothPath(points);
    const areaPath = `${linePath} L ${points[points.length - 1].x},${chartHeight - padding.bottom} L ${points[0].x},${chartHeight - padding.bottom} Z`;

    const peakPlayers = maxPlayers;
    const averagePlayers = Math.round(playerTrends.reduce((sum, t) => sum + t.activePlayers, 0) / playerTrends.length);
    const lowestPlayers = minPlayers;

    return {
      points,
      linePath,
      areaPath,
      maxPlayers,
      minPlayers,
      range,
      width: chartWidth,
      height: chartHeight,
      peakPlayers,
      averagePlayers,
      lowestPlayers
    };
  }, [playerTrends]);

  const setTab = useCallback(
    (tab: Tab) => {
      setActiveTab(tab);
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", tab);
      router.replace(`/?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  return (
    <main className="min-h-screen bg-[#0D0D0D] text-[#ECECEC]">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <header className="mb-8 flex flex-col gap-4">
          <div>
            <h1 className="text-4xl font-bold text-[#ECECEC]">
              Speranza
            </h1>
            <p className="text-base text-[#8E8E8E] mt-2">
              Your command center for events, news, and community updates
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setTab("events")}
              className={`px-5 py-2.5 text-sm font-medium rounded-full border transition-all ${
                activeTab === "events"
                  ? "bg-[#ECECEC] text-[#0D0D0D] border-[#ECECEC]"
                  : "bg-transparent text-[#8E8E8E] border-[#3F3F3F] hover:border-[#5E5E5E] hover:text-[#B4B4B4]"
              }`}
            >
              Events & Community
            </button>
            <button
              onClick={() => setTab("trials")}
              className={`px-5 py-2.5 text-sm font-medium rounded-full border transition-all ${
                activeTab === "trials"
                  ? "bg-[#ECECEC] text-[#0D0D0D] border-[#ECECEC]"
                  : "bg-transparent text-[#8E8E8E] border-[#3F3F3F] hover:border-[#5E5E5E] hover:text-[#B4B4B4]"
              }`}
            >
              Weekly Trials
            </button>
            <button
              onClick={() => setTab("twitch")}
              className={`px-5 py-2.5 text-sm font-medium rounded-full border transition-all ${
                activeTab === "twitch"
                  ? "bg-[#ECECEC] text-[#0D0D0D] border-[#ECECEC]"
                  : "bg-transparent text-[#8E8E8E] border-[#3F3F3F] hover:border-[#5E5E5E] hover:text-[#B4B4B4]"
              }`}
            >
              Live Streams
            </button>
            <button
              onClick={() => setTab("news")}
              className={`px-5 py-2.5 text-sm font-medium rounded-full border transition-all ${
                activeTab === "news"
                  ? "bg-[#ECECEC] text-[#0D0D0D] border-[#ECECEC]"
                  : "bg-transparent text-[#8E8E8E] border-[#3F3F3F] hover:border-[#5E5E5E] hover:text-[#B4B4B4]"
              }`}
            >
              News
            </button>
          </div>
        </header>

        {/* Events Tab */}
        {activeTab === "events" && (
          <>
        {error && (
          <div className="mb-6 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-red-200">
            {error}
          </div>
        )}

            {/* Active Events */}
            <section className="mb-8">
              <h2 className="mb-4 text-xl font-semibold text-[#ECECEC]">Active Events</h2>
              {active.length === 0 ? (
                <div className="text-[#B4B4B4]">No active events right now.</div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {active.map((ev, idx) => {
                    const remaining = ev.endTime - now;
                    return (
                      <div
                        key={`${ev.map}-${ev.name}-${idx}`}
                        className="flex gap-3 rounded-2xl border border-green-500/40 bg-gradient-to-br from-green-500/10 to-transparent p-4 hover:border-green-500/60 transition-all"
                      >
                        <div className="relative h-12 w-12 overflow-hidden rounded-lg border border-[#3F3F3F] bg-[#0D0D0D]">
                          {ev.icon ? (
                            <Image
                              src={ev.icon}
                              alt={ev.name}
                              fill
                              className="object-cover"
                              sizes="48px"
                            />
                          ) : null}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs text-[#8E8E8E]">{ev.map}</div>
                          <div className="truncate text-base font-semibold text-[#ECECEC]">
                            {ev.name}
                          </div>
                          <div className="mt-1.5 font-mono text-xl text-green-400">
                            {formatRemaining(remaining)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Active Community */}
            <section className="mb-8">
              <h2 className="mb-4 text-xl font-semibold text-[#ECECEC]">Active Community</h2>
              <div className="rounded-2xl border border-[#2A2A2A] bg-[#1a1a1a] p-6">
              <div className="flex flex-wrap items-start justify-between gap-6 pb-6 mb-6 border-b border-[#2A2A2A]">
                <div>
                  <div className="text-sm text-[#8E8E8E] mb-2">Players Online Right Now</div>
                  <div className="flex items-baseline gap-3">
                    <div className="text-4xl font-bold text-[#ECECEC]">
                        {totalOnlinePlayers > 0 ? totalOnlinePlayers.toLocaleString() : "—"}
                      </div>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></span>
                      <span className="text-sm text-[#8E8E8E]">Live</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <h3 className="text-lg font-semibold text-[#ECECEC]">Player Trends</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTrendsPeriod("daily")}
                    className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
                      trendsPeriod === "daily"
                        ? "bg-[#ECECEC] text-[#0D0D0D]"
                        : "bg-transparent text-[#8E8E8E] border border-[#3F3F3F] hover:border-[#5E5E5E]"
                    }`}
                  >
                    Daily
                  </button>
                  <button
                    onClick={() => setTrendsPeriod("weekly")}
                    className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
                      trendsPeriod === "weekly"
                        ? "bg-[#ECECEC] text-[#0D0D0D]"
                        : "bg-transparent text-[#8E8E8E] border border-[#3F3F3F] hover:border-[#5E5E5E]"
                    }`}
                  >
                    Weekly
                  </button>
                  <button
                    onClick={() => setTrendsPeriod("monthly")}
                    className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
                      trendsPeriod === "monthly"
                        ? "bg-[#ECECEC] text-[#0D0D0D]"
                        : "bg-transparent text-[#8E8E8E] border border-[#3F3F3F] hover:border-[#5E5E5E]"
                    }`}
                  >
                    Monthly
                  </button>
                </div>
                </div>
              </div>

              <div className="space-y-4">
                {playerTrends.length > 0 ? (
                  <>
                    <div className="space-y-3">
                      <div className="text-sm font-semibold text-[#ECECEC] mb-2">Active Players Over Time</div>
                      <div className="relative w-full" style={{ height: '220px' }}>
                        <svg
                          viewBox={chartData ? `0 0 ${chartData.width} ${chartData.height}` : "0 0 600 180"}
                          className="w-full h-full"
                          preserveAspectRatio="none"
                        >
                          {chartData && [0, 25, 50, 75, 100].map((percent) => {
                            const y = 20 + ((100 - percent) / 100) * (chartData.height - 40);
                            return (
                              <line
                                key={percent}
                                x1="20"
                                y1={y}
                                x2={chartData.width - 20}
                                y2={y}
                                stroke="#2A2A2A"
                                strokeWidth="1"
                              />
                            );
                          })}
                          {chartData && (
                            <path
                              d={chartData.linePath}
                              fill="none"
                              stroke="#4299E1"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          )}
                          {chartData && (
                            <path
                              d={chartData.areaPath}
                              fill="url(#gradient)"
                              opacity="0.2"
                            />
                          )}
                          <defs>
                            <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="#4299E1" stopOpacity="0.3" />
                              <stop offset="100%" stopColor="#4299E1" stopOpacity="0" />
                            </linearGradient>
                          </defs>
                          {hoveredPoint && chartData && (
                            <line
                              x1={hoveredPoint.x}
                              y1="20"
                              x2={hoveredPoint.x}
                              y2={chartData.height - 20}
                              stroke="#4299E1"
                              strokeWidth="1"
                              strokeDasharray="4 4"
                              opacity="0.5"
                            />
                          )}
                          {chartData && chartData.points.map((point, index) => (
                            <g key={index}>
                              <circle
                                cx={point.x}
                                cy={point.y}
                                r="8"
                                fill="transparent"
                                className="cursor-pointer"
                                onMouseEnter={() => setHoveredPoint(point)}
                                onMouseLeave={() => setHoveredPoint(null)}
                              />
                              <circle
                                cx={point.x}
                                cy={point.y}
                                r={hoveredPoint?.x === point.x ? "5" : "3"}
                                fill={hoveredPoint?.x === point.x ? "#60A5FA" : "#4299E1"}
                                className="transition-all"
                                stroke="#0D0D0D"
                                strokeWidth={hoveredPoint?.x === point.x ? "2" : "1"}
                                onMouseEnter={() => setHoveredPoint(point)}
                                onMouseLeave={() => setHoveredPoint(null)}
                              />
                            </g>
                          ))}
                        </svg>
                        {hoveredPoint && chartData && (
                          <div
                            className="absolute pointer-events-none z-10 bg-[#0D0D0D] border border-[#3F3F3F] rounded-lg px-3 py-2 shadow-lg"
                            style={{
                              left: `${(hoveredPoint.x / chartData.width) * 100}%`,
                              top: `${(hoveredPoint.y / chartData.height) * 100}%`,
                              transform: 'translate(-50%, -120%)',
                            }}
                          >
                            <div className="text-sm font-semibold text-[#ECECEC]">
                              {hoveredPoint.value.toLocaleString()} players
                            </div>
                            <div className="text-xs text-[#8E8E8E] mt-0.5">
                              {new Date(hoveredPoint.date).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric"
                              })}
                            </div>
                          </div>
                        )}
                        <div className="flex justify-between mt-2 text-xs text-[#8E8E8E] px-5">
                          {playerTrends.map((trend, index) => {
                            const showLabel = index % Math.ceil(playerTrends.length / 6) === 0 || index === playerTrends.length - 1;
                            if (showLabel) {
                              return (
                                <span key={index} className="text-center">
                                  {new Date(trend.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                </span>
                              );
                            }
                            return <span key={index}></span>;
                          })}
                        </div>
                      </div>
                    </div>
                    {chartData && (
                      <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-[#2A2A2A]">
                        <div>
                          <div className="text-xs text-[#8E8E8E] mb-1">Peak Players</div>
                          <div className="text-2xl font-bold text-[#ECECEC]">
                            {chartData.peakPlayers.toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-[#8E8E8E] mb-1">Average Players</div>
                          <div className="text-2xl font-bold text-[#ECECEC]">
                            {chartData.averagePlayers.toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-[#8E8E8E] mb-1">Lowest Players</div>
                          <div className="text-2xl font-bold text-[#ECECEC]">
                            {chartData.lowestPlayers.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12 text-[#8E8E8E]">
                    Loading trends data...
                  </div>
                )}
              </div>
            </div>
            </section>

            {notificationsEnabled && (
              <div className="mb-6 flex items-center gap-1.5 text-sm text-green-400">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="text-xs">Email Alerts Active</span>
              </div>
            )}

        {/* Event schedule – by event type, 3 columns, scrollable list like ARCTracker */}
        <section className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-[#ECECEC]">Event schedule</h2>
          {scheduleByEventType.length === 0 ? (
            <div className="text-[#B4B4B4]">No events scheduled.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {scheduleByEventType.map(({ typeLabel, events: typeEvents }) => {
                const headerIcon = typeEvents[0]?.icon;
                return (
                  <div key={typeLabel} className="rounded-2xl border border-[#2A2A2A] bg-[#1a1a1a] overflow-hidden flex flex-col">
                    <div className="px-4 py-3 border-b border-[#2A2A2A] bg-[#0D0D0D]/50 flex items-center gap-3 flex-shrink-0">
                      {headerIcon ? (
                        <div className="relative h-8 w-8 flex-shrink-0 rounded-lg overflow-hidden border border-[#3F3F3F] bg-[#0D0D0D]">
                          <Image
                            src={headerIcon}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="32px"
                          />
                        </div>
                      ) : null}
                      <h3 className="text-sm font-semibold text-[#ECECEC] uppercase tracking-wider truncate">{typeLabel}</h3>
                    </div>
                    <ul className="divide-y divide-[#2A2A2A] overflow-y-auto flex-1 min-h-0 scrollbar-hide-until-hover" style={{ maxHeight: "220px" }}>
                      {typeEvents.map((ev, idx) => {
                        const isActive = now >= ev.startTime && now < ev.endTime;
                        const startsIn = ev.startTime - now;
                        const endsIn = ev.endTime - now;
                        const startsWithinHour = !isActive && startsIn > 0 && startsIn <= 60 * 60 * 1000;
                        return (
                          <li
                            key={`${ev.map}-${ev.name}-${ev.startTime}-${idx}`}
                            className={`flex items-center justify-between gap-3 py-2.5 transition-colors ${
                              isActive ? "bg-green-500/10" : "hover:bg-[#252525]"
                            }`}
                            style={{ paddingLeft: "1.3rem", paddingRight: "1.3rem" }}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-[#ECECEC] text-sm truncate">{ev.map || "—"}</div>
                              <div className="text-[10px] text-[#8E8E8E]">
                                {new Date(ev.startTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })} – {new Date(ev.endTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
                              </div>
                            </div>
                            <div className="flex-shrink-0 text-right">
                              {isActive ? (
                                <>
                                  <div className="font-mono text-xs text-green-400">{formatRemaining(endsIn)}</div>
                                  <div className="text-[9px] text-[#8E8E8E]">ends in</div>
                                </>
                              ) : (
                                <>
                                  <div className={`font-mono text-xs ${startsWithinHour ? "text-yellow-400" : "text-[#ECECEC]"}`}>{formatRemaining(startsIn)}</div>
                                  <div className="text-[9px] text-[#8E8E8E]">starts in</div>
                                </>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </section>

            {/* Email Notifications Setup */}
            <section className="mt-8 rounded-2xl border border-[#2A2A2A] bg-[#1a1a1a] overflow-hidden hover:border-[#3F3F3F] transition-all">
              <button
                onClick={() => setEmailAlertsExpanded(!emailAlertsExpanded)}
                className="w-full flex items-center justify-between p-4 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <div className="text-left">
                    <h3 className="text-base font-semibold text-[#ECECEC]">📧 Email Event Alerts</h3>
                    {notificationsEnabled && (
                      <p className="text-xs text-green-400">Active</p>
                    )}
                  </div>
                </div>
                <svg
                  className={`h-5 w-5 text-[#8E8E8E] transition-transform ${emailAlertsExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {emailAlertsExpanded && (
                <div className="p-4 pt-0 border-t border-[#2A2A2A]">
                  <p className="text-sm text-[#B4B4B4] mb-4">Get instant email notifications when your favorite events go live!</p>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-[#ECECEC] mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        placeholder="you@example.com"
                        value={userEmail}
                        onChange={(e) => setUserEmail(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg bg-[#0D0D0D] border border-[#2A2A2A] text-[#ECECEC] placeholder-[#8E8E8E] focus:outline-none focus:border-blue-500 transition-colors"
                      />
                      <p className="text-xs text-[#8E8E8E] mt-1">Works great on iPhone! ✨</p>
                    </div>

                    <button
                      onClick={() => {
                        if (userEmail) {
                          const enabled = !notificationsEnabled;
                          setNotificationsEnabled(enabled);
                          localStorage.setItem("userEmail", userEmail);
                          localStorage.setItem("notificationsEnabled", enabled.toString());
                          if (!enabled) {
                            notifiedEventsRef.current = [];
                          }
                        }
                      }}
                      disabled={!userEmail}
                      className={`px-6 py-2 rounded-lg font-medium transition-all ${
                        notificationsEnabled
                          ? "bg-red-500 hover:bg-red-600 text-white"
                          : "bg-blue-500 hover:bg-blue-600 text-white disabled:bg-[#2A2A2A] disabled:text-[#8E8E8E] disabled:cursor-not-allowed"
                      }`}
                    >
                      {notificationsEnabled ? "🔕 Disable Alerts" : "🔔 Enable Alerts"}
                    </button>

                    {notificationsEnabled && (
                      <div className="mt-3 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                        <p className="text-xs text-green-300">
                          ✅ Alerts active for favorite events (Matriarch, Harvester, Dam Night Raids)
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>
          </>
        )}

        {/* Trials Tab */}
        {activeTab === "trials" && (
          <>
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-[#ECECEC] mb-2">Weekly Trials</h2>
              <p className="text-[#B4B4B4] text-sm">
                {trialsWeekStart && trialsWeekEnd ? (
                  <>
                    <span>{new Date(trialsWeekStart).toLocaleDateString("en-US", { month: "short", day: "numeric" })} – {new Date(trialsWeekEnd).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                    <span className="ml-2 font-mono text-zinc-400">
                      {formatTrialsCountdown(
                        new Date(trialsWeekEnd + "T23:59:59").getTime() - now
                      )}{" "}
                      left
                    </span>
                  </>
                ) : (
                  "Trials reset every Monday. Plan runs around 2x modifier maps (Night Raid, EM Storm, Cold Snap, Locked Gate, Hidden Bunker)."
                )}
              </p>
            </div>

            {trials.length === 0 ? (
              <div className="rounded-2xl border border-[#2A2A2A] bg-[#1a1a1a] p-8 text-center">
                <div className="text-[#B4B4B4] mb-2">Loading trials...</div>
              </div>
            ) : (
              <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
                {sortedTrials.map((trial) => (
                  <div
                    key={trial.id}
                    className="rounded-2xl border border-[#2A2A2A] bg-[#1a1a1a] overflow-hidden hover:border-[#3F3F3F] transition-all flex flex-col min-w-0"
                  >
                    {/* Hero image at top */}
                    <div className="relative h-24 w-full overflow-hidden bg-[#0D0D0D]">
                      {trial.image ? (
                        <Image
                          src={trial.image}
                          alt={trial.name}
                          fill
                          className="object-cover"
                          sizes="(min-width: 768px) 33vw, 100vw"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-amber-500/20 to-transparent" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a] via-transparent to-transparent" />
                    </div>

                    <div className="flex-1 p-4 flex flex-col min-h-0">
                      <div className="mb-3">
                        <div className="text-xs text-[#8E8E8E] capitalize">{trial.category}</div>
                        <h3 className="truncate text-lg font-semibold text-[#ECECEC]">{trial.name}</h3>
                      </div>

                      {trial.actionsTo3Stars && (
                        <div className="mb-3 rounded-lg bg-[#141414] px-2.5 py-1.5">
                          <h4 className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider mb-1">
                            To reach 3★
                          </h4>
                          <p className="text-sm font-medium text-white">
                            {trial.actionsTo3Stars}
                          </p>
                        </div>
                      )}

                      {trial.bestMaps && trial.bestMaps.length > 0 && (
                        <div className="mb-3">
                          <h4 className="text-[10px] font-semibold text-[#8E8E8E] uppercase tracking-wider mb-1.5">
                            Best Maps
                          </h4>
                          <ul className="space-y-1">
                            {trial.bestMaps.slice(0, 2).map((m, i) => (
                              <li key={i} className="text-xs">
                                <span className="text-amber-400/90 font-medium">{m.map}</span>
                                <span className="text-[#B4B4B4]"> — {m.reason.slice(0, 50)}{m.reason.length > 50 ? "…" : ""}</span>
                              </li>
                            ))}
                          </ul>
                          {trial.idealConditions && trial.idealConditions.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {trial.idealConditions.slice(0, 3).map((c) => (
                                <span
                                  key={c}
                                  className="inline-flex items-center rounded bg-zinc-700/30 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400"
                                >
                                  2× {c}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {(() => {
                        const activeIdeal = getActiveIdealEventsForTrial(trial);
                        return activeIdeal.length > 0 ? (
                          <div className="mb-3 rounded-lg border border-green-500/40 bg-green-500/10 px-2.5 py-1.5">
                            <div className="mb-1 flex items-center gap-1.5">
                              <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                              <span className="text-[10px] font-semibold text-green-400 uppercase tracking-wider">Live</span>
                            </div>
                            <ul className="space-y-0.5">
                              {activeIdeal.map((ev, i) => (
                                <li key={i} className="text-xs font-medium text-green-400 flex items-center justify-between gap-2">
                                  <span>{ev.name} on {ev.map}</span>
                                  <span className="font-mono text-[10px] shrink-0">{formatRemaining(ev.endTime - now)}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null;
                      })()}

                      {(trial.tips?.length || trial.loadout) && (
                        <div className="mt-auto">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedTrials((prev) => {
                                const next = new Set(prev);
                                if (next.has(trial.id)) next.delete(trial.id);
                                else next.add(trial.id);
                                return next;
                              })
                            }
                            className="mb-3 flex w-full items-center justify-center gap-1.5 text-xs font-medium text-[#B4B4B4] transition-colors hover:text-[#ECECEC]"
                          >
                            {expandedTrials.has(trial.id) ? "Show less" : "Show more"}
                            {expandedTrials.has(trial.id) ? (
                              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                              </svg>
                            ) : (
                              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            )}
                          </button>
                          <div
                            className={`overflow-hidden transition-all duration-150 ease-out ${
                              expandedTrials.has(trial.id) ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0 mb-0"
                            }`}
                          >
                            {trial.tips && trial.tips.length > 0 && (
                              <div className="mb-3">
                                <h4 className="text-[10px] font-semibold text-[#8E8E8E] uppercase tracking-wider mb-1.5">
                                  Tips
                                </h4>
                                <ul className="list-disc list-inside space-y-0.5 text-xs text-[#B4B4B4]">
                                  {trial.tips.slice(0, 2).map((tip, i) => (
                                    <li key={i}>{tip}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {trial.loadout && (
                              <div className="pt-2 border-t border-[#2A2A2A]">
                                <p className="text-[10px] text-[#8E8E8E] uppercase tracking-wider mb-0.5">Loadout</p>
                                <p className="text-xs text-[#B4B4B4]">{trial.loadout}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* News Tab */}
        {activeTab === "news" && (
          <>
            <div className="mb-6 flex items-center justify-between text-sm text-[#8E8E8E]">
              <div>
                <span className="text-[#ECECEC]">Latest Arc Raiders News & Updates</span>
              </div>
              <div>
                Last updated:{" "}
                <span className="text-[#ECECEC]">
                  {newsLastUpdated ? new Date(newsLastUpdated).toLocaleTimeString() : "—"}
                </span>
              </div>
            </div>

            {news.length === 0 ? (
              <div className="rounded-2xl border border-[#2A2A2A] bg-[#1a1a1a] p-8 text-center">
                <div className="text-[#B4B4B4]">Loading news...</div>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {news.map((item) => {
                  const date = new Date(item.date);
                  const isPatch = item.category.toLowerCase().includes("patch");

                  return (
                    <a
                      key={item.id}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group rounded-2xl border border-[#333333] bg-[#111111] overflow-hidden hover:border-[#4B5563] hover:shadow-lg transition-all cursor-pointer flex flex-col block"
                      title={item.description}
                    >
                      {/* Card image: from arcraiders.com when available */}
                      <div className="relative w-full h-36 bg-[#050509]">
                        {item.imageUrl ? (
                          <Image
                            src={item.imageUrl}
                            alt={item.title}
                            fill
                            className="object-cover"
                            sizes="(min-width: 1024px) 25vw, 50vw"
                          />
                        ) : (
                          <Image
                            src="/hg1cbuuezv4f1.png"
                            alt={item.title}
                            fill
                            className="object-cover"
                            sizes="(min-width: 1024px) 25vw, 50vw"
                          />
                        )}
                      </div>

                      {/* Card body: title, optional Patch Notes tag, date */}
                      <div className="flex-1 p-4 bg-[#111111]">
                        <div className="flex items-center justify-between mb-2">
                          {isPatch ? (
                            <span className="inline-flex items-center rounded px-2 py-0.5 text-[11px] font-semibold bg-[#1F2933] text-[#FBBF24]">
                              Patch Notes
                            </span>
                          ) : (
                            <span />
                          )}
                        </div>

                        <h3 className="text-sm font-semibold text-[#F9FAFB] leading-snug mb-2 group-hover:text-[#E5E7EB] line-clamp-2">
                          {item.title}
                        </h3>

                        <p className="text-xs text-[#9CA3AF]">
                          {date.toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    </a>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Twitch Tab */}
        {activeTab === "twitch" && (
          <>
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-[#ECECEC] mb-2">Favorite Streamers</h2>
              <p className="text-[#B4B4B4] text-sm">
                Tracking: LuluLuvely, Tfue, Ninja, TheBurntPeanut, NICKMERCS, cloakzy, HutchMF
              </p>
            </div>

            {twitchError ? (
              <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-6 text-center">
                <p className="text-amber-200 mb-2">{twitchError}</p>
                <p className="text-[#B4B4B4] text-sm">
                  Add <code className="text-[#ECECEC]">TWITCH_CLIENT_ID</code> and <code className="text-[#ECECEC]">TWITCH_CLIENT_SECRET</code> to <code className="text-[#ECECEC]">.env.local</code> to enable. See TWITCH_SETUP.md.
                </p>
              </div>
            ) : twitchStreamers.length === 0 ? (
              <div className="rounded-2xl border border-[#2A2A2A] bg-[#1a1a1a] p-8 text-center">
                <div className="text-[#B4B4B4] mb-2">Loading streamers...</div>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {twitchStreamers.map((streamer) => (
                  <a
                    key={streamer.id}
                    href={streamer.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative rounded-2xl border border-[#2A2A2A] bg-[#1a1a1a] overflow-hidden hover:border-purple-500/40 transition-all block"
                  >
                    {/* Stream Thumbnail or Offline State */}
                    <div className="relative w-full h-48 bg-[#0D0D0D] flex items-center justify-center">
                      {streamer.isLive && streamer.thumbnailUrl ? (
                        <>
                          <Image
                            src={streamer.thumbnailUrl}
                            alt={`${streamer.userName} stream`}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, 50vw"
                          />
                          {/* LIVE Badge */}
                          <div className="absolute top-3 left-3 flex items-center gap-2">
                            <div className="flex items-center gap-1.5 bg-red-500 px-2.5 py-1 rounded-md">
                              <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
                              <span className="text-white text-xs font-bold">LIVE</span>
                            </div>
                            <div className="bg-black/70 px-2.5 py-1 rounded-md">
                              <span className="text-white text-xs font-semibold">
                                {(streamer.viewerCount ?? 0).toLocaleString()} viewers
                              </span>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="text-center">
                          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-[#2A2A2A] flex items-center justify-center">
                            <svg className="w-8 h-8 text-[#8E8E8E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                          </div>
                          <div className="text-[#8E8E8E] text-sm font-medium">Offline</div>
                        </div>
                      )}
                    </div>

                    {/* Stream Info */}
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-purple-600 flex-shrink-0">
                          {streamer.profileImageUrl ? (
                            <Image
                              src={streamer.profileImageUrl}
                              alt={streamer.userName}
                              width={40}
                              height={40}
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm">
                              {(streamer.userName?.[0] ?? "?").toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-semibold text-[#ECECEC] truncate group-hover:text-purple-400 transition-colors">
                            {streamer.userName ?? "Streamer"}
                          </h3>
                          {streamer.isLive && streamer.title ? (
                            <>
                              <p className="text-sm text-[#B4B4B4] line-clamp-2 mt-1">
                                {streamer.title}
                              </p>
                              {streamer.gameName && (
                                <div className="mt-2 inline-flex items-center text-xs text-[#8E8E8E]">
                                  <span className="px-2 py-0.5 rounded-md bg-[#2A2A2A]">
                                    {streamer.gameName}
                                  </span>
                                </div>
                              )}
                            </>
                          ) : (
                            <p className="text-sm text-[#8E8E8E] mt-1">
                              Currently offline
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </>
        )}

      </div>
    </main>
  );
}
