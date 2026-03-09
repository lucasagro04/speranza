"use client";

import Image from "next/image";
import { Crosshair, Package, Star } from "lucide-react";

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
    return { border: "border-l-amber-500", icon: Package };
  }
  if (c.includes("combat") || c.includes("damage")) {
    return { border: "border-l-rose-500", icon: Crosshair };
  }
  return { border: "border-l-amber-500/70", icon: Star };
}

export function MissionCard({
  mission,
  isLive = false,
  liveEvent,
  formatRemaining = (ms) => `${Math.floor(ms / 60000)}m`,
  now = Date.now(),
}: MissionCardProps) {
  const accent = getCategoryAccent(mission.category);
  const Icon = accent.icon;
  const primaryMap = mission.bestMaps?.[0];

  return (
    <div
      className={`
        group relative overflow-hidden rounded-lg border border-white/[0.07] bg-white/[0.03]
        backdrop-blur-sm transition-all duration-300 hover:border-white/[0.12] hover:translateY(-1px)
        flex flex-col
      `}
    >
      {/* Header: image + name */}
      <div className="flex gap-3 p-4 pb-2">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-zinc-900">
          {mission.image ? (
            <Image
              src={mission.image}
              alt={mission.name}
              fill
              className="object-cover"
              sizes="48px"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-500/20 to-transparent">
              <Icon className="h-6 w-6 text-amber-400/80" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-white leading-tight line-clamp-2">{mission.name}</h3>
        </div>
      </div>

      {/* 3-star target */}
      {mission.actionsTo3Stars && (
        <div className="mx-4 mb-3 rounded-lg px-2.5 py-2 bg-white/[0.04]">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-400/90">To reach 3★</div>
          <div className="text-xs font-semibold text-white truncate">{mission.actionsTo3Stars}</div>
        </div>
      )}

      {/* Best map */}
      {primaryMap && (
        <div className="px-4 mb-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Best map</span>
          <p className="text-xs font-medium text-white truncate">{primaryMap.map}</p>
        </div>
      )}

      {/* LIVE badge — only when event is on primary best map */}
      {isLive && liveEvent && (
        <div className="mx-4 mb-3 flex items-center gap-2 rounded-lg border border-green-500/40 bg-green-500/10 px-2.5 py-1.5">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[10px] font-semibold text-green-400 uppercase">Live</span>
          <span className="text-[12px] text-green-400 truncate min-w-0">
            {liveEvent.name} on {liveEvent.map} · {formatRemaining(liveEvent.endTime - now)}
          </span>
        </div>
      )}

      {/* Loadout — single line, subtle */}
      {mission.loadout && (
        <div className="mt-auto px-4 pb-4 pt-1">
          <p className="text-[11px] text-zinc-500 line-clamp-2">{mission.loadout}</p>
        </div>
      )}
    </div>
  );
}
