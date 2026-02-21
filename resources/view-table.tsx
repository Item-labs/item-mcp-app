import { useState } from "react";
import { McpUseProvider, useWidget, type WidgetMetadata } from "mcp-use/react";
import { z } from "zod";

const itemSchema = z.object({
  id: z.string(),
  objectType: z.string(),
  fields: z.record(z.string(), z.unknown()),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const propsSchema = z.object({
  viewName: z.string(),
  viewType: z.string(),
  items: z.array(itemSchema),
  columns: z.array(z.string()),
});

export const widgetMetadata: WidgetMetadata = {
  description: "Display CRM view results in a Notion-style table",
  props: propsSchema,
  exposeAsTool: false,
};

type Props = z.infer<typeof propsSchema>;
type Item = z.infer<typeof itemSchema>;

const FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

// Preferred display order for common CRM columns
const COLUMN_PRIORITY: Record<string, number> = {
  avatar: 0,
  firstName: 1,
  lastName: 2,
  fullName: 3,
  name: 4,
  role: 5,
  title: 6,
  location: 7,
  city: 8,
  company: 9,
  companyName: 10,
  email: 11,
  linkedin: 12,
  linkedIn: 12,
};

function sortColumns(columns: string[]): string[] {
  return [...columns].sort((a, b) => {
    const pa = COLUMN_PRIORITY[a] ?? 99;
    const pb = COLUMN_PRIORITY[b] ?? 99;
    if (pa !== pb) return pa - pb;
    return a.localeCompare(b);
  });
}

function formatColumnHeader(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "\u2014";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function getContactSummary(item: Item): {
  fullName: string;
  role: string;
  company: string;
} {
  const f = item.fields;
  const firstName = (f.firstName as string) ?? "";
  const lastName = (f.lastName as string) ?? "";
  const fullName =
    (f.fullName as string) ??
    (f.name as string) ??
    (`${firstName} ${lastName}`.trim() || "\u2014");
  const role =
    (f.role as string) ?? (f.title as string) ?? (f.jobTitle as string) ?? "";
  const company =
    (f.company as string) ??
    (f.companyName as string) ??
    (f.organization as string) ??
    "";
  return { fullName, role, company };
}

function SkeletonTable() {
  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        borderRadius: 6,
        border: "1px solid #e8e8e8",
        fontFamily: FONT_STACK,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "14px 20px",
          borderBottom: "1px solid #e8e8e8",
        }}
      >
        <div
          style={{
            width: 160,
            height: 18,
            backgroundColor: "#f0f0f0",
            borderRadius: 4,
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        />
      </div>
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          style={{
            display: "flex",
            gap: 16,
            padding: "12px 20px",
            borderBottom: "1px solid #f5f5f5",
          }}
        >
          {[100, 140, 100, 80, 120].map((w, j) => (
            <div
              key={j}
              style={{
                width: w,
                height: 14,
                backgroundColor: "#f0f0f0",
                borderRadius: 4,
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            />
          ))}
        </div>
      ))}
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
    </div>
  );
}

export default function ViewTable() {
  const { props, isPending, sendFollowUpMessage } = useWidget<Props>();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (isPending) {
    return (
      <McpUseProvider autoSize>
        <SkeletonTable />
      </McpUseProvider>
    );
  }

  const { viewName, items, columns } = props;
  const sortedColumns = sortColumns(columns);

  const handleRowClick = (item: Item) => {
    setSelectedId(item.id);
    const { fullName, role, company } = getContactSummary(item);
    const parts = [`Tell me more about ${fullName}`];
    if (role) parts[0] += `, ${role}`;
    if (company) parts[0] += ` at ${company}`;
    sendFollowUpMessage(parts[0]);
  };

  return (
    <McpUseProvider autoSize>
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: 6,
          border: "1px solid #e8e8e8",
          fontFamily: FONT_STACK,
          color: "#1a1a1a",
          overflow: "hidden",
        }}
      >
        {/* Table header with view name */}
        <div
          style={{
            padding: "14px 20px",
            borderBottom: "1px solid #e8e8e8",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 600 }}>{viewName}</span>
          <span style={{ fontSize: 12, color: "#999" }}>
            {items.length} {items.length === 1 ? "record" : "records"}
          </span>
        </div>

        {items.length === 0 ? (
          <div
            style={{
              padding: "40px 20px",
              textAlign: "center",
              color: "#999",
              fontSize: 14,
            }}
          >
            No records in this view
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13,
              }}
            >
              <thead>
                <tr>
                  {sortedColumns.map((col) => (
                    <th
                      key={col}
                      style={{
                        padding: "10px 16px",
                        textAlign: "left",
                        fontWeight: 500,
                        fontSize: 12,
                        color: "#777",
                        borderBottom: "1px solid #e8e8e8",
                        whiteSpace: "nowrap",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {formatColumnHeader(col)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const isSelected = selectedId === item.id;
                  const isHovered = hoveredId === item.id;
                  return (
                    <tr
                      key={item.id}
                      onClick={() => handleRowClick(item)}
                      onMouseEnter={() => setHoveredId(item.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      style={{
                        cursor: "pointer",
                        backgroundColor: isSelected
                          ? "#f0f7ff"
                          : isHovered
                            ? "#f7f7f7"
                            : "transparent",
                        transition: "background-color 0.12s",
                      }}
                    >
                      {sortedColumns.map((col) => (
                        <td
                          key={col}
                          style={{
                            padding: "10px 16px",
                            borderBottom: "1px solid #f5f5f5",
                            whiteSpace: "nowrap",
                            maxWidth: 200,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            color: isSelected ? "#0066cc" : "#1a1a1a",
                          }}
                        >
                          {formatCellValue(item.fields[col])}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </McpUseProvider>
  );
}
