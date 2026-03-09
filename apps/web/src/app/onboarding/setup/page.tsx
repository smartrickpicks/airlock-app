"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Rocket } from "lucide-react";
import { useCapabilityTreeStore } from "@/stores/capability-tree.store";
import { apiFetch } from "@/lib/api";

interface WorkspaceResponse {
  id: string;
  name: string;
  slug: string;
}

export default function OnboardingSetupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const initTree = useCapabilityTreeStore((s) => s.initTree);
  const saveNodeConfig = useCapabilityTreeStore((s) => s.saveNodeConfig);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleLaunch() {
    if (!name.trim()) return;
    const trimmed = name.trim();
    setError("");
    setLoading(true);

    try {
      const workspace = await apiFetch<WorkspaceResponse>(
        "/api/v1/workspaces",
        {
          method: "POST",
          body: JSON.stringify({ name: trimmed }),
        },
      );

      // Clear stale localStorage and reset capability tree
      if (typeof window !== "undefined") {
        localStorage.removeItem("airlock_capability_tree");
      }
      initTree(false);
      saveNodeConfig("workspace", {
        name: workspace.name,
        industry: "",
        slug: workspace.slug,
      });
      saveNodeConfig("data_source", {
        type: "local",
        label: "Local File Storage",
      });

      localStorage.setItem("airlock_onboarding_complete", "true");
      router.push("/admin");
    } catch (err) {
      // Fallback: save locally if API is unavailable
      const slug = trimmed.toLowerCase().replace(/\s+/g, "-");
      if (typeof window !== "undefined") {
        localStorage.removeItem("airlock_capability_tree");
      }
      initTree(false);
      saveNodeConfig("workspace", { name: trimmed, industry: "", slug });
      saveNodeConfig("data_source", {
        type: "local",
        label: "Local File Storage",
      });

      if (err instanceof Error && err.message.includes("409")) {
        setError("A workspace with that name already exists.");
        setLoading(false);
        return;
      }

      localStorage.setItem("airlock_onboarding_complete", "true");
      router.push("/admin");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-base p-4">
      <div className="w-full max-w-md rounded-xl border border-surface-border bg-surface-overlay p-8 shadow-2xl">
        {/* Icon */}
        <div className="mb-6 flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-primary/10">
            <Rocket size={24} className="text-accent-primary" />
          </div>
        </div>

        {/* Header */}
        <h2 className="text-center text-lg font-bold text-text-primary">
          Name your workspace
        </h2>
        <p className="mt-1 text-center text-sm text-text-secondary">
          You can change this later.
        </p>

        {/* Input */}
        <div className="mt-6">
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLaunch()}
            placeholder="Acme Records"
            className="w-full rounded-lg border border-surface-border bg-surface-sunken px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
          />
          {error && <p className="mt-2 text-xs text-accent-danger">{error}</p>}
        </div>

        {/* Launch button */}
        <button
          onClick={handleLaunch}
          disabled={!name.trim() || loading}
          className="mt-6 w-full rounded-lg bg-accent-primary py-3 text-sm font-semibold text-surface-base transition-colors hover:bg-accent-primary-hover disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? "Creating..." : "Launch Workspace"}
        </button>
      </div>
    </div>
  );
}
