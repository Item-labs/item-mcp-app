/** Internal fields hidden from display */
export const HIDDEN = new Set([
  "organization_id", "object_type_id", "created_by", "updated_by",
  "deleted_at", "deleted_by", "created_by_skill_run_id",
  "extra_fields", "custom_fields", "avatar_url", "logo_url", "profile_image_url",
]);

/**
 * Item API color name → [bg, text, dot] hex values.
 * Using inline hex because the framework regenerates widget CSS on startup,
 * wiping any custom @theme variables.
 */
export const COLORS: Record<string, [string, string, string]> = {
  "slate-dark":   ["#F1F5F9", "#475569", "#94A3B8"],
  "slate-light":  ["#F1F5F9", "#475569", "#94A3B8"],
  "blue-light":   ["#DBEAFE", "#1D4ED8", "#60A5FA"],
  "blue-dark":    ["#DBEAFE", "#1D4ED8", "#3B82F6"],
  "purple-light": ["#F3E8FF", "#7C3AED", "#C084FC"],
  "purple-dark":  ["#F3E8FF", "#7C3AED", "#A855F7"],
  "yellow-light": ["#FEF3C7", "#92400E", "#FBBF24"],
  "yellow-dark":  ["#FEF3C7", "#92400E", "#F59E0B"],
  "green-light":  ["#D1FAE5", "#065F46", "#34D399"],
  "green-dark":   ["#D1FAE5", "#065F46", "#10B981"],
  "red-light":    ["#FEE2E2", "#991B1B", "#F87171"],
  "red-dark":     ["#FEE2E2", "#991B1B", "#EF4444"],
};

export const DEFAULT_COLORS: [string, string, string] = ["#F1F5F9", "#475569", "#94A3B8"];

/** Stage value → API color name (from schema select_options) */
const STAGES: [string, string][] = [
  ["to_contact", "slate-dark"], ["in_contact", "blue-light"], ["scheduling_replied", "blue-dark"],
  ["discovery_meeting", "purple-light"], ["deep_dive_meeting", "purple-dark"], ["to_onboard", "yellow-light"],
  ["won_subscribed", "green-dark"], ["not_right_timing", "yellow-dark"], ["lost_ghosted", "red-light"], ["churn", "red-dark"],
];

export const STAGE_COLOR_MAP = Object.fromEntries(STAGES);
export const STAGE_ORDER = STAGES.map(([s]) => s);

/** Avatar initials color palette [bg, fg] */
export const AVATAR_PALETTE = [
  ["bg-blue-100", "text-blue-700"], ["bg-pink-100", "text-pink-700"],
  ["bg-emerald-100", "text-emerald-700"], ["bg-amber-100", "text-amber-700"],
  ["bg-indigo-100", "text-indigo-700"], ["bg-red-100", "text-red-700"],
  ["bg-teal-100", "text-teal-700"], ["bg-violet-100", "text-violet-700"],
];
