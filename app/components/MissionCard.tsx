"use client";

import Image from "next/image";
import { useState } from "react";
import { Star, MapPin, ChevronDown, ChevronUp, Crosshair, Package, Wrench } from "lucide-react";

export type Mission = {
  id: string;
  name: string;
  category: string;
  image?: string;
  actionsTo3Stars?: string;
  bestMaps?: { map: string; reason: string }[];
  idealConditions?: string[];
  tips?: string[];
  loadout?: string;
};

type MissionCardProps = {
  mission: Mission;
  isLive?: boolean;
  liveEvent?: { name: string; map: string; endTime: number };
  formatRemaining?: (ms: number) => string;
  now?: number;
};

function getCategoryAccent(category: string) {
  const c = category?.toLowerCase() ?? "";
  if (c.includes("scaveng") || c.includes("loot") || c.includes("search") || c.includes("open")) {
    return { border: "border-l-amber-500", bg: "bg-amber-500/10", icon: Package };
  }
  if (c.includes("combat") || c.includes("damage")) {
    return { border: "border-l-rose-500", bg: "bg-rose-500/10", icon: Crosshair };
  }
  return { border: "border-l-amber-500/70", bg: "bg-amber-500/5", icon: Star };
}

function shortenLoadout(loadout: string): string {
  const lower = loadout.toLowerCase();
  if (lower.includes("free loadout") || lower.includes("minimal")) return "Free loadout";
  if (lower.includes("zipline") && lower.includes("snap")) return "Ziplines + Snap hooks";
  if (lower.includes("hullcracker")) return "Hullcracker + Heavy ammo";
  if (lower.includes("jupiter") && lower.includes("wolfpack")) return "Jupiter + Wolfpack";
  if (lower.includes("deadline") && lower.includes("mine")) return "Deadline Mines + Wolfpack";
  if (lower.includes("heavy ammo")) return "Heavy ammo + Armor pierce";
  return loadout.slice(0, 40) + (loadout.length > 40 ? "…" : "");
}

export function MissionCard({
  mission,
  isLive = false,
  liveEvent,
  formatRemaining = (ms) => `${Math.floor(ms / 60000)}m`,
  now = Date.now(),
}: MissionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [tipsOpen, setTipsOpen] = useState(false);
  const accent = getCategoryAccent(mission.category);
  const Icon = accent.icon;

  return (
    <div
      className={`
        group relative overflow-hidden rounded-lg border border-white/[0.07] bg-white/[0.03]
        backdrop-blur-sm transition-all duration-300 hover:translateY(-2px)
        ${isLive ? "border-t-2 border-t-green-500" : ""}
      `}
    >
      {/* Collapsed: mission name, top map, live event (if optimal) */}
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full text-left p-4 sm:p-4"
      >
        <div className="flex gap-3">
          {/* Thumbnail — MetaForge trial visuals */}
          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-zinc-900">
            {mission.image ? (
              <Image
                src={mission.image}
                alt={mission.name}
                fill
                className="object-cover"
                sizes="44px"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-500/20 to-transparent">
                <Icon className="h-5 w-5 text-amber-400/80" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            {/* Mission name */}
            <h3 className="truncate text-sm font-semibold text-white">{mission.name}</h3>

            {/* Top map — single line, scannable */}
            {mission.bestMaps?.[0] && (
              <div className="mt-1 flex items-center gap-1.5 text-xs">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-amber-400/80" />
                <span className="font-medium text-amber-400">{mission.bestMaps[0].map}</span>
                {mission.idealConditions?.[0] && (
                  <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                    2× {mission.idealConditions[0]}
                  </span>
                )}
              </div>
            )}

            {/* Live badge — optimal event is up now */}
            {isLive && liveEvent && (
              <div className="mt-1.5 flex items-center gap-1.5 rounded border border-green-500/40 bg-green-500/10 px-2 py-0.5 w-fit">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-[10px] font-semibold text-green-400 uppercase">Live</span>
                <span className="text-[10px] text-green-400">
                  {liveEvent.name} on {liveEvent.map} · {formatRemaining(liveEvent.endTime - now)}
                </span>
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center">
            {expanded ? (
              <ChevronUp className="h-5 w-5 text-zinc-500" />
            ) : (
              <ChevronDown className="h-5 w-5 text-zinc-500" />
            )}
          </div>
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-white/[0.06] px-4 pb-4 pt-2">
          {/* 3-star target — moved to expanded view */}
          {mission.actionsTo3Stars && (
            <div className="mb-3 flex items-center gap-2 rounded-lg bg-amber-500/10 px-2.5 py-2">
              <Star className="h-4 w-4 shrink-0 fill-amber-400 text-amber-400" />
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-400/90">
                  To reach 3★
                </div>
                <div className="text-sm font-semibold text-amber-400">
                  {mission.actionsTo3Stars}
                </div>
              </div>
            </div>
          )}

          {/* Maps + modifiers — full list */}
          {mission.bestMaps && mission.bestMaps.length > 0 && (
            <div className="space-y-2">
              {mission.bestMaps.map((m, i) => (
                <div
                  key={i}
                  className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-xs"
                >
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-amber-400/80" />
                  <span className="font-semibold text-white">{m.map}</span>
                  {mission.idealConditions?.slice(0, 2).map((mod) => (
                    <span
                      key={mod}
                      className="inline rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-zinc-300"
                    >
                      2× {mod}
                    </span>
                  ))}
                  <span className="text-zinc-500">— {m.reason.slice(0, 55)}{m.reason.length > 55 ? "…" : ""}</span>
                </div>
              ))}
            </div>
          )}

          {/* Tips — progressive disclosure */}
          {mission.tips && mission.tips.length > 0 && (
            <div className="mt-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setTipsOpen((o) => !o);
                }}
                className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-white"
              >
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${tipsOpen ? "rotate-180" : ""}`}
                />
                Tips ({mission.tips.length})
              </button>
              {tipsOpen && (
                <ul className="mt-1.5 list-disc list-inside space-y-0.5 pl-1 text-xs text-zinc-400">
                  {mission.tips.map((tip, i) => (
                    <li key={i}>{tip}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Loadout — compact footer badge */}
          {mission.loadout && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-white/[0.04] px-2.5 py-1.5">
              <Wrench className="h-3.5 w-3.5 shrink-0 text-amber-400/70" />
              <span className="text-[11px] text-zinc-400">
                {shortenLoadout(mission.loadout)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
