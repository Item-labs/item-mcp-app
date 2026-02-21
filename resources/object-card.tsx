import { useState } from "react";
import {
  McpUseProvider,
  useWidget,
  useCallTool,
  type WidgetMetadata,
} from "mcp-use/react";
import { z } from "zod";

const propsSchema = z.object({
  objectType: z.string(),
  object: z.object({
    id: z.string(),
    objectType: z.string(),
    fields: z.record(z.string(), z.unknown()),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
  fields: z.record(z.string(), z.unknown()),
});

export const widgetMetadata: WidgetMetadata = {
  description: "Display a newly created CRM object as a Notion-style card",
  props: propsSchema,
  exposeAsTool: false,
};

type Props = z.infer<typeof propsSchema>;

const FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

function SkeletonCard() {
  return (
    <div
      style={{
        padding: 20,
        backgroundColor: "#ffffff",
        borderRadius: 6,
        border: "1px solid #e8e8e8",
        fontFamily: FONT_STACK,
      }}
    >
      <div
        style={{
          width: 80,
          height: 22,
          backgroundColor: "#f0f0f0",
          borderRadius: 4,
          marginBottom: 16,
          animation: "pulse 1.5s ease-in-out infinite",
        }}
      />
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "10px 0",
            borderBottom: "1px solid #f0f0f0",
          }}
        >
          <div
            style={{
              width: 80,
              height: 14,
              backgroundColor: "#f0f0f0",
              borderRadius: 4,
            }}
          />
          <div
            style={{
              width: 120,
              height: 14,
              backgroundColor: "#f0f0f0",
              borderRadius: 4,
            }}
          />
        </div>
      ))}
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
    </div>
  );
}

function formatFieldKey(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
}

function formatFieldValue(value: unknown): string {
  if (value === null || value === undefined) return "\u2014";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export default function ObjectCard() {
  const { props, isPending, sendFollowUpMessage } = useWidget<Props>();
  const { callTool: refreshTypes, isPending: isRefreshing } =
    useCallTool("list-object-types");
  const [followUpSent, setFollowUpSent] = useState(false);

  if (isPending) {
    return (
      <McpUseProvider autoSize>
        <SkeletonCard />
      </McpUseProvider>
    );
  }

  const { objectType, fields } = props;
  const entries = Object.entries(fields).filter(
    ([, v]) => v !== null && v !== undefined
  );

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
        {/* Header with type badge */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #e8e8e8",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span
            style={{
              display: "inline-block",
              padding: "3px 10px",
              fontSize: 12,
              fontWeight: 500,
              borderRadius: 4,
              backgroundColor: "#f0f7ff",
              color: "#0066cc",
              textTransform: "capitalize",
              letterSpacing: "0.02em",
            }}
          >
            {objectType}
          </span>
          <span style={{ fontSize: 12, color: "#999" }}>
            {props.object.id}
          </span>
        </div>

        {/* Field rows */}
        <div style={{ padding: "4px 0" }}>
          {entries.map(([key, value]) => (
            <div
              key={key}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 20px",
                borderBottom: "1px solid #f5f5f5",
                fontSize: 14,
              }}
            >
              <span
                style={{
                  color: "#777",
                  fontWeight: 400,
                  minWidth: 100,
                  flexShrink: 0,
                }}
              >
                {formatFieldKey(key)}
              </span>
              <span
                style={{
                  color: "#1a1a1a",
                  fontWeight: 500,
                  textAlign: "right",
                  wordBreak: "break-word",
                }}
              >
                {formatFieldValue(value)}
              </span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div
          style={{
            padding: "12px 20px",
            borderTop: "1px solid #e8e8e8",
            display: "flex",
            gap: 12,
            alignItems: "center",
          }}
        >
          <button
            onClick={() => {
              setFollowUpSent(true);
              sendFollowUpMessage(
                `What should I do next with this ${objectType}?`
              );
            }}
            disabled={followUpSent}
            style={{
              padding: "7px 14px",
              fontSize: 13,
              fontWeight: 500,
              fontFamily: FONT_STACK,
              border: "1px solid #e8e8e8",
              borderRadius: 6,
              backgroundColor: followUpSent ? "#f7f7f7" : "#ffffff",
              color: followUpSent ? "#999" : "#1a1a1a",
              cursor: followUpSent ? "default" : "pointer",
              transition: "background-color 0.15s",
            }}
            onMouseEnter={(e) => {
              if (!followUpSent)
                e.currentTarget.style.backgroundColor = "#f7f7f7";
            }}
            onMouseLeave={(e) => {
              if (!followUpSent)
                e.currentTarget.style.backgroundColor = "#ffffff";
            }}
          >
            {followUpSent ? "Sent" : `What's next?`}
          </button>

          <button
            onClick={() => refreshTypes({})}
            disabled={isRefreshing}
            style={{
              padding: "7px 14px",
              fontSize: 13,
              fontWeight: 500,
              fontFamily: FONT_STACK,
              border: "none",
              borderRadius: 6,
              backgroundColor: "transparent",
              color: isRefreshing ? "#999" : "#0066cc",
              cursor: isRefreshing ? "default" : "pointer",
              transition: "background-color 0.15s",
            }}
            onMouseEnter={(e) => {
              if (!isRefreshing)
                e.currentTarget.style.backgroundColor = "#f0f7ff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            {isRefreshing ? "Refreshing..." : "Refresh object types"}
          </button>
        </div>
      </div>
    </McpUseProvider>
  );
}
