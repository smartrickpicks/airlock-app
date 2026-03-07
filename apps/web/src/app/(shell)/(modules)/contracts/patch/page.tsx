"use client";

import { useState } from "react";
import PatchEditor from "@/components/organisms/PatchEditor";
import PatchList from "@/components/molecules/PatchList";
import { MOCK_EXTRACTIONS } from "@/lib/mock-extractions";
import { MOCK_PATCHES } from "@/lib/mock-patches";

const VAULT_ID = "vault_004";

export default function PatchPage() {
  const [selectedPatchId, setSelectedPatchId] = useState<string | null>(null);

  const extraction = MOCK_EXTRACTIONS[VAULT_ID];
  const fields = extraction.sections.flatMap((s) => s.fields);
  const patches = MOCK_PATCHES[VAULT_ID] ?? [];

  return (
    <div className="h-full overflow-y-auto flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">
            Patch Editor
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Create and manage field patches
          </p>
        </div>
        <span className="rounded-full bg-chamber-build/20 px-3 py-1 text-xs font-medium text-chamber-build">
          Build
        </span>
      </div>

      {/* Existing Patches */}
      <section className="rounded-lg border border-surface-border bg-surface-raised">
        <div className="border-b border-surface-border px-4 py-3">
          <h2 className="text-sm font-semibold text-text-primary">
            Existing Patches
          </h2>
          <p className="mt-0.5 text-xs text-text-muted">
            {patches.length} patch{patches.length !== 1 ? "es" : ""} for this
            vault
          </p>
        </div>
        <PatchList
          patches={patches}
          selectedPatchId={selectedPatchId}
          onSelect={setSelectedPatchId}
          className="p-2"
        />
      </section>

      {/* Patch Editor */}
      <section className="rounded-lg border border-surface-border bg-surface-raised">
        <PatchEditor
          fields={fields}
          onSaveDraft={(data) => {
            console.log("Patch draft saved:", data);
          }}
          onCancel={() => {
            console.log("Patch cancelled");
          }}
        />
      </section>
    </div>
  );
}
