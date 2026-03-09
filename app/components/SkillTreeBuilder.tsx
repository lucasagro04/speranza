"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import skillTreeData from "../data/skill-tree.json";
import {
  Activity, ArrowUp, ArrowUpRight, ArrowUpFromLine, Box, Bug, ChevronDown, ChevronRight, Circle, CircleDot, Crosshair, Dumbbell,
  Footprints, Gift, GitBranch, Hammer, Heart, HeartPulse, Infinity, Key, Mountain, Move, MoveHorizontal,
  Package, Pencil, RotateCcw, Save, Search, Shield, ShieldAlert, Sparkles, Swords, Timer, Trash2, Volume1, Volume2,
  VolumeX, Weight, Wind, Wrench, Zap, Lock,
} from "lucide-react";

type SkillDef = {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  maxPoints: number;
  requires: string[];
  /** When true, skill unlocks if ANY prerequisite has points (OR). Otherwise all required (AND). */
  requiresAny?: boolean;
  treeThreshold?: number;
};

type Allocations = Record<string, number>;

/** One point spent: index in array = build order (1-based for display) */
type BuildOrderEntry = { skillId: string; rank: number };
type BuildOrder = BuildOrderEntry[];

type SavedSkillTree = {
  id: string;
  username: string;
  allocations: Record<string, number>;
  buildOrder?: BuildOrder;
  createdAt: string;
};

function allocationsFromBuildOrder(buildOrder: BuildOrder): Allocations {
  const out: Allocations = {};
  for (const { skillId, rank } of buildOrder) {
    out[skillId] = (out[skillId] ?? 0) + 1;
  }
  return out;
}

/** Convert legacy allocations to build order (deterministic: by tree, then by skill order) */
function buildOrderFromAllocations(allocations: Allocations, treeData: SkillTreeData): BuildOrder {
  const order: BuildOrder = [];
  for (const tree of treeData.trees) {
    for (const skill of tree.skills) {
      const count = allocations[skill.id] ?? 0;
      for (let r = 1; r <= count; r++) {
        order.push({ skillId: skill.id, rank: r });
      }
    }
  }
  return order;
}

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; color?: string; className?: string; strokeWidth?: number }>> = {
  Activity, ArrowUp, ArrowUpRight, ArrowUpFromLine, Box, Bug, Circle, CircleDot, Crosshair, Dumbbell,
  Footprints, Gift, Hammer, Heart, HeartPulse, Infinity, Key, Mountain, Move, MoveHorizontal,
  Package, RotateCcw, Search, Shield, ShieldAlert, Sparkles, Swords, Timer, Volume1, Volume2,
  VolumeX, Weight, Wind, Wrench, Zap, Lock,
};

type TreeDef = {
  id: string;
  name: string;
  color: string;
  skills: SkillDef[];
};

type SkillTreeData = {
  maxPoints: number;
  trees: TreeDef[];
};

// Category colors per spec
const TREE_COLORS: Record<string, string> = {
  conditioning: "#00ff88",
  mobility: "#ffcc00",
  survival: "#ff3344",
};

/** Returns a short badge for the right side (e.g. "+3%", "-25%") - null if no simple numeric */
function getSkillEffectBadge(skillId: string, points: number): string | null {
  if (points <= 0) return null;
  const p = points;
  const badges: Record<string, () => string | null> = {
    "nimble-climber": () => `+${Math.round((p / 5) * 15)}%`,
    "marathon-runner": () => `+${(p / 5 * 3).toFixed(1)}s`,
    "slip-and-slide": () => `+${Math.round((p / 5) * 20)}%`,
    "youthful-lungs": () => `+${Math.round((p / 5) * 24)}%`,
    "sturdy-ankles": () => `-${Math.round((p / 5) * 25)}%`,
    "carry-the-momentum": () => "+3s",
    "calming-stroll": () => "+33%",
    "effortless-roll": () => `-${Math.round((p / 5) * 30)}%`,
    "crawl-before-you-walk": () => `+${Math.round((p / 5) * 25)}%`,
    "off-the-wall": () => `+${Math.round((p / 5) * 20)}%`,
    "heroic-leap": () => `+${Math.round((p / 5) * 25)}%`,
    "ready-to-roll": () => `+${Math.round((p / 5) * 30)}%`,
    "agile-croucher": () => `+${(p * 2.5).toFixed(0)}%`,
    "looters-instincts": () => `+${p * 5}%`,
    "revitalizing-squat": () => `+${p * 4}%`,
    "silent-scavenger": () => `-${Math.round((p / 5) * 25)}%`,
    "good-as-new": () => "+18%",
    "broad-shoulders": () => `+${p * 2}`,
    "stubborn-mule": () => `+${(p / 5 * 11.6).toFixed(1)}%`,
    "three-deep-breaths": () => `+${(p * 0.5).toFixed(1)}s`,
    "used-to-the-weight": () => `-${Math.round((p / 5) * 50)}%`,
    "blast-born": () => `-${(p / 5 * 4).toFixed(1)}s`,
    "gentle-pressure": () => `-${p * 5}m`,
    "fight-or-flight": () => `+${[2.82, 5.9, 8.97, 12.56, 15.64][Math.min(p, 5) - 1]}%`,
    "proficient-pryer": () => `+${p < 5 ? p * 5 : 25}%`,
    "survivors-stamina": () => "+25%",
    "downed-but-determined": () => `+${p * 6}s`,
    "effortless-swing": () => `+${Math.min(p, 5)}`,
    "turtle-crawl": () => `+${(p * 6.6).toFixed(0)}%`,
  };
  return badges[skillId]?.() ?? null;
}

// Effect summaries (wiki-sourced) - format: "+X% to [effect]" or "-X% to [effect]", no skill names
function getSkillEffectSummary(skillId: string, points: number): string {
  if (points <= 0) return "";
  const p = points;
  const effects: Record<string, () => string> = {
    "nimble-climber": () => `+${Math.round((p / 5) * 15)}% to fast climb/vault`,
    "marathon-runner": () => `+${(p / 5 * 3).toFixed(1)}s to extra sprint duration`,
    "slip-and-slide": () => `+${Math.round((p / 5) * 20)}% to sliding and evasive actions`,
    "youthful-lungs": () => `+${Math.round((p / 5) * 24)}% to max stamina`,
    "sturdy-ankles": () => `+${Math.round((p / 5) * 25)}% to fall damage reduction`,
    "carry-the-momentum": () => `+3s free sprint after dodge roll (8s cooldown)`,
    "calming-stroll": () => `+33% to stamina regen while walking`,
    "effortless-roll": () => `+${Math.round((p / 5) * 30)}% to dodge roll cost reduction`,
    "crawl-before-you-walk": () => `+${Math.round((p / 5) * 25)}% to crawl speed when downed`,
    "off-the-wall": () => `+${Math.round((p / 5) * 20)}% to wall-leap distance`,
    "heroic-leap": () => `+${Math.round((p / 5) * 25)}% to sprint-dodge distance`,
    "vigorous-vaulter": () => `No vault slow when exhausted`,
    "ready-to-roll": () => `+${Math.round((p / 5) * 30)}% to recovery roll window`,
    "vaults-on-vaults": () => `Vaulting costs no stamina`,
    "vault-spring": () => `Jump at end of vault`,
    "agile-croucher": () => `+${(p * 2.5).toFixed(0)}% to crouch speed (max 10%)`,
    "looters-instincts": () => `+${p * 5}% to looting speed (max 25%)`,
    "revitalizing-squat": () => `+${p * 4}% to stamina regen while crouched (max 20%)`,
    "silent-scavenger": () => `+${Math.round((p / 5) * 25)}% to looting noise reduction`,
    "in-round-crafting": () => `Unlocks field crafting`,
    "suffer-in-silence": () => `Quieter movement when critically hurt`,
    "good-as-new": () => `+18% to stamina regen during healing`,
    "broad-shoulders": () => `+${p * 2} to carry weight (max +10)`,
    "traveling-tinkerer": () => `Unlocks 7+ additional craftables`,
    "stubborn-mule": () => `+${(p / 5 * 11.6).toFixed(1)}% to stamina regen when over-encumbered`,
    "looters-luck": () => `Chance to reveal 2 items at once`,
    "one-raiders-scraps": () => `Chance for extra loot in Raider containers`,
    "three-deep-breaths": () => `+${(p * 0.5).toFixed(1)}s to exhaustion recovery`,
    "security-breach": () => `Breach Security Lockers`,
    "minesweeper": () => `Defuse mines and deployables`,
    "used-to-the-weight": () => `+${Math.round((p / 5) * 50)}% to shield movement penalty reduction`,
    "blast-born": () => `Explosion deafness: 8.5s → ${(8.5 - (p / 5) * 4).toFixed(1)}s`,
    "gentle-pressure": () => `+${p * 5}m to breach noise range reduction`,
    "fight-or-flight": () => `+${[2.82, 5.9, 8.97, 12.56, 15.64][Math.min(p, 5) - 1]}% stamina restored on hit`,
    "proficient-pryer": () => `+${p < 5 ? p * 5 : 25}% to breaching speed`,
    "survivors-stamina": () => `+25% to stamina regen when critically hurt`,
    "unburdened-roll": () => `20s window for free roll after shield break`,
    "downed-but-determined": () => `+${p * 6}s before collapse when downed`,
    "a-little-extra": () => `1–2 materials per breach`,
    "effortless-swing": () => `+${p < 5 ? p : 5} melee swings (standing)`,
    "turtle-crawl": () => `+${(p * 6.6).toFixed(0)}% to damage reduction when downed (max 33%)`,
    "loaded-arms": () => `50% weapon weight reduction`,
    "sky-clearing-swing": () => `Increased melee damage vs drones`,
    "back-on-your-feet": () => `Regen to 30% health (30s after no damage)`,
    "flyswatter": () => `One-shot Wasps and Turrets`,
  };
  return effects[skillId]?.() ?? "";
}

// Renders effect text with numeric/attribute values highlighted in green (matches event timer styling)
// "(max X%)" is kept in neutral color - never highlighted green
function renderEffectWithGreenValues(effect: string): React.ReactNode[] {
  const maxPattern = /(\(max\s+[\d.]+%\))/g;
  const valuePattern = /([+-][\d.]+%|[+-][\d.]+[ms]?|[\d.]+ sec|[\d.]+–[\d.]+|[\d.]+s → [\d.]+s|[\d.]+%|\d+s window|\d+s after|\d+ melee swings?|\d+–\d+ materials)/g;
  const parts: { text: string; isMax: boolean }[] = [];
  let lastEnd = 0;
  let maxMatch;
  while ((maxMatch = maxPattern.exec(effect)) !== null) {
    if (maxMatch.index > lastEnd) {
      parts.push({ text: effect.slice(lastEnd, maxMatch.index), isMax: false });
    }
    parts.push({ text: maxMatch[0], isMax: true });
    lastEnd = maxMatch.index + maxMatch[0].length;
  }
  if (lastEnd < effect.length) {
    parts.push({ text: effect.slice(lastEnd), isMax: false });
  }
  if (parts.length === 0) parts.push({ text: effect, isMax: false });

  const segments: React.ReactNode[] = [];
  let keyIdx = 0;
  for (const { text, isMax } of parts) {
    if (isMax) {
      segments.push(<span key={`max-${keyIdx++}`}>{text}</span>);
    } else {
      let lastIndex = 0;
      let match;
      while ((match = valuePattern.exec(text)) !== null) {
        if (match.index > lastIndex) {
          segments.push(text.slice(lastIndex, match.index));
        }
        segments.push(<span key={`val-${keyIdx++}`} className="text-green-400 font-medium">{match[0]}</span>);
        lastIndex = match.index + match[0].length;
      }
      if (lastIndex < text.length) {
        segments.push(text.slice(lastIndex));
      }
    }
  }
  return segments.length > 0 ? segments : [effect];
}

type NodeLayout = {
  skill: SkillDef;
  treeId: string;
  treeColor: string;
  x: number;
  y: number;
  tier: number;
  isGateway: boolean;
};

const treeData = skillTreeData as SkillTreeData;

// Organic layout: Mobility center, Conditioning left, Survival right
const NODE_R = 18;
const GATEWAY_SCALE = 1.5;
const ALLOC_PILL_BELOW_NODE = 12 + 8; // distance from node center to allocation pill bottom (pill at r+12, height 16)
const BASE_OFFSET_X = 400;
const BASE_OFFSET_Y = 8; // nodes higher so gap appears below the horizontal line
const LINE_NODE_GAP = 0; // lines meet the circle top edge—no gap so they reach the node
const PATH_VERTICAL_INSET = 3; // verticals stop before horizontal so they mesh cleanly instead of sticking through
const TREE_OFFSET_X = 360;
const ROW_GAP = 82;
const COL_GAP = 68;

function computeOrganicLayout(): NodeLayout[] {
  const layouts: NodeLayout[] = [];
  const byId = new Map<string, { skill: SkillDef; treeId: string; treeColor: string }>();

  treeData.trees.forEach((tree) => {
    const color = TREE_COLORS[tree.id] ?? tree.color;
    tree.skills.forEach((s) => byId.set(s.id, { skill: s, treeId: tree.id, treeColor: color }));
  });

  const tierMap = new Map<string, number>();
  const assignTier = (id: string): number => {
    if (tierMap.has(id)) return tierMap.get(id)!;
    const skill = byId.get(id)?.skill;
    if (!skill || skill.requires.length === 0) return 0;
    const maxPrereq = Math.max(...skill.requires.map(assignTier));
    tierMap.set(id, maxPrereq + 1);
    return maxPrereq + 1;
  };
  byId.forEach((_, id) => assignTier(id));

  const colMap = new Map<string, number>();
  const tiersByTree = new Map<string, string[][]>();

  treeData.trees.forEach((tree) => {
    const tiers: string[][] = [];
    tree.skills.forEach((s) => {
      const t = tierMap.get(s.id) ?? 0;
      const tierIndex = typeof t === "number" && !Number.isNaN(t) ? Math.max(0, t) : 0;
      while (tiers.length <= tierIndex) tiers.push([]);
      tiers[tierIndex].push(s.id);
    });
    tiersByTree.set(tree.id, tiers);

    tiers.forEach((ids) => {
      ids.forEach((id, i) => {
        const skill = byId.get(id)!.skill;
        let col: number;
        if (skill.requires.length === 0) col = 0;
        else if (skill.requires.length === 1) col = colMap.get(skill.requires[0]) ?? 0;
        else {
          const parentCols = skill.requires.map((r) => colMap.get(r) ?? 0);
          col = Math.round(parentCols.reduce((a, b) => a + b, 0) / parentCols.length);
        }
        const taken = new Set(ids.slice(0, i).map((x) => colMap.get(x)));
        while (taken.has(col)) col++;
        colMap.set(id, col);
      });
    });
  });

  const treeOffsets: Record<string, { x: number }> = {
    conditioning: { x: -TREE_OFFSET_X },
    mobility: { x: 0 },
    survival: { x: TREE_OFFSET_X },
  };

  treeData.trees.forEach((tree) => {
    const color = TREE_COLORS[tree.id] ?? tree.color;
    const tiers = tiersByTree.get(tree.id)!;
    const maxTier = tiers.length - 1;
    const offsetX = treeOffsets[tree.id].x;

    tree.skills.forEach((skill) => {
      const tier = tierMap.get(skill.id) ?? 0;
      const col = colMap.get(skill.id) ?? 0;
      const tierIds = tiers[tier] ?? [skill.id];
      if (tierIds.length === 0) return;
      const cols = tierIds.map((id) => colMap.get(id) ?? 0);
      const minCol = Math.min(...cols);
      const maxCol = Math.max(...cols);
      const tierSpan = maxCol - minCol;
      const centerX = minCol + tierSpan / 2;
      const colOffset = (col - centerX) * COL_GAP;

      const x = BASE_OFFSET_X + offsetX + colOffset;
      const y = BASE_OFFSET_Y + (maxTier - tier) * ROW_GAP;

      const isGateway =
        skill.requires.length === 0 ||
        (skill.treeThreshold !== undefined && (skill.treeThreshold === 15 || skill.treeThreshold === 36));

      layouts.push({ skill, treeId: tree.id, treeColor: color, x, y, tier, isGateway });
    });
  });

  return layouts;
}

function SkillTreeNode({
  layout,
  current,
  maxPoints,
  unlocked,
  canAdd,
  canRemove,
  allocations,
  onAdd,
  onRemove,
  onHover,
}: {
  layout: NodeLayout;
  current: number;
  maxPoints: number;
  unlocked: boolean;
  canAdd: boolean;
  canRemove: boolean;
  allocations: Allocations;
  onAdd: () => void;
  onRemove: () => void;
  onHover: (skill: SkillDef | null, e?: React.MouseEvent) => void;
}) {
  const { x, y, skill, treeColor, isGateway } = layout;
  const r = isGateway ? NODE_R * GATEWAY_SCALE : NODE_R;
  const ringWidth = isGateway ? 5 : 4;
  const progress = maxPoints > 0 ? current / maxPoints : 0;
  const IconComponent = skill.icon ? ICON_MAP[skill.icon] : null;

  return (
    <g
      transform={`translate(${x}, ${y})`}
      style={{ cursor: canAdd || canRemove ? "pointer" : "default" }}
      onClick={(e) => {
        if (canAdd) onAdd();
        e.stopPropagation();
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (canRemove) onRemove();
      }}
      onMouseEnter={(e) => onHover(skill, e)}
      onMouseMove={(e) => skill && onHover(skill, e)}
      onMouseLeave={() => onHover(null)}
    >
      {/* Background circle - green fill when completed, grey when not */}
      <circle r={r} fill={progress >= 1 ? treeColor : "#1a1d24"} />

      {/* Progress ring - unfilled track (only for unlocked/selected nodes) */}
      {unlocked && (
        <circle
          r={r - ringWidth / 2}
          cx={0}
          cy={0}
          fill="none"
          stroke={treeColor}
          strokeWidth={ringWidth}
          strokeOpacity={0.35}
          style={{ pointerEvents: "none" }}
        />
      )}

      {/* Progress ring - filled arc (clockwise) */}
      {progress > 0 && (
        <circle
          r={r - ringWidth / 2}
          cx={0}
          cy={0}
          fill="none"
          stroke={treeColor}
          strokeWidth={ringWidth}
          strokeDasharray={`${2 * Math.PI * (r - ringWidth / 2) * progress} ${2 * Math.PI * (r - ringWidth / 2) * (1 - progress)}`}
          strokeDashoffset={0}
          strokeLinecap="round"
          transform="rotate(-90)"
          className="transition-all duration-300"
          style={{ pointerEvents: "none" }}
        />
      )}

      {/* Lock icon */}
      {!unlocked && (
        <g transform={`translate(${-r - 4}, ${-r - 4})`} style={{ pointerEvents: "none" }}>
          <foreignObject x={0} y={0} width={14} height={14} style={{ pointerEvents: "none" }}>
            <div className="flex items-center justify-center w-full h-full" style={{ pointerEvents: "none" }}>
              <Lock size={10} color="#4a5568" />
            </div>
          </foreignObject>
        </g>
      )}

      {/* Icon - centered in circle */}
      {IconComponent && (
        <foreignObject x={-r} y={-r} width={r * 2} height={r * 2} style={{ pointerEvents: "none" }}>
          <div
            className="flex items-center justify-center w-full h-full"
            style={{
              pointerEvents: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              height: "100%",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 0 }}>
              <IconComponent
                size={isGateway ? 24 : 18}
                color={
                  !unlocked
                    ? "#4a5568"
                    : progress >= 1
                      ? "#000000"
                      : current > 0
                        ? "#ffffff"
                        : `${treeColor}cc`
                }
                strokeWidth={progress >= 1 ? 3 : 2}
              />
            </span>
          </div>
        </foreignObject>
      )}

      {/* Skill allocation in oval container below node - grey fill, tree color outline */}
      <g transform={`translate(0, ${r + 12})`} style={{ pointerEvents: "none" }}>
        <rect
          x={-24}
          y={-8}
          width={48}
          height={16}
          rx={8}
          ry={8}
          fill={progress >= 1 ? treeColor : "#1a1d24"}
          stroke={treeColor}
          strokeWidth={1.5}
          fillOpacity={1}
        />
        <text
          textAnchor="middle"
          dominantBaseline="central"
          className="font-mono text-[10px] font-semibold tabular-nums"
          fill={progress >= 1 ? "#0a0e1a" : treeColor}
          style={{ opacity: unlocked ? 1 : 0.7 }}
        >
          {current}/{maxPoints}
        </text>
      </g>

      {/* Invisible larger hit area on top for easier hover/click */}
      <circle r={Math.max(r + 8, 28)} fill="transparent" />
    </g>
  );
}

function SkillTreeCanvas({
  layouts,
  allocations,
  getTreePoints,
  isSkillUnlocked,
  addPoint,
  removePoint,
  totalUsed,
  maxPoints,
  hoveredSkill,
  setHoveredSkill,
  categoryLabels,
}: {
  layouts: NodeLayout[];
  allocations: Allocations;
  getTreePoints: (treeId: string) => number;
  isSkillUnlocked: (skill: SkillDef, treeId: string) => boolean;
  addPoint: (skillId: string) => void;
  removePoint: (skillId: string) => void;
  totalUsed: number;
  maxPoints: number;
  hoveredSkill: SkillDef | null;
  setHoveredSkill: (skill: SkillDef | null, e?: React.MouseEvent) => void;
  categoryLabels: { id: string; name: string; points: number; color: string; center: { x: number; y: number } }[];
}) {
  const pointsRemaining = maxPoints - totalUsed;
  const byId = new Map(layouts.map((l) => [l.skill.id, l]));

  const connections = useMemo(() => {
    const lines: { from: NodeLayout; to: NodeLayout; treeColor: string; startY: number; endY: number }[] = [];
    layouts.forEach((layout) => {
      layout.skill.requires.forEach((reqId) => {
        const fromLayout = byId.get(reqId);
        if (fromLayout) {
          const fromR = fromLayout.isGateway ? NODE_R * GATEWAY_SCALE : NODE_R;
          const toR = layout.isGateway ? NODE_R * GATEWAY_SCALE : NODE_R;
          const startY = fromLayout.y + fromR + ALLOC_PILL_BELOW_NODE;
          const endY = layout.y - toR - LINE_NODE_GAP;
          lines.push({ from: fromLayout, to: layout, treeColor: layout.treeColor, startY, endY });
        }
      });
    });
    return lines;
  }, [layouts, byId]);

  // Shared midY per tier so all paths to the same row use one horizontal—prevents verticals sticking out past each other
  const midYByTier = useMemo(() => {
    const byTier = new Map<number, number[]>();
    connections.forEach(({ to, startY, endY }) => {
      const tier = to.tier;
      const mid = (startY + endY) / 2;
      if (!byTier.has(tier)) byTier.set(tier, []);
      byTier.get(tier)!.push(mid);
    });
    const result = new Map<number, number>();
    byTier.forEach((mids, tier) => {
      result.set(tier, Math.min(...mids));
    });
    return result;
  }, [connections]);

  const midYByChild = useMemo(() => {
    const map = new Map<string, number>();
    connections.forEach(({ to, startY, endY }) => {
      const midY = midYByTier.get(to.tier) ?? (startY + endY) / 2;
      map.set(to.skill.id, midY);
    });
    return map;
  }, [connections, midYByTier]);

  // Nodes on allocated path: has points or is prerequisite (only the path actually taken)
  // For requiresAny skills, only add the prerequisite(s) that have points—don't light up sibling branches
  const nodesOnAllocatedPath = useMemo(() => {
    const set = new Set<string>();
    const addPrereqs = (id: string) => {
      if (set.has(id)) return;
      set.add(id);
      const layout = byId.get(id);
      if (!layout) return;
      const skill = layout.skill;
      if (skill.requiresAny) {
        // Only add prerequisites that have points or are already on the path (avoids lighting sibling branches)
        skill.requires.forEach((reqId) => {
          if ((allocations[reqId] ?? 0) > 0 || set.has(reqId)) addPrereqs(reqId);
        });
      } else {
        skill.requires.forEach(addPrereqs);
      }
    };
    layouts.forEach((l) => {
      if ((allocations[l.skill.id] ?? 0) > 0) addPrereqs(l.skill.id);
    });
    return set;
  }, [layouts, allocations, byId]);

  const isConnectionHighlighted = useCallback(
    (toId: string) => nodesOnAllocatedPath.has(toId),
    [nodesOnAllocatedPath]
  );

  const labelTopY = Math.min(...categoryLabels.map((c) => c.center.y));
  const padding = 50;
  const minX = Math.min(...layouts.map((l) => l.x - NODE_R * 2), ...categoryLabels.map((c) => c.center.x - 100));
  const maxX = Math.max(...layouts.map((l) => l.x + NODE_R * 2), ...categoryLabels.map((c) => c.center.x + 100));
  const minY = Math.min(...layouts.map((l) => l.y - NODE_R * 2), labelTopY - 30);
  const maxY = Math.max(...layouts.map((l) => l.y + NODE_R * 2));
  const contentWidth = maxX - minX;
  const contentHeight = maxY - minY;
  const width = Math.max(800, contentWidth + padding * 2);
  const height = Math.max(600, contentHeight + padding * 2);
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const viewBoxMinX = centerX - width / 2;
  const viewBoxMinY = centerY - height / 2;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`${viewBoxMinX} ${viewBoxMinY} ${width} ${height}`}
      className="overflow-visible"
    >
      {/* Paths: two-pass render so highlighted paths fully cover grey (no masking/bleed) */}
      <g>
        {/* Pass 1: grey base paths */}
        {connections.map(({ from, to, startY, endY }) => {
          const startX = from.x;
          const endX = to.x;
          const midY = midYByChild.get(to.skill.id) ?? (startY + endY) / 2;
          const vertEndY = midY - PATH_VERTICAL_INSET;
          const vertStartY = midY + PATH_VERTICAL_INSET;
          const pathD = `M ${startX} ${startY} L ${startX} ${vertEndY} L ${startX} ${midY} L ${endX} ${midY} L ${endX} ${vertStartY} L ${endX} ${endY}`;
          return (
            <path
              key={`${from.skill.id}-${to.skill.id}-grey`}
              d={pathD}
              fill="none"
              stroke="#4a5568"
              strokeWidth={5}
              strokeLinecap="butt"
              strokeLinejoin="miter"
              style={{ pointerEvents: "none" }}
            />
          );
        })}
        {/* Pass 2: highlighted paths on top (fully opaque, slightly thicker for clean coverage) */}
        {connections.map(({ from, to, treeColor, startY, endY }) => {
          if (!isConnectionHighlighted(to.skill.id)) return null;
          const startX = from.x;
          const endX = to.x;
          const midY = midYByChild.get(to.skill.id) ?? (startY + endY) / 2;
          const vertEndY = midY - PATH_VERTICAL_INSET;
          const vertStartY = midY + PATH_VERTICAL_INSET;
          const pathD = `M ${startX} ${startY} L ${startX} ${vertEndY} L ${startX} ${midY} L ${endX} ${midY} L ${endX} ${vertStartY} L ${endX} ${endY}`;
          return (
            <path
              key={`${from.skill.id}-${to.skill.id}-highlight`}
              d={pathD}
              fill="none"
              stroke={treeColor}
              strokeWidth={6}
              strokeLinecap="butt"
              strokeLinejoin="miter"
              className="transition-all duration-200"
              style={{ pointerEvents: "none" }}
            />
          );
        })}
      </g>

      {/* Nodes */}
      {layouts.map((layout) => {
        const current = allocations[layout.skill.id] ?? 0;
        const unlocked = isSkillUnlocked(layout.skill, layout.treeId);
        const canAdd = unlocked && current < layout.skill.maxPoints && pointsRemaining > 0;
        const canRemove = current > 0;
        return (
          <SkillTreeNode
            key={layout.skill.id}
            layout={layout}
            current={current}
            maxPoints={layout.skill.maxPoints}
            unlocked={unlocked}
            canAdd={!!canAdd}
            canRemove={!!canRemove}
            allocations={allocations}
            onAdd={() => addPoint(layout.skill.id)}
            onRemove={() => removePoint(layout.skill.id)}
            onHover={setHoveredSkill}
          />
        );
      })}

      {/* Category labels - above each tree, drawn last so always visible */}
      {categoryLabels.map((cat) => (
        <g key={cat.id} transform={`translate(${cat.center.x}, ${cat.center.y})`} style={{ pointerEvents: "none" }}>
          <text
            textAnchor="middle"
            className="text-xs font-semibold uppercase tracking-[0.15em]"
            fill={cat.color}
            style={{
              textShadow: `0 0 12px ${cat.color}40`,
              opacity: cat.points > 0 ? 1 : 0.6,
            }}
          >
            {cat.name} {cat.points}
          </text>
        </g>
      ))}
    </svg>
  );
}

const TREE_IDS = ["conditioning", "mobility", "survival"] as const;

function SkillTreeBuilder() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedTreeId, setSelectedTreeId] = useState<(typeof TREE_IDS)[number]>("mobility");
  const [hoveredSkill, setHoveredSkill] = useState<SkillDef | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [buildOrder, setBuildOrder] = useState<BuildOrder>([]);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(() => new Set(TREE_IDS));
  const allocations = useMemo(() => allocationsFromBuildOrder(buildOrder), [buildOrder]);
  const [savedTrees, setSavedTrees] = useState<SavedSkillTree[]>([]);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [saveUsername, setSaveUsername] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editingTree, setEditingTree] = useState<SavedSkillTree | null>(null);
  const [editUsername, setEditUsername] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const LOCAL_STORAGE_KEY = "arc-saved-skill-trees";

  function loadLocalSaves(): SavedSkillTree[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!raw) return [];
      const data = JSON.parse(raw);
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  function saveToLocal(tree: SavedSkillTree): void {
    if (typeof window === "undefined") return;
    try {
      const existing = loadLocalSaves();
      existing.push(tree);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(existing));
    } catch {
      // ignore
    }
  }

  function removeFromLocal(id: string): void {
    if (typeof window === "undefined") return;
    try {
      const existing = loadLocalSaves().filter((t) => t.id !== id);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(existing));
    } catch {
      // ignore
    }
  }

  function updateLocal(tree: SavedSkillTree): void {
    if (typeof window === "undefined") return;
    try {
      const existing = loadLocalSaves();
      const idx = existing.findIndex((t) => t.id === tree.id);
      if (idx >= 0) {
        existing[idx] = tree;
      } else {
        existing.push(tree);
      }
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(existing));
    } catch {
      // ignore
    }
  }

  // Fetch saved trees on mount (API + localStorage)
  useEffect(() => {
    const local = loadLocalSaves();
    fetch("/api/skill-trees")
      .then((res) => res.json())
      .then((json) => {
        const apiTrees = json.success && Array.isArray(json.trees) ? (json.trees as SavedSkillTree[]) : [];
        return [...apiTrees, ...local];
      })
      .then(setSavedTrees)
      .catch(() => setSavedTrees(local));
  }, []);

  // Hydrate from URL after mount (avoids hydration mismatch - server/client must render same initial state)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const build = params.get("build");
    if (!build) return;
    try {
      const decoded = JSON.parse(atob(build));
      if (Array.isArray(decoded)) {
        setBuildOrder(decoded as BuildOrder);
      } else if (typeof decoded === "object" && decoded !== null) {
        setBuildOrder(buildOrderFromAllocations(decoded as Allocations, treeData));
      }
    } catch {
      // ignore invalid build param
    }
  }, []);

  // Sync URL with build order for shareable links
  useEffect(() => {
    if (buildOrder.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    params.set("tab", "skill-tree");
    params.set("build", btoa(JSON.stringify(buildOrder)));
    window.history.replaceState(null, "", `/?${params.toString()}`);
  }, [buildOrder]);

  const totalUsed = useMemo(() => Object.values(allocations).reduce((a, b) => a + b, 0), [allocations]);
  const maxPoints = treeData?.maxPoints ?? 85;
  const pointsRemaining = maxPoints - totalUsed;

  const getTreePoints = useCallback(
    (treeId: string) => {
      const tree = treeData.trees.find((t) => t.id === treeId);
      if (!tree) return 0;
      return tree.skills.reduce((sum, s) => sum + (allocations[s.id] ?? 0), 0);
    },
    [allocations]
  );

  const isSkillUnlocked = useCallback(
    (skill: SkillDef, treeId: string): boolean => {
      if (skill.requires.length === 0) return true;
      const prereqMet = skill.requiresAny
        ? skill.requires.some((reqId) => (allocations[reqId] ?? 0) >= 1)
        : skill.requires.every((reqId) => (allocations[reqId] ?? 0) >= 1);
      if (!prereqMet) return false;
      if (skill.treeThreshold !== undefined) {
        if (getTreePoints(treeId) < skill.treeThreshold) return false;
      }
      return true;
    },
    [allocations, getTreePoints]
  );

  const addPoint = useCallback(
    (skillId: string) => {
      const skill = treeData.trees.flatMap((t) => t.skills).find((s) => s.id === skillId);
      if (!skill) return;
      const tree = treeData.trees.find((t) => t.skills.some((s) => s.id === skillId));
      if (!tree || !isSkillUnlocked(skill, tree.id)) return;
      const current = allocations[skillId] ?? 0;
      if (current >= skill.maxPoints || totalUsed >= maxPoints) return;
      setBuildOrder((prev) => [...prev, { skillId, rank: current + 1 }]);
    },
    [allocations, totalUsed, maxPoints, isSkillUnlocked]
  );

  const removePoint = useCallback((skillId: string) => {
    const idx = buildOrder.map((e) => e.skillId).lastIndexOf(skillId);
    if (idx < 0) return;
    setBuildOrder((prev) => prev.filter((_, i) => i !== idx));
  }, [buildOrder]);

  const removeLastPoint = useCallback(() => {
    if (buildOrder.length === 0) return;
    setBuildOrder((prev) => prev.slice(0, -1));
  }, [buildOrder]);

  const resetTree = useCallback(() => setBuildOrder([]), []);

  const handleSave = useCallback(async () => {
    const username = saveUsername.trim();
    if (!username) {
      setSaveError("Enter your username");
      return;
    }
    if (totalUsed === 0) {
      setSaveError("Allocate at least 1 point to save");
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    const newTree: SavedSkillTree = {
      id: `st-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      username,
      allocations,
      buildOrder,
      createdAt: new Date().toISOString(),
    };
    try {
      const res = await fetch("/api/skill-trees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, allocations, buildOrder }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const json = await res.json();
      if (res.ok && json.success && json.tree) {
        setSavedTrees((prev) => [...prev, json.tree]);
        setShowSaveForm(false);
        setSaveUsername("");
        return;
      }
      // API failed - fallback to localStorage
      saveToLocal(newTree);
      setSavedTrees((prev) => [...prev, newTree]);
      setShowSaveForm(false);
      setSaveUsername("");
      setSaveError("Saved locally (server unavailable).");
      setTimeout(() => setSaveError(null), 3000);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setSaveError("Request timed out. Try again.");
      } else {
        saveToLocal(newTree);
        setSavedTrees((prev) => [...prev, newTree]);
        setShowSaveForm(false);
        setSaveUsername("");
        setSaveError("Saved locally (server unavailable).");
        setTimeout(() => setSaveError(null), 3000);
      }
    } finally {
      clearTimeout(timeoutId);
      setIsSaving(false);
    }
  }, [allocations, buildOrder, saveUsername, totalUsed]);

  const handleLoadSaved = useCallback((tree: SavedSkillTree) => {
    const order = tree.buildOrder && tree.buildOrder.length > 0
      ? tree.buildOrder
      : buildOrderFromAllocations(tree.allocations, treeData);
    setBuildOrder(order);
    const params = new URLSearchParams(window.location.search);
    params.set("tab", "skill-tree");
    params.set("build", btoa(JSON.stringify(order)));
    window.history.replaceState(null, "", `/?${params.toString()}`);
  }, []);

  const handleRemoveSaved = useCallback(async (tree: SavedSkillTree) => {
    try {
      const res = await fetch(`/api/skill-trees/${tree.id}`, { method: "DELETE" });
      if (res.ok) {
        setSavedTrees((prev) => prev.filter((t) => t.id !== tree.id));
      } else {
        removeFromLocal(tree.id);
        setSavedTrees((prev) => prev.filter((t) => t.id !== tree.id));
      }
    } catch {
      removeFromLocal(tree.id);
      setSavedTrees((prev) => prev.filter((t) => t.id !== tree.id));
    }
  }, []);

  const handleEditSaved = useCallback((tree: SavedSkillTree) => {
    setEditingTree(tree);
    setEditUsername(tree.username);
    setEditError(null);
  }, []);

  const handleUpdateSaved = useCallback(async () => {
    if (!editingTree) return;
    const username = editUsername.trim();
    if (!username || username.length > 32) {
      setEditError("Enter a username (max 32 characters)");
      return;
    }
    setIsUpdating(true);
    setEditError(null);
    const updated = { ...editingTree, username };
    try {
      const res = await fetch(`/api/skill-trees/${editingTree.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setSavedTrees((prev) =>
          prev.map((t) => (t.id === editingTree.id ? updated : t))
        );
        setEditingTree(null);
        setEditUsername("");
        return;
      }
      updateLocal(updated);
      setSavedTrees((prev) =>
        prev.map((t) => (t.id === editingTree.id ? updated : t))
      );
      setEditingTree(null);
      setEditUsername("");
    } catch {
      setEditError("Failed to update. Try again.");
    } finally {
      setIsUpdating(false);
    }
  }, [editingTree, editUsername]);

  const handleHover = useCallback((skill: SkillDef | null, e?: React.MouseEvent) => {
    setHoveredSkill(skill);
    if (e && skill) setTooltipPos({ x: e.clientX, y: e.clientY });
  }, []);

  const allLayouts = useMemo(() => computeOrganicLayout(), []);

  const layouts = useMemo(
    () => allLayouts.filter((l) => l.treeId === selectedTreeId),
    [allLayouts, selectedTreeId]
  );

  const categoryLabels = useMemo(() => {
    return treeData.trees
      .filter((tree) => tree.id === selectedTreeId)
      .map((tree) => {
        const treeLayouts = layouts.filter((l) => l.treeId === tree.id);
        const center =
          treeLayouts.length === 0
            ? { x: 0, y: 0 }
            : {
                x: treeLayouts.reduce((a, l) => a + l.x, 0) / treeLayouts.length,
                y: Math.min(...treeLayouts.map((l) => l.y)) - 50,
              };
        return {
          id: tree.id,
          name: tree.name.toUpperCase(),
          points: getTreePoints(tree.id),
          color: TREE_COLORS[tree.id] ?? tree.color,
          center,
        };
      });
  }, [layouts, selectedTreeId, getTreePoints]);

  return (
    <div className="space-y-4">
      {/* Skill tree + Build summary side by side */}
      <div className="flex flex-col gap-4 lg:flex-row">
        {/* Tree module - segmented control + canvas (card style, matches build summary) */}
        <div
          ref={containerRef}
          className="card relative flex min-h-[500px] flex-1 flex-col overflow-x-hidden overflow-y-auto rounded-lg border border-white/10 bg-[#0a0e1a]/80 backdrop-blur-sm hover:!translate-y-0"
        >
          {/* Segmented control + Reset - inside tree module */}
          <div className="relative flex shrink-0 items-center justify-center gap-3 border-b border-white/10 px-3 py-1.5">
            <div className="flex rounded-lg border border-white/10 bg-white/5 p-0.5">
              {TREE_IDS.map((treeId) => {
                const tree = treeData.trees.find((t) => t.id === treeId);
                const color = TREE_COLORS[treeId] ?? tree?.color ?? "#ffcc00";
                const points = getTreePoints(treeId);
                const isSelected = selectedTreeId === treeId;
                return (
                  <button
                    key={treeId}
                    type="button"
                    onClick={() => setSelectedTreeId(treeId)}
                    className="relative rounded-md px-4 py-2 text-sm font-medium transition-all"
                    style={{
                      color: isSelected ? "#0a0e1a" : "var(--text-secondary)",
                      background: isSelected ? color : "transparent",
                    }}
                  >
                    {tree?.name ?? treeId}
                    <span className="ml-1.5 font-mono text-[10px] opacity-80">{points}</span>
                  </button>
                );
              })}
            </div>
            <span className="text-lg font-semibold">
              <span className="text-amber-400">{totalUsed}</span>
              <span className="text-[var(--text-tertiary)]"> / {maxPoints}</span>
            </span>
            <button
              type="button"
              onClick={resetTree}
              className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-white/10"
            >
              Reset Tree
            </button>
          </div>
          <div
            className="relative flex min-h-0 flex-1 items-center justify-center pt-0 px-8 pb-8"
            onContextMenu={(e) => { e.preventDefault(); removeLastPoint(); }}
          >
            <SkillTreeCanvas
              layouts={layouts}
              allocations={allocations}
              getTreePoints={getTreePoints}
              isSkillUnlocked={isSkillUnlocked}
              addPoint={addPoint}
              removePoint={removePoint}
              totalUsed={totalUsed}
              maxPoints={maxPoints}
              hoveredSkill={hoveredSkill}
              setHoveredSkill={handleHover}
              categoryLabels={categoryLabels}
            />
            {totalUsed > 0 && (
              <button
                type="button"
                onClick={removeLastPoint}
                title="Undo last point (or right-click canvas)"
                className="absolute bottom-4 right-4 rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-white/10"
              >
                Undo last
              </button>
            )}
          </div>
        </div>

        {/* Build summary - right side: overview, timeline, ordered path */}
        <div className="card w-full shrink-0 rounded-lg border border-white/10 bg-[#0a0e1a]/80 p-4 backdrop-blur-sm lg:w-96 hover:!translate-y-0">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-white">Build Summary</h3>
            {totalUsed > 0 && (
              <button
                type="button"
                onClick={() => { setShowSaveForm((p) => !p); setSaveError(null); }}
                className="flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-white/10 hover:text-white"
              >
                <Save size={12} strokeWidth={2} />
                Save build
              </button>
            )}
          </div>
          {showSaveForm && totalUsed > 0 && (
            <div className="mb-3 rounded-lg border border-white/10 bg-white/5 p-3">
              <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1.5">Your username</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={saveUsername}
                  onChange={(e) => setSaveUsername(e.target.value)}
                  placeholder="e.g. Raider123"
                  maxLength={32}
                  className="flex-1 rounded-lg border border-white/10 bg-[#0a0e1a] px-3 py-2 text-sm text-white placeholder:text-[var(--text-tertiary)] focus:border-white/30 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="rounded-lg border border-amber-500/50 bg-amber-500/20 px-3 py-2 text-xs font-medium text-amber-400 transition-colors hover:bg-amber-500/30 disabled:opacity-50"
                >
                  {isSaving ? "Saving…" : "Save"}
                </button>
              </div>
              {saveError && <p className="mt-1.5 text-xs text-red-400">{saveError}</p>}
            </div>
          )}
          {totalUsed === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 rounded-full bg-white/5 p-6">
                <GitBranch className="h-12 w-12 text-[var(--text-tertiary)]" strokeWidth={1.5} />
              </div>
              <p className="text-sm font-medium text-[var(--text-secondary)]">
                No skills allocated yet
              </p>
              <p className="mt-1 w-[250px] text-[12px] text-[var(--text-tertiary)]">
                Click nodes in the tree to add points. Order = unlock order as you level.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Build overview */}
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-[var(--text-tertiary)]">Points</span>
                  <span className="font-mono text-sm font-semibold text-white">{totalUsed} / {maxPoints}</span>
                </div>
                <div className="flex h-2 gap-1 rounded-full overflow-hidden bg-white/10">
                  {treeData.trees.map((tree) => {
                    const pts = getTreePoints(tree.id);
                    const pct = totalUsed > 0 ? (pts / totalUsed) * 100 : 0;
                    const color = TREE_COLORS[tree.id] ?? tree.color;
                    return (
                      <div
                        key={tree.id}
                        title={`${tree.name}: ${pts}`}
                        className="transition-all"
                        style={{ width: `${pct}%`, background: color }}
                      />
                    );
                  })}
                </div>
                <p className="mt-1.5 text-[11px] text-[var(--text-tertiary)]">
                  {(() => {
                    const m = getTreePoints("mobility");
                    const s = getTreePoints("survival");
                    const c = getTreePoints("conditioning");
                    const max = Math.max(m, s, c);
                    if (max === m && m > s && m > c) return "Mobility-focused build";
                    if (max === s && s > m && s > c) return "Survival-focused build";
                    if (max === c && c > m && c > s) return "Conditioning-focused build";
                    return "Balanced build";
                  })()}
                </p>
              </div>

              {/* Build path - ordered list (batched by consecutive same-skill ranks) */}
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase text-[var(--text-tertiary)]">Build path</h4>
                <ol className="space-y-1.5 max-h-[420px] overflow-y-auto">
                  {(() => {
                    const batches: { skillId: string; startOrder: number; endOrder: number; startRank: number; endRank: number }[] = [];
                    for (let i = 0; i < buildOrder.length; i++) {
                      const e = buildOrder[i];
                      const last = batches[batches.length - 1];
                      if (last && last.skillId === e.skillId && last.endRank === e.rank - 1) {
                        last.endOrder = i + 1;
                        last.endRank = e.rank;
                      } else {
                        batches.push({ skillId: e.skillId, startOrder: i + 1, endOrder: i + 1, startRank: e.rank, endRank: e.rank });
                      }
                    }
                    return batches.map((b) => {
                      const skill = treeData.trees.flatMap((t) => t.skills).find((s) => s.id === b.skillId);
                      if (!skill) return null;
                      const tree = treeData.trees.find((t) => t.skills.some((s) => s.id === b.skillId));
                      const color = tree ? (TREE_COLORS[tree.id] ?? tree.color) : "#ffcc00";
                      const orderLabel = b.startOrder === b.endOrder ? `${b.startOrder}` : `${b.startOrder}–${b.endOrder}`;
                      const effectSummary = getSkillEffectSummary(skill.id, b.endRank);
                      return (
                        <li
                          key={`${b.skillId}-${b.startOrder}`}
                          className="rounded border border-white/5 bg-white/[0.02] px-2.5 py-1.5"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="flex min-h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-0.5 font-mono text-[10px] font-bold"
                              style={{ background: `${color}33`, color }}
                            >
                              {orderLabel}
                            </span>
                            <span className="min-w-0 flex-1 truncate text-xs font-medium text-white">{skill.name}</span>
                          </div>
                          {effectSummary ? (
                            <p className="mt-0.5 pl-7 text-[12px] text-[var(--text-tertiary)] leading-relaxed">
                              {renderEffectWithGreenValues(effectSummary)}
                            </p>
                          ) : null}
                        </li>
                      );
                    });
                  })()}
                </ol>
              </div>

              {/* Category breakdown (collapsible) */}
              <div>
                {treeData.trees.map((tree) => {
                  const allocated = tree.skills.filter((s) => (allocations[s.id] ?? 0) > 0);
                  if (allocated.length === 0) return null;
                  const color = TREE_COLORS[tree.id] ?? tree.color;
                  const isCollapsed = collapsedCategories.has(tree.id);
                  return (
                    <div key={tree.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setCollapsedCategories((prev) => {
                            const next = new Set(prev);
                            if (next.has(tree.id)) next.delete(tree.id);
                            else next.add(tree.id);
                            return next;
                          });
                        }}
                        className="mb-1.5 flex w-full items-center gap-1.5 pt-2 text-left text-xs font-semibold uppercase transition-opacity hover:opacity-80"
                        style={{ color }}
                      >
                        {isCollapsed ? (
                          <ChevronRight size={12} className="shrink-0 text-[var(--text-tertiary)]" strokeWidth={2.5} />
                        ) : (
                          <ChevronDown size={12} className="shrink-0 text-[var(--text-tertiary)]" strokeWidth={2.5} />
                        )}
                        {tree.name} ({getTreePoints(tree.id)})
                      </button>
                      {!isCollapsed && (
                        <ul className="space-y-1">
                          {allocated.map((skill) => {
                            const pts = allocations[skill.id] ?? 0;
                            const effectSummary = getSkillEffectSummary(skill.id, pts);
                            if (!effectSummary) return null;
                            return (
                              <li key={skill.id} className="rounded px-2 py-1 text-[11px]">
                                <span className="text-[var(--text-secondary)]">
                                  {renderEffectWithGreenValues(effectSummary)}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Saved builds - friends can compare */}
      <div className="card rounded-lg border border-white/10 bg-[#0a0e1a]/80 p-4 backdrop-blur-sm hover:!translate-y-0">
        <h3 className="mb-3 text-sm font-semibold text-white">Saved builds</h3>
        {savedTrees.length === 0 ? (
          <p className="text-sm text-[var(--text-tertiary)]">No saved builds yet. Save your build above to share with friends.</p>
        ) : (
          <ul className="space-y-2">
            {savedTrees.map((tree) => {
              const pts = Object.values(tree.allocations).reduce((a, b) => a + b, 0);
              return (
                <li
                  key={tree.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-medium text-white">{tree.username}</span>
                    <span className="ml-2 font-mono text-xs text-[var(--text-tertiary)]">{pts} pts</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleLoadSaved(tree)}
                      className="rounded-lg border border-white/20 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-white/10 hover:text-white"
                    >
                      Load
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEditSaved(tree)}
                      title="Edit"
                      className="rounded-lg border border-white/20 bg-white/5 p-1.5 text-[var(--text-tertiary)] transition-colors hover:bg-white/10 hover:text-white"
                    >
                      <Pencil size={12} strokeWidth={2} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveSaved(tree)}
                      title="Remove"
                      className="rounded-lg border border-white/20 bg-white/5 p-1.5 text-[var(--text-tertiary)] transition-colors hover:bg-white/10 hover:text-red-400"
                    >
                      <Trash2 size={12} strokeWidth={2} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Edit saved build modal */}
      {editingTree && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setEditingTree(null)}>
          <div
            className="w-full max-w-sm rounded-lg border border-white/10 bg-[#0a0e1a] p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="mb-3 text-sm font-semibold text-white">Edit build</h4>
            <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1.5">Username</label>
            <input
              type="text"
              value={editUsername}
              onChange={(e) => setEditUsername(e.target.value)}
              placeholder="e.g. Raider123"
              maxLength={32}
              className="mb-3 w-full rounded-lg border border-white/10 bg-[#0a0e1a] px-3 py-2 text-sm text-white placeholder:text-[var(--text-tertiary)] focus:border-white/30 focus:outline-none"
            />
            {editError && <p className="mb-3 text-xs text-red-400">{editError}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setEditingTree(null); setEditUsername(""); setEditError(null); }}
                className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdateSaved}
                disabled={isUpdating}
                className="rounded-lg border border-amber-500/50 bg-amber-500/20 px-3 py-2 text-xs font-medium text-amber-400 transition-colors hover:bg-amber-500/30 disabled:opacity-50"
              >
                {isUpdating ? "Updating…" : "Update"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tooltip */}
      {hoveredSkill && (
        <div
          className="fixed z-50 max-w-[280px] rounded-lg border p-3 shadow-xl pointer-events-none"
          style={{
            left: `clamp(8px, ${tooltipPos.x + 12}px, calc(100vw - 296px))`,
            top: `clamp(8px, ${tooltipPos.y + 12}px, calc(100vh - 120px))`,
            background: "var(--bg-base)",
            borderColor: (TREE_COLORS[treeData.trees.find((t) => t.skills.some((s) => s.id === hoveredSkill.id))?.id ?? "mobility"] ?? "#ffcc00") + "40",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          }}
        >
          <h4
            className="text-sm font-bold"
            style={{
              color: TREE_COLORS[treeData.trees.find((t) => t.skills.some((s) => s.id === hoveredSkill.id))?.id ?? "mobility"] ?? "#ffcc00",
            }}
          >
            {hoveredSkill.name}
          </h4>
          <p className="mt-1 font-mono text-[10px] text-[var(--text-tertiary)]">
            Level {allocations[hoveredSkill.id] ?? 0} / {hoveredSkill.maxPoints}
          </p>
          <p className="mt-1.5 text-xs text-[var(--text-tertiary)] leading-relaxed">
            {hoveredSkill.description || "No description available."}
          </p>
        </div>
      )}

    </div>
  );
}

export { SkillTreeBuilder };
