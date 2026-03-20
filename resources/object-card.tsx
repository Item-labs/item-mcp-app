/**
 * Object Detail Widget
 *
 * Renders a single CRM object (contact, company, deal) in Item's detail page layout:
 *   - Header: avatar + name + subtitle + type label
 *   - Tab bar: Overview (+ future tabs like Associated Contacts/Deals)
 *   - Two-column body:
 *     - Left: Profile Summary placeholder, Activity placeholder
 *     - Right sidebar: Details section with field icons + labels + values,
 *       "Show N Empty fields" toggle
 */

import { useState, useEffect } from "react";
import { McpUseProvider, useWidget, type WidgetMetadata } from "mcp-use/react";
import { z } from "zod";
import { HIDDEN } from "./lib/constants.js";
import { Avatar, StageBadge, FieldIcon } from "./lib/ui.js";
import { humanize, singularLabel, stageLabel, stageColors, fmt, resolve, getName, getAvatar } from "./lib/format.js";

// --- Schema ---

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
  description: "Display a single CRM object as an Item-style detail page",
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

// --- Field icon for the detail sidebar (maps field name → SVG icon) ---

function DetailFieldIcon({ field }: { field: string }) {
  const cls = "w-4 h-4 shrink-0 text-gray-400";
  if (field.includes("email")) return <svg className={cls} viewBox="0 0 16 16" fill="none"><rect x="2" y="4" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M2 5.5l6 4 6-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>;
  if (field.includes("role") || field.includes("title")) return <svg className={cls} viewBox="0 0 16 16" fill="none"><path d="M4 13V3a1 1 0 011-1h6a1 1 0 011 1v10M2 13h12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>;
  if (field.includes("location") || field.includes("address") || field.includes("country")) return <svg className={cls} viewBox="0 0 16 16" fill="none"><circle cx="8" cy="6.5" r="2" stroke="currentColor" strokeWidth="1.2"/><path d="M8 14s-5-4.5-5-7.5a5 5 0 1110 0C13 9.5 8 14 8 14z" stroke="currentColor" strokeWidth="1.2"/></svg>;
  if (field.includes("linkedin")) return <svg className={cls} viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.2"/><path d="M5.5 7v3.5M5.5 5v.5M8 10.5V8.25c0-.75.5-1.25 1.25-1.25S10.5 7.5 10.5 8.25V10.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>;
  if (field.includes("website") || field.includes("url") || field.includes("crunchbase")) return <svg className={cls} viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.2"/><path d="M2.5 8h11M8 2.5c-2 2-2 9 0 11M8 2.5c2 2 2 9 0 11" stroke="currentColor" strokeWidth="1.2"/></svg>;
  if (field.includes("phone")) return <svg className={cls} viewBox="0 0 16 16" fill="none"><path d="M3.5 2.5h3l1 3-1.5 1a7 7 0 003.5 3.5l1-1.5 3 1v3c0 .5-.5 1-1 1C5.5 13.5 2.5 7 2.5 3.5c0-.5.5-1 1-1z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
  if (field.includes("signup") || field.includes("date") || field.includes("first_seen") || field.includes("last_seen")) return <svg className={cls} viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M2 6.5h12M5 2v2M11 2v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>;
  if (field.includes("industr")) return <svg className={cls} viewBox="0 0 16 16" fill="none"><path d="M2 14V8l4-3v3l4-3v3l4-3v9H2z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>;
  if (field.includes("source") || field.includes("funnel")) return <svg className={cls} viewBox="0 0 16 16" fill="none"><path d="M4 3h8l-2 4 2 4H4l2-4-2-4z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>;
  if (field.includes("size")) return <svg className={cls} viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5" r="2" stroke="currentColor" strokeWidth="1.2"/><circle cx="4.5" cy="10" r="1.5" stroke="currentColor" strokeWidth="1.2"/><circle cx="11.5" cy="10" r="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M6 5.5l-1.5 3M10 5.5l1.5 3" stroke="currentColor" strokeWidth="1.2"/></svg>;
  // Fallback: use FieldIcon from shared ui (dollar, company, person)
  return <FieldIcon col={field} />;
}

// --- Determine subtitle for the header ---

function getSubtitle(objectType: string, fields: Record<string, unknown>): string {
  if (objectType === "contacts") return (fields.role as string) ?? "";
  if (objectType === "companies") return (fields.website_url as string) ?? "";
  if (objectType === "deals") return "Deal";
  return "";
}

// --- Main ---

export default function ObjectCard() {
  useManropeFont();
  const { props, isPending, sendFollowUpMessage } = useWidget<Props>();
  const [showEmpty, setShowEmpty] = useState(false);

  if (isPending) {
    return (
      <McpUseProvider autoSize>
        <div className="bg-transparent p-4 rounded-2xl font-item">
          <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.06),0_0_1px_rgba(0,0,0,0.08)] overflow-hidden p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-gray-100 animate-pulse" />
              <div><div className="w-40 h-5 bg-gray-100 rounded mb-2" /><div className="w-24 h-3 bg-gray-100 rounded" /></div>
            </div>
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-10 bg-gray-50 rounded mb-2 animate-pulse" />)}
          </div>
        </div>
      </McpUseProvider>
    );
  }

  const { objectType, fields, object } = props;
  const name = (fields.name as string) ?? "Unnamed";
  const avatarUrl = (fields.avatar_url as string) || (fields.logo_url as string) || "";
  const subtitle = getSubtitle(objectType, fields);
  const round = objectType === "contacts";

  // Split fields into filled and empty
  const allFields = Object.entries(fields).filter(
    ([k]) => k !== "name" && !HIDDEN.has(k)
  );
  const filledFields = allFields.filter(([, v]) => v !== null && v !== undefined && v !== "");
  const emptyFields = allFields.filter(([, v]) => v === null || v === undefined || v === "");

  return (
    <McpUseProvider autoSize>
      <div className="bg-transparent p-4 rounded-2xl font-item">
      <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.06),0_0_1px_rgba(0,0,0,0.08)] overflow-hidden text-gray-900">

        {/* Header */}
        <div className="px-8 pt-6 pb-4 flex items-center gap-4">
          <Avatar name={name} url={avatarUrl || undefined} round={round} />
          <div className="min-w-0">
            <h1 className="text-[20px] font-semibold m-0 leading-tight">{name}</h1>
            {subtitle && <p className="text-[13px] text-gray-500 m-0 mt-0.5">{subtitle}</p>}
          </div>
        </div>

        {/* Tab bar */}
        <div className="px-8 border-b border-gray-200">
          <button className="py-2 px-1 text-[13px] font-medium text-gray-900 border-b-2 border-gray-900 -mb-px bg-transparent border-x-0 border-t-0 cursor-default">
            Overview
          </button>
        </div>

        {/* Two-column body */}
        <div className="flex min-h-[200px]">

          {/* Left: Profile Summary + Activity */}
          <div className="flex-1 p-8 border-r border-gray-100">
            <h3 className="text-[14px] font-semibold text-gray-900 m-0 mb-3">Profile Summary</h3>
            <p className="text-[13px] text-gray-500 leading-relaxed m-0">
              No summary available yet.
            </p>

            <div className="mt-8">
              <h3 className="text-[14px] font-semibold text-gray-900 m-0 mb-3">Activity</h3>
              <p className="text-[13px] italic m-0" style={{ color: "#E8612D" }}>
                No activity recorded for this object yet.
              </p>
            </div>
          </div>

          {/* Right sidebar: Details */}
          <div className="w-[340px] shrink-0 p-6">
            <h3 className="text-[14px] font-semibold text-gray-900 m-0 mb-4">Details</h3>

            {/* Filled fields */}
            {filledFields.map(([key, value]) => {
              const base = key.split(".").pop() ?? key;
              return (
                <div key={key} className="flex items-start gap-3 py-2">
                  <DetailFieldIcon field={key} />
                  <span className="text-[13px] text-gray-500 w-24 shrink-0">{humanize(key)}</span>
                  <span className="text-[13px] text-gray-900 flex-1">
                    {base === "stage" ? (
                      <StageBadge stage={String(value)} />
                    ) : Array.isArray(value) ? (
                      <span className="inline-flex gap-1.5 flex-wrap">
                        {value.map((v, i) => (
                          <span key={i} className="px-2 py-0.5 text-xs rounded bg-red-50 text-red-600">{String(v)}</span>
                        ))}
                      </span>
                    ) : (
                      fmt(key, value)
                    )}
                  </span>
                </div>
              );
            })}

            {/* Show/hide empty fields */}
            {emptyFields.length > 0 && (
              <button
                onClick={() => setShowEmpty(!showEmpty)}
                className="mt-3 text-[12px] text-[#E8612D] bg-transparent border-none cursor-pointer flex items-center gap-1 p-0"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={`transition-transform ${showEmpty ? "rotate-180" : ""}`}>
                  <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {showEmpty ? "Hide" : "Show"} {emptyFields.length} Empty field{emptyFields.length > 1 ? "s" : ""}
              </button>
            )}

            {showEmpty && emptyFields.map(([key]) => (
              <div key={key} className="flex items-start gap-3 py-2 opacity-50">
                <DetailFieldIcon field={key} />
                <span className="text-[13px] text-gray-400 w-24 shrink-0">{humanize(key)}</span>
                <span className="text-[13px] text-gray-300 italic">Empty</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      </div>
    </McpUseProvider>
  );
}
