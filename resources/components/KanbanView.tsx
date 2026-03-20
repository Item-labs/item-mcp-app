import { Avatar, FieldIcon } from "../lib/ui.js";
import { STAGE_ORDER, HIDDEN } from "../lib/constants.js";
import { stageLabel, stageColors, resolve, fmt, timeAgo, getName, getAvatar } from "../lib/format.js";
import type { Item } from "../lib/types.js";

// --- KanbanCard ---

function KanbanCard({ item, fields, onClick }: { item: Item; fields: string[]; onClick: () => void }) {
  return (
    <div onClick={onClick}
      className="bg-white rounded-xl border border-gray-100 cursor-pointer transition-shadow duration-100 hover:shadow-md overflow-hidden">
      <div className="flex items-start justify-between px-5 pt-4 pb-2">
        <span className="text-[15px] font-medium text-gray-900 leading-snug">{getName(item)}</span>
        <Avatar name={getName(item)} url={getAvatar(item) || undefined} sm />
      </div>
      <div className="px-5 pb-3">
        {fields.map((col) => {
          const v = resolve(item.fields, col);
          const isEmpty = v === null || v === undefined || v === "";
          return (
            <div key={col} className="flex items-center gap-3 py-1.5">
              <FieldIcon col={col} />
              {isEmpty
                ? <span className="text-[13px] italic" style={{ color: "#93C5FD" }}>Empty</span>
                : <span className="text-[13px] text-gray-800">{fmt(col, v)}</span>}
            </div>
          );
        })}
      </div>
      <div className="px-5 pb-4 pt-1">
        <span className="inline-flex items-center gap-1.5 text-[11px] text-gray-400 bg-gray-50 rounded-full px-2.5 py-1">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="shrink-0">
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.2" />
            <path d="M8 5v3l2 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          {timeAgo(item.createdAt)}
        </span>
      </div>
    </div>
  );
}

// --- KanbanColumn ---

function KanbanColumn({
  stage, items, cardFields, onCardClick,
}: {
  stage: string; items: Item[]; cardFields: string[]; onCardClick: (item: Item) => void;
}) {
  const [, , dotColor] = stageColors(stage);
  return (
    <div className="flex-1 min-w-[340px] shrink-0 rounded-xl overflow-hidden" style={{ backgroundColor: "#F4F6F8" }}>
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[14px] font-semibold text-gray-800">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
            {stageLabel(stage)}
            <span className="text-gray-400 font-normal text-[13px]">{items.length}</span>
          </div>
          <span className="text-[12px] text-gray-300">Select field</span>
        </div>
        <div className="mt-3 border-b border-gray-200/60" />
      </div>
      <div className="flex flex-col gap-3 px-3 pb-4">
        {items.map((item) => (
          <KanbanCard key={item.id} item={item} fields={cardFields} onClick={() => onCardClick(item)} />
        ))}
      </div>
    </div>
  );
}

// --- KanbanView ---

export function KanbanView({ items, columns, onClick }: { items: Item[]; columns: string[]; onClick: (item: Item) => void }) {
  const grouped = new Map<string, Item[]>(STAGE_ORDER.map((s) => [s, []]));
  for (const item of items) {
    const s = String(item.fields.stage ?? "to_contact");
    grouped.get(s)?.push(item) ?? grouped.set(s, [item]);
  }
  const cardFields = columns.filter((c) => c !== "stage" && !HIDDEN.has(c));

  return (
    <div className="flex gap-3 overflow-x-auto p-4 min-h-[400px] bg-white">
      {STAGE_ORDER.map((stage) => (
        <KanbanColumn
          key={stage}
          stage={stage}
          items={grouped.get(stage) ?? []}
          cardFields={cardFields}
          onCardClick={onClick}
        />
      ))}
    </div>
  );
}
