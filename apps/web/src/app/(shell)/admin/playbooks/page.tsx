"use client";

import Link from "next/link";
import { Plus, BookMarked } from "lucide-react";

export default function AdminPlaybooksPage() {
  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-bold text-text-primary">Playbooks</h1>
            <p className="mt-1 text-sm text-text-secondary">
              Role-specific guides and escalation paths that complement your
              recipes.
            </p>
          </div>
          <Link
            href="/admin/playbooks/create"
            className="flex items-center gap-1.5 rounded-md bg-accent-primary px-3 py-1.5 text-sm font-medium text-text-inverse transition-colors hover:bg-accent-primary-hover"
          >
            <Plus size={14} />
            Create a Playbook
          </Link>
        </div>

        <div className="mt-6 flex flex-col items-center gap-3 py-12 text-center">
          <BookMarked size={32} className="text-text-muted" />
          <p className="text-sm font-medium text-text-primary">
            No playbooks yet
          </p>
          <p className="text-xs text-text-muted">
            Create your first playbook to define role-specific guidance for your
            team.
          </p>
          <Link
            href="/admin/playbooks/create"
            className="mt-2 flex items-center gap-1.5 rounded-md border border-surface-border px-3 py-1.5 text-sm text-text-secondary transition-colors hover:bg-surface-overlay hover:text-text-primary"
          >
            <Plus size={14} />
            Create a Playbook
          </Link>
        </div>
      </div>
    </div>
  );
}
