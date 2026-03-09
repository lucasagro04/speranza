import trialsData from "@/app/data/trials.json";

export const revalidate = 3600; // 1 hour - trials change weekly

type MetaForgeTrial = {
  id: string;
  name: string;
  image_url?: string;
  guide_link?: string | null;
  is_active?: boolean;
  upcoming?: boolean;
};

type MetaForgeResponse = {
  data?: MetaForgeTrial[];
  activeWindowEnd?: number;
  nextWindowStart?: number;
};

function inferCategory(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("damage") || n.includes("destroy") || n.includes("kill")) return "combat";
  if (n.includes("search") || n.includes("open") || n.includes("loot") || n.includes("deliver") || n.includes("download")) return "scavenging";
  return "combat";
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// Map MetaForge trial names to our local trial IDs for tips/strategies
const METAFORGE_TO_LOCAL: Record<string, string> = {
  "damage rocketeers, leapers or bastions": "damage-leapers",
  "destroy ticks": "destroy-ticks",
  "damage wasps": "damage-wasps",
  "damage hornets": "damage-hornets",
  "open arc probes": "open-arc-probes",
  "hidden bunker downloads": "hidden-bunker-downloads",
  "damage queens/matriarchs": "damage-queens-matriarchs",
  "damage queens matriarchs": "damage-queens-matriarchs",
  "destroy arc enemies in the swamp": "destroy-arc-enemies-swamp",
  "open containers inside the traffic tunnels": "open-containers-traffic-tunnels",
  "search raider caches": "search-raider-caches",
};

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function GET() {
  const trialTypes = trialsData.trialTypes as Record<string, Record<string, unknown>>;

  try {
    const res = await fetch("https://metaforge.app/api/arc-raiders/weekly-trials", {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 },
    });

    if (res.ok) {
      const data = (await res.json()) as MetaForgeResponse;
      const active = (data.data ?? []).filter((t) => t.is_active);

      if (active.length > 0) {
        const weekEnd = data.activeWindowEnd
          ? new Date(data.activeWindowEnd * 1000).toISOString().split("T")[0]
          : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
        const weekStart = data.activeWindowEnd
          ? new Date((data.activeWindowEnd - 7 * 24 * 60 * 60) * 1000).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0];

        const trials = active.map((t) => {
          const slug = slugify(t.name);
          const localId = METAFORGE_TO_LOCAL[t.name.toLowerCase()] ?? slug;
          const localData = trialTypes[localId] as Record<string, unknown> | undefined;
          return {
            id: slug,
            name: t.name,
            category: (localData?.category as string) ?? inferCategory(t.name),
            image: t.image_url ?? (localData?.image as string),
            ...(localData && typeof localData === "object"
              ? {
                  actionsTo3Stars: localData.actionsTo3Stars as string | undefined,
                  bestMaps: localData.bestMaps as { map: string; reason: string }[] | undefined,
                  idealConditions: localData.idealConditions as string[] | undefined,
                  tips: localData.tips as string[] | undefined,
                  strategies: localData.strategies as string[] | undefined,
                  loadout: localData.loadout as string | undefined,
                }
              : {}),
          };
        });

        return Response.json({
          success: true,
          weekStart,
          weekEnd,
          trials,
          source: "metaforge",
        });
      }
    }
  } catch {
    // Fall through to local fallback
  }

  // Fallback: local trials.json
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const override = trialsData.currentWeekOverride as { weekStart: string; weekEnd: string; trialIds: string[] } | undefined;
  let trialIds: string[];
  let weekStart: string;
  let weekEnd: string;

  if (override?.weekStart && override?.weekEnd && override?.trialIds && today >= override.weekStart && today <= override.weekEnd) {
    trialIds = override.trialIds;
    weekStart = override.weekStart;
    weekEnd = override.weekEnd;
  } else {
    const weekStartDate = getWeekStart(now);
    const epoch = new Date("2026-01-05").getTime();
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const weekIndex = Math.floor((weekStartDate.getTime() - epoch) / msPerWeek);
    const rotation = trialsData.weeklyRotation as string[][];
    const rotationIndex = Math.max(0, weekIndex % rotation.length);
    trialIds = rotation[rotationIndex] ?? [];
    weekStart = weekStartDate.toISOString().split("T")[0];
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 6);
    weekEnd = weekEndDate.toISOString().split("T")[0];
  }

  const trials = trialIds
    .map((id) => trialTypes[id])
    .filter((t): t is Record<string, unknown> => t != null && typeof t === "object");

  return Response.json({
    success: true,
    weekStart,
    weekEnd,
    trials,
    source: "local",
  });
}
