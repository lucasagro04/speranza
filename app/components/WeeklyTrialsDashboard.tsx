"use client";

import Image from "next/image";
import { useState, useEffect } from "react";

type TrialCard = {
  id: string;
  name: string;
  image?: string;
  heroGradient: string;
  actionsTo3Stars: string;
  bestMaps: { map: string; reason: string }[];
  idealConditions: string[];
  tips: string[];
  loadout: string;
  live?: { name: string; map: string; endTimeOffset: number };
};

const TRIALS: TrialCard[] = [
  {
    id: "medical-research-containers",
    name: "Search Containers in Medical Research Wing",
    image: "https://cdn.metaforge.app/arc-raiders/custom/cache.webp",
    heroGradient: "from-zinc-600/30 via-zinc-800 to-zinc-900",
    actionsTo3Stars: "~15–20 containers",
    bestMaps: [
      { map: "Stella Montis", reason: "Medical Research Wing on Western side—containers, cabinets, drawers" },
    ],
    idealConditions: ["Night Raid"],
    tips: [
      "Loot every interactible container—even if visually open",
      "Area has Ticks, Sentry turrets, and Shredders—avoid combat",
      "Free loadout works; Stella Montis is PvP-heavy so go light",
    ],
    loadout: "Free loadout recommended. Minimal risk.",
  },
  {
    id: "open-arc-probes",
    name: "Open ARC Probes",
    image: "https://cdn.metaforge.app/arc-raiders/custom/probe.webp",
    heroGradient: "from-amber-600/30 via-zinc-800 to-zinc-900",
    actionsTo3Stars: "6 probes with 2× = 4,002 pts",
    bestMaps: [
      { map: "Spaceport", reason: "Rooftops, fuel storage, control tower—bring ziplines" },
    ],
    idealConditions: ["EM Storm", "Night Raid"],
    tips: [
      "6 probes with 2x = 4,002 points (3 stars)",
      "Rooftop access is key—ziplines and snap hooks essential",
      "Probes spawn at elevated positions",
    ],
    loadout: "Ziplines, snap hooks. Speed and vertical mobility.",
  },
  {
    id: "damage-spotters",
    name: "Damage Spotters",
    image: "https://cdn.metaforge.app/arc-raiders/custom/electrical.webp",
    heroGradient: "from-rose-600/30 via-zinc-800 to-zinc-900",
    actionsTo3Stars: "~4–6 Spotters with 2×",
    bestMaps: [
      { map: "Buried City", reason: "Bombardier spawns with Spotters during EM Storm" },
      { map: "Spaceport", reason: "Bombardier + Spotter pairs; EM Storm or Night Raid" },
    ],
    idealConditions: ["Electromagnetic Storm", "Night Raid"],
    tips: [
      "Spotters are flying drones that assist Bombardiers—shoot them to blind the Bombardier",
      "Spotters respawn after being destroyed—keep Bombardier alive to farm",
      "2x modifier halves the Spotters needed for 3 stars",
    ],
    loadout: "Anvil/Ferro, Renegade III/IV. Herbal Bandages, Shield Rechargers.",
    live: {
      name: "Night Raid",
      map: "Stella Montis",
      endTimeOffset: 57 * 60 * 1000, // ~57 min from now for demo
    },
  },
  {
    id: "loot-birds-nests",
    name: "Loot Bird's Nests",
    image: "https://cdn.metaforge.app/arc-raiders/custom/birdcity.webp",
    heroGradient: "from-teal-600/30 via-zinc-800 to-zinc-900",
    actionsTo3Stars: "~8–10 nests with 2×",
    bestMaps: [
      { map: "Buried City", reason: "Bird City condition—search chimneys on rooftops for nests" },
    ],
    idealConditions: ["Bird City"],
    tips: [
      "Bird City is a minor map condition—only on Buried City",
      "Search Eastern side of map for best density",
      "Rare Rubber Ducks spawn in chimneys—great for credits",
    ],
    loadout: "Snap Hook, 6 Ziplines, 15 Adrenaline Shots. Mobility over combat.",
  },
  {
    id: "damage-leapers",
    name: "Damage Leapers",
    image: "https://cdn.metaforge.app/arc-raiders/custom/matriarch.webp",
    heroGradient: "from-amber-600/30 via-zinc-800 to-zinc-900",
    actionsTo3Stars: "2 kills with 2× = 3,520 pts",
    bestMaps: [
      { map: "Dam Battlegrounds", reason: "4 fixed spawn areas: Water Treatment, Hydroponic, Red Lake, Testing Annex" },
    ],
    idealConditions: ["Night Raid", "EM Storm", "Cold Snap", "Locked Gate", "Hidden Bunker"],
    tips: [
      "Rotate between the 4 spawn areas—enemies respawn every 5-7 minutes",
      "With 2x modifier, only ~2 kills needed for 3 stars",
      "Use Friendly Lobby to avoid PvP while farming",
    ],
    loadout: "Mobility + DPS. Hullcracker or Anvil IV for armor. Bring ziplines for quick rotation.",
  },
];

function formatCountdown(ms: number): string {
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

function formatTimer(ms: number): string {
  const clamped = Math.max(0, ms);
  const totalSeconds = Math.floor(clamped / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function getConditionTagClass(condition: string): string {
  const c = condition.toLowerCase();
  // EM Storm and Night Raid both use green
  if (c.includes("em storm") || c.includes("electromagnetic") || c.includes("night raid")) return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
  if (c.includes("bird city")) return "bg-teal-500/15 text-teal-400 border-teal-500/30";
  return "bg-amber-500/15 text-amber-400 border-amber-500/30";
}

const WEEK_END = new Date("2026-03-08T23:59:59").getTime();

export default function WeeklyTrialsDashboard() {
  const [now, setNow] = useState(0);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [liveEndTimes, setLiveEndTimes] = useState<Record<string, number>>({});

  useEffect(() => {
    const initial: Record<string, number> = {};
    TRIALS.forEach((t) => {
      if (t.live) initial[t.id] = Date.now() + t.live.endTimeOffset;
    });
    setLiveEndTimes(initial);
  }, []);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const countdown = formatCountdown(WEEK_END - now);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/95">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
            <div>
              <h1 className="text-xl font-semibold text-zinc-100">Weekly Trials</h1>
              <p className="text-sm text-zinc-400">Mar 1 – Mar 8, 2026</p>
            </div>
            <div className="font-mono text-base text-yellow-400">
              <span>{countdown}</span>
              <span className="ml-1">left</span>
            </div>
          </div>
        </div>
      </header>

      {/* Cards grid */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          {TRIALS.map((trial) => {
            const isExpanded = expanded[trial.id];
            const hasLive = !!trial.live;
            const liveRemaining = trial.live && liveEndTimes[trial.id]
              ? liveEndTimes[trial.id] - now
              : 0;

            return (
              <div
                key={trial.id}
                className={`rounded-xl border transition-all duration-200 ease-out ${
                  hasLive
                    ? "border-rose-500/40 bg-zinc-900 shadow-[0_0_20px_-5px_rgba(244,63,94,0.15)] hover:border-rose-500/60 hover:shadow-[0_0_24px_-5px_rgba(244,63,94,0.2)]"
                    : "border-zinc-800 bg-zinc-900 hover:border-zinc-700 hover:shadow-lg"
                }`}
              >
                {/* Hero image */}
                <div className="relative h-24 w-full rounded-t-xl overflow-hidden bg-zinc-800">
                  {trial.image ? (
                    <Image
                      src={trial.image}
                      alt={trial.name}
                      fill
                      className="object-cover"
                      sizes="(min-width: 768px) 33vw, 100vw"
                    />
                  ) : (
                    <div className={`h-full w-full bg-gradient-to-br ${trial.heroGradient}`} />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/80 via-transparent to-transparent" />
                </div>

                <div className="p-4">
                  {/* Trial name + star req unified header */}
                  <div className="mb-3">
                    <h2 className="text-base font-semibold text-zinc-100">{trial.name}</h2>
                    <div className="mt-2 rounded-lg border border-[#2A2A2A] bg-zinc-900 px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-400/90">
                        To reach 3★
                      </p>
                      <p className="text-sm font-semibold text-amber-100">
                        {trial.actionsTo3Stars}
                      </p>
                    </div>
                  </div>

                  {/* Condition tags */}
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {trial.idealConditions.map((c) => (
                      <span
                        key={c}
                        className={`inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-medium ${getConditionTagClass(c)}`}
                      >
                        2× {c}
                      </span>
                    ))}
                  </div>

                  {/* LIVE indicator */}
                  {hasLive && trial.live && (
                    <div className="mb-3 flex items-center justify-between gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-2.5 py-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-rose-400 animate-pulse" />
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-rose-400">
                          Live
                        </span>
                        <span className="text-xs text-rose-300">
                          {trial.live.name} on {trial.live.map}
                        </span>
                      </div>
                      <span className="font-mono text-xs text-rose-400">
                        {formatTimer(liveRemaining)}
                      </span>
                    </div>
                  )}

                  {/* Expand/collapse toggle */}
                  <button
                    type="button"
                    onClick={() => toggleExpand(trial.id)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 py-2 text-xs font-medium text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
                  >
                    {isExpanded ? "Hide details" : "Show details"}
                  </button>

                  {/* Collapsible details */}
                  <div
                    className={`overflow-hidden transition-all duration-150 ease-out ${
                      isExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
                    }`}
                  >
                    <div className="mt-3 space-y-3 border-t border-zinc-800 pt-3">
                      {/* Best Maps */}
                      <div>
                        <h4 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                          Best Maps
                        </h4>
                        <ul className="space-y-1">
                          {trial.bestMaps.map((m, i) => (
                            <li key={i} className="text-xs">
                              <span className="font-medium text-amber-400">{m.map}</span>
                              <span className="text-zinc-400"> — {m.reason}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Tips */}
                      <div>
                        <h4 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                          Tips
                        </h4>
                        <ul className="list-disc space-y-0.5 pl-4 text-xs text-zinc-400">
                          {trial.tips.map((tip, i) => (
                            <li key={i}>{tip}</li>
                          ))}
                        </ul>
                      </div>

                      {/* Loadout */}
                      <div>
                        <h4 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                          Loadout
                        </h4>
                        <p className="text-xs text-zinc-400">{trial.loadout}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
