import path from "path";
import fs from "fs";
import { Redis } from "@upstash/redis";

const DATA_FILE = path.join(process.cwd(), "app", "data", "saved-skill-trees.json");
const KV_KEY = "arc-saved-skill-trees";

export type BuildOrderEntry = { skillId: string; rank: number };

export type SavedSkillTree = {
  id: string;
  username: string;
  allocations: Record<string, number>;
  buildOrder?: BuildOrderEntry[];
  createdAt: string;
};

function hasRedisEnv(): boolean {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return !!(url && token);
}

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

/** Load from Redis (production) or JSON file (local dev) */
export async function loadSavedTrees(): Promise<SavedSkillTree[]> {
  const redis = getRedis();
  if (redis) {
    try {
      const data = await redis.get<SavedSkillTree[]>(KV_KEY);
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }
  // Fallback: local file (works in dev, read-only on Vercel)
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/** Save to Redis (production) or JSON file (local dev) */
export async function saveSavedTrees(trees: SavedSkillTree[]): Promise<boolean> {
  const redis = getRedis();
  if (redis) {
    try {
      await redis.set(KV_KEY, trees);
      return true;
    } catch {
      return false;
    }
  }
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
