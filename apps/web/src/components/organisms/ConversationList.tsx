"use client";

import { Search } from "lucide-react";
import type { Conversation } from "@/lib/mock-messenger";
import ConversationListItem from "@/components/molecules/ConversationListItem";

interface ConversationListProps {
  conversations: Conversation[];
  scope: "module" | "global";
  activeModule: string;
  searchQuery: string;
  onSelectConversation: (id: string) => void;
  onScopeChange: (scope: "module" | "global") => void;
  onSearchChange: (query: string) => void;
}

export default function ConversationList({
  conversations,
  scope,
  activeModule,
  searchQuery,
  onSelectConversation,
  onScopeChange,
  onSearchChange,
}: ConversationListProps) {
  const moduleLabel =
    activeModule.charAt(0).toUpperCase() + activeModule.slice(1);

  return (
    <div className="flex h-full flex-col">
      {/* Search + scope */}
      <div className="space-y-2 border-b border-surface-border px-3 pb-3 pt-3">
        {/* Search */}
        <div className="flex items-center gap-2 rounded-lg border border-surface-border bg-surface-overlay px-2.5 py-1.5">
          <Search size={14} className="text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search..."
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
          />
        </div>

        {/* Scope toggle */}
        <div className="flex rounded-lg border border-surface-border bg-surface-sunken p-0.5">
          <button
            onClick={() => onScopeChange("module")}
            className={`flex-1 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              scope === "module"
                ? "bg-accent-primary/15 text-accent-primary"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            {moduleLabel}
          </button>
          <button
            onClick={() => onScopeChange("global")}
            className={`flex-1 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              scope === "global"
                ? "bg-accent-primary/15 text-accent-primary"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            All
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-sm text-text-muted">No conversations found</p>
          </div>
        ) : (
          conversations.map((conv) => (
            <ConversationListItem
              key={conv.id}
              conversation={conv}
              onClick={() => onSelectConversation(conv.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
