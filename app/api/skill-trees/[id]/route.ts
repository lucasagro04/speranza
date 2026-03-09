import { NextRequest } from "next/server";
import { loadSavedTrees, saveSavedTrees, isValidAllocations, type SavedSkillTree } from "../helpers";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  if (!id) {
    return Response.json({ success: false, error: "ID required" }, { status: 400 });
  }

  const trees = await loadSavedTrees();
  const idx = trees.findIndex((t) => t.id === id);
  if (idx < 0) {
    return Response.json({ success: false, error: "Build not found" }, { status: 404 });
  }

  trees.splice(idx, 1);
  if (!(await saveSavedTrees(trees))) {
    return Response.json(
      { success: false, error: "Failed to delete. Storage may be read-only." },
      { status: 500 }
    );
  }

  return Response.json({ success: true });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  if (!id) {
    return Response.json({ success: false, error: "ID required" }, { status: 400 });
  }

  let body: { username?: string; allocations?: unknown; buildOrder?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const trees = await loadSavedTrees();
  const idx = trees.findIndex((t) => t.id === id);
  if (idx < 0) {
    return Response.json({ success: false, error: "Build not found" }, { status: 404 });
  }

  const existing = trees[idx];

  if (body.username !== undefined) {
    const username = typeof body.username === "string" ? body.username.trim() : "";
    if (!username || username.length > 32) {
      return Response.json({ success: false, error: "Username is required (max 32 characters)" }, { status: 400 });
    }
    existing.username = username;
  }

  if (body.allocations !== undefined) {
    if (!isValidAllocations(body.allocations)) {
      return Response.json({ success: false, error: "Invalid allocations" }, { status: 400 });
    }
    const totalPoints = Object.values(body.allocations as Record<string, number>).reduce((a, b) => a + b, 0);
    if (totalPoints > 75) {
      return Response.json({ success: false, error: "Total points cannot exceed 75" }, { status: 400 });
    }
    existing.allocations = body.allocations as Record<string, number>;
  }

  if (body.buildOrder !== undefined) {
    existing.buildOrder = Array.isArray(body.buildOrder) ? body.buildOrder : undefined;
  }

  if (!(await saveSavedTrees(trees))) {
    return Response.json(
      { success: false, error: "Failed to update. Storage may be read-only." },
      { status: 500 }
    );
  }

  return Response.json({ success: true, tree: existing });
}
