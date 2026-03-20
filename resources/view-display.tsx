/**
 * View Display Widget
 *
 * Main entry point that orchestrates state and delegates rendering to:
 *   - ViewSelector — tab bar for switching views
 *   - TableView — spreadsheet layout
 *   - KanbanView — board layout grouped by stage
 *
 * File structure:
 *   resources/
 *     view-display.tsx        ← this file (main widget)
 *     components/
 *       ViewSelector.tsx      ← tab bar
 *       TableView.tsx         ← table layout (includes row selection)
 *       KanbanView.tsx        ← kanban layout (KanbanColumn + KanbanCard)
 *     lib/
 *       types.ts              ← shared types (Item, ViewMeta)
 *       constants.ts          ← colors, stages, hidden fields
 *       format.ts             ← formatting utilities
 *       ui.tsx                ← shared UI primitives (Avatar, Checkbox, StageBadge, Cell, FieldIcon)
 */

import { useState, useEffect } from "react";
import { McpUseProvider, useWidget, type WidgetMetadata } from "mcp-use/react";
import { z } from "zod";
import { ViewSelector } from "./components/ViewSelector.js";
import { TableView } from "./components/TableView.js";
import { KanbanView } from "./components/KanbanView.js";
import { HIDDEN } from "./lib/constants.js";
import { getName } from "./lib/format.js";
import type { ViewMeta } from "./lib/types.js";

// --- Schema ---

const propsSchema = z.object({
  objectType: z.string().optional(),
  viewName: z.string(),
  viewType: z.string(),
  viewId: z.string().optional(),
  items: z.array(z.object({
    id: z.string(),
    objectType: z.string(),
    fields: z.record(z.string(), z.unknown()),
    createdAt: z.string(),
    updatedAt: z.string(),
  })),
  columns: z.array(z.string()),
  pagination: z.object({
    total: z.number(), limit: z.number(), offset: z.number(), hasMore: z.boolean(),
  }).optional(),
  availableViews: z.array(z.object({
    id: z.string(), name: z.string(), viewType: z.string(), columns: z.array(z.string()),
  })).optional(),
});

export const widgetMetadata: WidgetMetadata = {
  description: "Display CRM data as an Item-style table or kanban board",
  props: propsSchema,
  exposeAsTool: false,
  metadata: {
    csp: {
      resourceDomains: [
        "https://fonts.googleapis.com",
        "https://fonts.gstatic.com",
        "https://crustdata-media.s3.us-east-2.amazonaws.com",
      ],
      connectDomains: ["https://fonts.googleapis.com", "https://fonts.gstatic.com"],
    },
  },
};

type Props = z.infer<typeof propsSchema>;

// --- Font injection ---

function useManropeFont() {
  useEffect(() => {
    const doc = document;
    if (!doc.getElementById("manrope-font")) {
      const link = doc.createElement("link");
      link.id = "manrope-font";
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap";
      doc.head.appendChild(link);
    }
    if (!doc.getElementById("manrope-style")) {
      const style = doc.createElement("style");
      style.id = "manrope-style";
      style.textContent = `.font-item,[class*="font-item"]{font-family:"Manrope",ui-sans-serif,system-ui,sans-serif!important}`;
      doc.head.appendChild(style);
    }
  }, []);
}

// --- Main ---

export default function ViewDisplay() {
  useManropeFont();
  const { props, isPending, sendFollowUpMessage } = useWidget<Props>();
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (isPending) {
    return (
      <McpUseProvider autoSize>
        <div className="bg-transparent p-4 rounded-2xl font-item">
          <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.06),0_0_1px_rgba(0,0,0,0.08)] overflow-hidden">
            <div className="pt-6 pb-4 px-8"><div className="w-32 h-7 bg-gray-100 rounded animate-pulse" /></div>
            <div className="border-t border-gray-100">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-14 mx-8 border-b border-gray-50 flex items-center gap-4">
                  <div className="w-4 h-4 bg-gray-100 rounded" />
                  <div className="w-8 h-8 bg-gray-100 rounded-full" />
                  <div className="w-32 h-4 bg-gray-100 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </McpUseProvider>
    );
  }

  const { objectType, viewName, items, columns, pagination, availableViews } = props;
  const effectiveViewId = activeViewId ?? props.viewId ?? null;

  const defaultView: ViewMeta = { id: "__default__", name: "Default View", viewType: "table", columns };
  const tabs: ViewMeta[] = [defaultView, ...(availableViews ?? [])];
  const current = tabs.find((v) => v.id === effectiveViewId) ?? defaultView;
  const displayCols = current.columns.filter((c) => !HIDDEN.has(c));
  const title = objectType ? objectType.charAt(0).toUpperCase() + objectType.slice(1) : viewName;

  const toggle = (id: string) => setSelectedIds((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelectedIds(selectedIds.size === items.length ? new Set() : new Set(items.map((i) => i.id)));
  const onItemClick = (item: Props["items"][number]) => sendFollowUpMessage(`Tell me more about ${getName(item)} (${item.objectType} #${item.id})`);
  const onViewSwitch = (viewId: string) => { setActiveViewId(viewId); setSelectedIds(new Set()); };

  return (
    <McpUseProvider autoSize>
      <div className="bg-transparent p-4 rounded-2xl font-item">
      <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.06),0_0_1px_rgba(0,0,0,0.08)] overflow-hidden text-gray-900">

        <div className="pt-6 px-8">
          <h2 className="m-0 text-[26px] font-light tracking-tight leading-none">{title}</h2>
        </div>

        {selectedIds.size > 0 && (
          <div className="px-8 pt-3">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#2B4F60] text-white text-xs font-semibold">
              {selectedIds.size} selected
            </span>
          </div>
        )}

        <ViewSelector
          title={title}
          tabs={tabs}
          currentId={current.id}
          total={pagination?.total}
          onSwitch={onViewSwitch}
        />

        {items.length === 0 ? (
          <div className="py-20 px-8 text-center text-gray-400 text-[14px]">No records found</div>
        ) : current.viewType === "kanban" ? (
          <KanbanView items={items} columns={displayCols} onClick={onItemClick} />
        ) : (
          <TableView
            items={items} headers={displayCols} objectType={objectType ?? ""}
            selectedIds={selectedIds} hoveredId={hoveredId}
            onToggle={toggle} onToggleAll={toggleAll}
            onClick={onItemClick} onHover={setHoveredId}
          />
        )}
      </div>
      </div>
    </McpUseProvider>
  );
}
