import { NextRequest } from "next/server";
import { loadSavedTrees, saveSavedTrees, isValidAllocations, type SavedSkillTree } from "./helpers";

export type { BuildOrderEntry, SavedSkillTree } from "./helpers";

export async function GET() {
  const trees = await loadSavedTrees();
  return Response.json({ success: true, trees });
}

export async function POST(request: NextRequest) {
  let body: { username?: string; allocations?: unknown; buildOrder?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const username = typeof body.username === "string" ? body.username.trim() : "";
  if (!username || username.length > 32) {
    return Response.json({ success: false, error: "Username is required (max 32 characters)" }, { status: 400 });
  }

  if (!isValidAllocations(body.allocations)) {
    return Response.json({ success: false, error: "Invalid allocations" }, { status: 400 });
  }

  const totalPoints = Object.values(body.allocations as Record<string, number>).reduce((a, b) => a + b, 0);
  if (totalPoints > 75) {
    return Response.json({ success: false, error: "Total points cannot exceed 75" }, { status: 400 });
  }

  const trees = await loadSavedTrees();
  const newTree: SavedSkillTree = {
    id: `st-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    username,
    allocations: body.allocations as Record<string, number>,
    buildOrder: Array.isArray(body.buildOrder) ? body.buildOrder : undefined,
    createdAt: new Date().toISOString(),
  };
  trees.push(newTree);

  if (!(await saveSavedTrees(trees))) {
    return Response.json(
      { success: false, error: "Failed to save. Storage may be read-only (e.g. on Vercel). Use a database for production." },
      { status: 500 }
    );
  }

  return Response.json({ success: true, tree: newTree });
}
