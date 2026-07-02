"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SendHorizonal, CircleCheckBig, TriangleAlert } from "lucide-react";
import PatchEditor from "@/components/organisms/PatchEditor";
import PatchList from "@/components/molecules/PatchList";
import Button from "@/components/atoms/Button";
import { MOCK_EXTRACTIONS } from "@/lib/mock-extractions";
import { usePatchStore } from "@/stores/patch.store";
import { useOnboardingStore } from "@/stores/onboarding.store";
import { fadeInUp, scaleIn } from "@/lib/animations";

const VAULT_ID = "vault_004";

export default function PatchPage() {
  const {
    patches,
    selectedPatch,
    isLoading,
    error,
    fetchPatches,
    selectPatch,
    createDraft,
    transitionPatch,
  } = usePatchStore();

  const [showEditor, setShowEditor] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchPatches(VAULT_ID);
  }, [fetchPatches]);

  const extraction = MOCK_EXTRACTIONS[VAULT_ID];
  const fields = extraction.sections.flatMap((s) => s.fields);

  const handleSaveDraft = useCallback(
    async (data: {
      field_name: string;
      current_value: string;
      proposed_value: string;
      intent: string;
      because_clause: string;
    }) => {
      await createDraft(VAULT_ID, data);
      setSuccessMessage("Draft saved");
      setTimeout(() => setSuccessMessage(null), 2500);
    },
    [createDraft],
  );

  const handleSubmitPatch = useCallback(
    async (patchId: string, version: number) => {
      await transitionPatch(VAULT_ID, patchId, "submitted", version);
      useOnboardingStore.getState().completeChecklistItem("submit_patch");
      setSuccessMessage("Patch submitted for review");
      setTimeout(() => setSuccessMessage(null), 2500);
    },
    [transitionPatch],
  );

  const handleCancel = useCallback(() => {
    setShowEditor(false);
    setTimeout(() => setShowEditor(true), 100);
  }, []);

  // Find draft patches that can be submitted
  const draftPatches = patches.filter((p) => p.state === "draft");

  return (
    <motion.div
      className="h-full overflow-y-auto flex flex-col gap-6 p-6"
      {...fadeInUp}
    >
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

      {/* Status messages */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            className="flex items-center gap-2 rounded-lg border border-accent-success/30 bg-accent-success/10 px-4 py-2.5 text-sm text-accent-success"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <CircleCheckBig size={16} />
            {successMessage}
          </motion.div>
        )}
        {error && (
          <motion.div
            className="flex items-center gap-2 rounded-lg border border-accent-error/30 bg-accent-error/10 px-4 py-2.5 text-sm text-accent-error"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <TriangleAlert size={16} />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Draft patches ready to submit */}
      {draftPatches.length > 0 && (
        <motion.section
          className="rounded-lg border border-chamber-build/30 bg-chamber-build/5"
          {...scaleIn}
        >
          <div className="border-b border-chamber-build/20 px-4 py-3">
            <h2 className="text-sm font-semibold text-text-primary">
              Ready to Submit
            </h2>
            <p className="mt-0.5 text-xs text-text-muted">
              {draftPatches.length} draft{draftPatches.length !== 1 ? "s" : ""}{" "}
              awaiting submission
            </p>
          </div>
          <div className="divide-y divide-surface-border">
            {draftPatches.map((patch) => (
              <div
                key={patch.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="flex-1 pr-4">
                  <span className="text-sm font-medium text-text-primary">
                    {patch.field_name}
                  </span>
                  <p className="mt-0.5 text-xs text-text-muted">
                    {patch.current_value} → {patch.proposed_value}
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleSubmitPatch(patch.id, patch.version)}
                  disabled={isLoading}
                  className="gap-1.5"
                >
                  <SendHorizonal size={12} />
                  Submit for Review
                </Button>
              </div>
            ))}
          </div>
        </motion.section>
      )}

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
          selectedPatchId={selectedPatch?.id ?? null}
          onSelect={selectPatch}
          className="p-2"
        />
      </section>

      {/* Patch Editor */}
      {showEditor && (
        <section className="rounded-lg border border-surface-border bg-surface-raised">
          <PatchEditor
            fields={fields}
            onSaveDraft={handleSaveDraft}
            onCancel={handleCancel}
          />
        </section>
      )}
    </motion.div>
  );
}
