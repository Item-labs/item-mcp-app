/**
 * Shared UI primitives used by both TableView and KanbanView.
 * Kept in one file to avoid pointless single-component files.
 */

import { AVATAR_PALETTE } from "./constants.js";
import { hash, getInitials, stageLabel, stageColors, resolve, fmt } from "./format.js";
import type { Item } from "./types.js";

// --- Checkbox ---

export function Checkbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <div
      onClick={(e) => { e.stopPropagation(); onChange(); }}
      className={`w-[18px] h-[18px] rounded flex items-center justify-center shrink-0 cursor-pointer transition-all duration-100 ${
        checked ? "bg-[#2B4F60]" : "border-[1.5px] border-gray-300 bg-white"
      }`}
    >
      {checked && (
        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
          <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  );
}

// --- Avatar ---

export function Avatar({ name, url, sm, round }: { name: string; url?: string; sm?: boolean; round?: boolean }) {
  const size = sm ? "w-6 h-6 text-[9px]" : "w-8 h-8 text-[11px]";
  const radius = round ? "rounded-full" : "rounded-md";
  if (url) return <img src={url} alt={name} className={`${size} ${radius} object-cover shrink-0`} />;
  const [bg, fg] = AVATAR_PALETTE[hash(name) % AVATAR_PALETTE.length];
  return (
    <div className={`${size} ${radius} flex items-center justify-center font-semibold shrink-0 ${bg} ${fg}`}>
      {getInitials(name)}
    </div>
  );
}

// --- StageBadge ---

export function StageBadge({ stage }: { stage: string }) {
  const [bg, text, dot] = stageColors(stage);
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded whitespace-nowrap"
      style={{ backgroundColor: bg, color: text }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dot }} />
      {stageLabel(stage)}
    </span>
  );
}

// --- FieldIcon (used in kanban cards) ---

export function FieldIcon({ col }: { col: string }) {
  const cls = "w-4 h-4 shrink-0 text-gray-400";
  if (col.includes("amount") || col.includes("usd"))
    return <svg className={cls} viewBox="0 0 16 16" fill="none"><path d="M8 2v12M5.5 4.5C5.5 4.5 6.5 3.5 8 3.5s3 1 3 2.25S9 8 8 8s-3 .75-3 2.25S6.5 12.5 8 12.5s2.5-1 2.5-1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>;
  if (col.includes("company"))
    return <svg className={cls} viewBox="0 0 16 16" fill="none"><rect x="3" y="3" width="10" height="11" rx="1" stroke="currentColor" strokeWidth="1.2" /><path d="M6 6h1M9 6h1M6 9h1M9 9h1M6.5 14v-2.5h3V14" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>;
  if (col.includes("contact") || col.includes("primary") || col.includes("owned"))
    return <svg className={cls} viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.2" /><path d="M3 14c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>;
  return <span className="w-4 h-4 flex items-center justify-center text-gray-300 text-[10px]">{"\u00B7"}</span>;
}

// --- Cell (used in table rows) ---

export function Cell({ col, item }: { col: string; item: Item }) {
  const val = resolve(item.fields, col);
  const base = col.split(".").pop() ?? col;
  if (base === "stage") return <StageBadge stage={String(val ?? "")} />;
  if (base === "linkedin_slug") {
    const s = String(val ?? "");
    if (!s) return <span className="text-gray-300">{"\u2014"}</span>;
    return <span className="text-gray-500"><span className="text-gray-300 text-[11px] mr-1">@</span>{s}</span>;
  }
  return <span className="text-gray-600">{fmt(col, val)}</span>;
}
