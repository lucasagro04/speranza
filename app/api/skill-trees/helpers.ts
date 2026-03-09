import path from "path";
import fs from "fs";

const DATA_FILE = path.join(process.cwd(), "app", "data", "saved-skill-trees.json");

export type BuildOrderEntry = { skillId: string; rank: number };

export type SavedSkillTree = {
  id: string;
  username: string;
  allocations: Record<string, number>;
  buildOrder?: BuildOrderEntry[];
  createdAt: string;
};

export function loadSavedTrees(): SavedSkillTree[] {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function saveSavedTrees(trees: SavedSkillTree[]): boolean {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(trees, null, 2), "utf-8");
    return true;
  } catch {
    return false;
  }
}

export function isValidAllocations(obj: unknown): obj is Record<string, number> {
  if (!obj || typeof obj !== "object") return false;
  for (const [k, v] of Object.entries(obj)) {
    if (typeof k !== "string" || typeof v !== "number" || v < 0 || !Number.isInteger(v)) return false;
  }
  return true;
}
