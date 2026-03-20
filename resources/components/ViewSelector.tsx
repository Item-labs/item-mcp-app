import type { ViewMeta } from "../lib/types.js";

/**
 * TODO: View icon should be dynamically fetched from the view object.
 * The API currently does not return an `icon` field on views.
 */
const VIEW_ICON = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 opacity-40">
    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2 2" />
  </svg>
);

export function ViewSelector({
  title, tabs, currentId, total, onSwitch,
}: {
  title: string;
  tabs: ViewMeta[];
  currentId: string;
  total?: number;
  onSwitch: (viewId: string) => void;
}) {
  return (
    <div className="pt-4 px-8">
      <div className="flex items-center border-b border-gray-200 overflow-x-auto gap-0">
        {/* "{Type} Lists" label */}
        <div className="flex items-center gap-1.5 pr-6 mr-1 text-[#E8612D] text-[14px] font-medium whitespace-nowrap py-2.5 border-r border-gray-200">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="shrink-0">
            <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          {title} Lists
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="shrink-0 ml-0.5 opacity-70">
            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Tabs */}
        {tabs.map((v) => {
          const isActive = v.id === currentId;
          return (
            <button
              key={v.id}
              onClick={() => onSwitch(v.id)}
              className={`py-2.5 px-4 text-[14px] bg-transparent border-none cursor-pointer whitespace-nowrap flex items-center gap-2 -mb-px transition-all duration-100 ${
                isActive
                  ? "font-semibold text-gray-900 border-b-[2.5px] border-gray-900"
                  : "font-normal text-gray-400 border-b-[2.5px] border-transparent hover:text-gray-500"
              }`}
            >
              {VIEW_ICON}
              {v.name}
              {total != null && (
                <span className={`text-[12px] font-normal ${isActive ? "text-gray-500" : "text-gray-400"}`}>
                  {total.toLocaleString()}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
