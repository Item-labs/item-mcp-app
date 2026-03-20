import { Checkbox, Avatar, Cell } from "../lib/ui.js";
import { humanize, singularLabel, getName, getAvatar } from "../lib/format.js";
import type { Item } from "../lib/types.js";

export function TableView({
  items, headers, objectType, selectedIds, hoveredId,
  onToggle, onToggleAll, onClick, onHover,
}: {
  items: Item[];
  headers: string[];
  objectType: string;
  selectedIds: Set<string>;
  hoveredId: string | null;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  onClick: (item: Item) => void;
  onHover: (id: string | null) => void;
}) {
  const round = objectType === "contacts";
  const nameCol = headers.find((c) => c === "name");
  const otherHeaders = headers.filter((c) => c !== "name");

  return (
    <div className="max-h-[520px] overflow-y-auto overflow-x-auto">
      <table className="w-full border-collapse text-[14px]">
        <thead>
          <tr className="sticky top-0 bg-white z-10 border-b border-gray-200">
            <th className="pl-6 pr-2 py-3 w-10">
              <Checkbox checked={items.length > 0 && selectedIds.size === items.length} onChange={onToggleAll} />
            </th>
            {nameCol && (
              <th className="py-3 pl-2 pr-4 text-left text-[14px] font-medium text-gray-900 whitespace-nowrap">
                {singularLabel(objectType)}
              </th>
            )}
            {otherHeaders.map((c) => (
              <th key={c} className="py-3 px-4 text-left text-[14px] font-medium text-gray-900 whitespace-nowrap">
                {humanize(c)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => {
            const checked = selectedIds.has(item.id);
            const hovered = hoveredId === item.id;
            return (
              <tr
                key={item.id}
                onClick={() => onClick(item)}
                onMouseEnter={() => onHover(item.id)}
                onMouseLeave={() => onHover(null)}
                className={`cursor-pointer transition-colors duration-75 ${
                  checked ? "bg-[#F0F4F6]" : hovered ? "bg-gray-50" : ""
                }`}
              >
                <td className="pl-6 pr-2 py-0 w-10 border-b border-gray-100/70">
                  <Checkbox checked={checked} onChange={() => onToggle(item.id)} />
                </td>
                {nameCol && (
                  <td className="py-3 pl-2 pr-4 border-b border-gray-100/70 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <span className="text-[13px] text-gray-400 w-5 text-right shrink-0">{i + 1}</span>
                      <Avatar name={getName(item)} url={getAvatar(item) || undefined} round={round} />
                      <span className="font-medium text-gray-900 text-[14px]">{getName(item)}</span>
                    </div>
                  </td>
                )}
                {otherHeaders.map((c) => (
                  <td key={c} className="py-3 px-4 border-b border-gray-100/70 whitespace-nowrap max-w-[240px] overflow-hidden text-ellipsis">
                    <Cell col={c} item={item} />
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
