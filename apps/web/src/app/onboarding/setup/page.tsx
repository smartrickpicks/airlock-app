"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Rocket } from "lucide-react";
import { useCapabilityTreeStore } from "@/stores/capability-tree.store";

export default function OnboardingSetupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const initTree = useCapabilityTreeStore((s) => s.initTree);
  const saveNodeConfig = useCapabilityTreeStore((s) => s.saveNodeConfig);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleLaunch() {
    if (!name.trim()) return;
    const trimmed = name.trim();
    const slug = trimmed.toLowerCase().replace(/\s+/g, "-");
    // Reset capability tree to fresh state
    initTree(false);
    // Pre-populate workspace node so the config panel reads it
    saveNodeConfig("workspace", { name: trimmed, industry: "", slug });
    router.push("/admin");
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
        </div>

        {/* Launch button */}
        <button
          onClick={handleLaunch}
          disabled={!name.trim()}
          className="mt-6 w-full rounded-lg bg-accent-primary py-3 text-sm font-semibold text-surface-base transition-colors hover:bg-accent-primary-hover disabled:cursor-not-allowed disabled:opacity-40"
        >
          Launch Workspace
        </button>
      </div>
    </div>
  );
}
