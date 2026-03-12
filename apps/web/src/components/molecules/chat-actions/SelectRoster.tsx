"use client";

import { useState } from "react";
import UserAvatar from "@/components/atoms/UserAvatar";
import type { MetaArchetype } from "@/components/atoms/UserAvatar";

interface RosterOption {
  id: string;
  name: string;
  role: string;
  imageUrl?: string;
  metaArchetype?: MetaArchetype;
}

interface SelectRosterProps {
  options: RosterOption[];
  onSelect: (userId: string) => void;
  context?: string;
  selectedId?: string | null;
}

export default function SelectRoster({
  options,
  onSelect,
  context,
  selectedId,
}: SelectRosterProps) {
  const [search, setSearch] = useState("");

  const filtered = options.filter(
    (o) =>
      o.name.toLowerCase().includes(search.toLowerCase()) ||
      o.role.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="rounded-lg border border-surface-border bg-surface-raised p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
          Assign Member
        </span>
        {context && (
          <span className="text-[10px] text-text-muted">{context}</span>
        )}
      </div>

      {options.length > 4 && (
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
          className="mb-2 w-full rounded border border-surface-border bg-surface-overlay px-2 py-1 text-[12px] text-text-primary placeholder:text-text-muted focus:outline-none"
        />
      )}

      <div className="space-y-1 max-h-40 overflow-y-auto">
        {filtered.map((person) => {
          const isSelected = selectedId === person.id;
          return (
            <button
              key={person.id}
              onClick={() => onSelect(person.id)}
              disabled={!!selectedId}
              className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors ${
                isSelected
                  ? "bg-[#00D1FF]/10 border border-[#00D1FF]/30"
                  : "hover:bg-surface-overlay border border-transparent"
              } disabled:opacity-60`}
            >
              <UserAvatar
                name={person.name}
                imageUrl={person.imageUrl}
                metaArchetype={person.metaArchetype}
                size="xs"
              />
              <div className="text-left min-w-0">
                <p className="text-[12px] font-medium text-text-primary truncate">
                  {person.name}
                </p>
                <p className="text-[10px] text-text-muted capitalize">
                  {person.role}
                </p>
              </div>
              {isSelected && (
                <span className="ml-auto text-[10px] text-[#00D1FF]">
                  Selected
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
