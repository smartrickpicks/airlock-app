"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import {
  NODE_PALETTE,
  NODE_CATEGORY_CONFIG,
  type NodeCategory,
} from "@/lib/mock-workflows";

export default function WorkflowNodeSidebar() {
  const [search, setSearch] = useState("");

  const filtered = search
    ? NODE_PALETTE.filter(
        (n) =>
          n.label.toLowerCase().includes(search.toLowerCase()) ||
          n.description.toLowerCase().includes(search.toLowerCase()),
      )
    : NODE_PALETTE;

  const categories: NodeCategory[] = ["trigger", "function", "action"];

  return (
    <div className="flex h-full w-[200px] flex-col border-r border-surface-border bg-surface-sunken">
      {/* Header */}
      <div className="border-b border-surface-border px-3 py-2.5">
        <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
          Nodes
        </p>
      </div>

      {/* Search */}
      <div className="border-b border-surface-border px-3 py-2">
        <div className="relative">
          <Search
            size={12}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search nodes..."
            className="w-full rounded border border-surface-border bg-surface-overlay py-1 pl-7 pr-2 text-[11px] text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
          />
        </div>
      </div>

      {/* Node palette */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {categories.map((cat) => {
          const items = filtered.filter((n) => n.category === cat);
          if (items.length === 0) return null;
          const cfg = NODE_CATEGORY_CONFIG[cat];

          return (
            <div key={cat} className="mb-3">
              <p
                className={`mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider ${cfg.color}`}
              >
                {cfg.label}
              </p>
              <div className="space-y-1">
                {items.map((node) => (
                  <div
                    key={node.type}
                    className={`
                      cursor-grab rounded-md border px-2.5 py-1.5
                      ${cfg.borderColor} ${cfg.bgColor}
                      transition-colors hover:brightness-110
                    `}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData(
                        "application/workflow-node",
                        node.type,
                      );
                      e.dataTransfer.effectAllowed = "move";
                    }}
                  >
                    <p className="text-[11px] font-medium text-text-primary">
                      {node.label}
                    </p>
                    <p className="text-[9px] text-text-muted">
                      {node.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="px-1 py-4 text-center text-[11px] text-text-muted italic">
            No matching nodes
          </p>
        )}
      </div>
    </div>
  );
}
