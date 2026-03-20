import { COLORS, DEFAULT_COLORS, STAGE_COLOR_MAP } from "./constants.js";
import type { Item } from "./types.js";

export function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
  return Math.abs(h);
}

export function getInitials(n: string): string {
  return n.split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

/** Convert snake_case/dot.notation field key to a readable header */
export function humanize(key: string): string {
  return (key.split(".").pop() ?? key)
    .replace(/([A-Z])/g, " $1").replace(/[_-]/g, " ")
    .replace(/\bid\b/gi, "ID").replace(/\busd\b/gi, "USD")
    .replace(/^\w/, (c) => c.toUpperCase()).replace(/\s+/g, " ").trim();
}

/** Object type slug → singular display label */
export function singularLabel(objectType: string): string {
  if (objectType === "companies") return "Company";
  if (objectType === "contacts") return "Contact";
  if (objectType === "deals") return "Deal";
  return humanize(objectType);
}

/** Stage slug → human-readable label */
export function stageLabel(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Stage slug → [bg, text, dot] hex colors */
export function stageColors(stage: string): [string, string, string] {
  return COLORS[STAGE_COLOR_MAP[stage] ?? "slate-dark"] ?? DEFAULT_COLORS;
}

/** Format a field value for display — handles currency, locations, arrays */
export function fmt(key: string, val: unknown): string {
  if (val === null || val === undefined || val === "") return "\u2014";
  if ((key.includes("amount") || key.includes("usd")) && !isNaN(Number(val)))
    return `$${Number(val).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
  if (typeof val === "object" && val !== null && "raw" in (val as Record<string, unknown>))
    return String((val as Record<string, unknown>).raw);
  if (Array.isArray(val))
    return val.length === 0 ? "\u2014" : val.length <= 2 ? val.join(", ") : `${val.slice(0, 2).join(", ")} +${val.length - 2}`;
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}

/** Resolve a field value, supporting dot notation (e.g., "company.company_size") */
export function resolve(fields: Record<string, unknown>, col: string): unknown {
  if (col in fields) return fields[col];
  const [base, nested] = col.split(".");
  if (nested && typeof fields[base] === "object" && fields[base] !== null)
    return (fields[base] as Record<string, unknown>)[nested];
  return undefined;
}

/** Relative time label from an ISO date */
export function timeAgo(iso: string): string {
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
  return h < 1 ? "Just now" : h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
}

export function getAvatar(item: Item): string {
  return (item.fields.avatar_url as string) || (item.fields.logo_url as string) || "";
}

export function getName(item: Item): string {
  return (item.fields.name as string) ?? "Unnamed";
}
