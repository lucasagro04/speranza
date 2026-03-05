import trialsData from "@/app/data/trials.json";

export const revalidate = 3600; // 1 hour - trials change weekly

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday = 1
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function GET() {
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  const override = trialsData.currentWeekOverride as { weekStart: string; weekEnd: string; trialIds: string[] } | undefined;
  let trialIds: string[];
  let weekStart: string;
  let weekEnd: string;

  if (override && override.weekStart && override.weekEnd && override.trialIds && today >= override.weekStart && today <= override.weekEnd) {
    trialIds = override.trialIds;
    weekStart = override.weekStart;
    weekEnd = override.weekEnd;
  } else {
    const weekStartDate = getWeekStart(now);
    const epoch = new Date("2026-01-05");
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const weekIndex = Math.floor((weekStartDate.getTime() - epoch.getTime()) / msPerWeek);
    const rotationIndex = Math.max(0, weekIndex % trialsData.weeklyRotation.length);
    trialIds = trialsData.weeklyRotation[rotationIndex] as string[];
    weekStart = weekStartDate.toISOString().split("T")[0];
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 6);
    weekEnd = weekEndDate.toISOString().split("T")[0];
  }

  const trialTypes = trialsData.trialTypes as Record<string, Record<string, unknown>>;
  const trials = trialIds
    .map((id) => trialTypes[id])
    .filter((t): t is Record<string, unknown> => t != null && typeof t === "object");

  return Response.json({
    success: true,
    weekStart,
    weekEnd,
    trials,
  });
}
