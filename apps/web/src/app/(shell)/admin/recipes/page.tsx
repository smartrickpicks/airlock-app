"use client";

import Link from "next/link";
import { Plus, BookOpen } from "lucide-react";

const VAULT_TYPES = [
  "Distribution Agreement",
  "Publishing Deal",
  "License Agreement",
  "Co-Publishing Agreement",
  "Artist Management Agreement",
];

export default function AdminRecipesPage() {
  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-bold text-text-primary">Recipes</h1>
            <p className="mt-1 text-sm text-text-secondary">
              Define the step-by-step process each role follows in each chamber,
              per vault type.
            </p>
          </div>
          <Link
            href="/admin/recipes/create"
            className="flex items-center gap-1.5 rounded-md bg-accent-primary px-3 py-1.5 text-sm font-medium text-text-inverse transition-colors hover:bg-accent-primary-hover"
          >
            <Plus size={14} />
            Create a Recipe
          </Link>
        </div>

        <div className="mt-6 space-y-2">
          {VAULT_TYPES.map((vaultType) => (
            <div
              key={vaultType}
              className="flex items-center gap-3 rounded-lg border border-surface-border bg-surface-raised p-4"
            >
              <BookOpen size={16} className="flex-shrink-0 text-text-muted" />
              <div className="flex-1">
                <p className="text-sm font-medium text-text-primary">
                  {vaultType}
                </p>
                <p className="text-xs text-text-muted">
                  4 chambers · 3 roles · Airlock default
                </p>
              </div>
              <span className="rounded-full bg-accent-success/10 px-2 py-0.5 text-[10px] font-medium text-accent-success">
                Active
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
