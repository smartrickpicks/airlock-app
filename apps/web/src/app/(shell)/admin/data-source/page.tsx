"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Upload, CheckCircle, Loader2 } from "lucide-react";
import { MOCK_DATA_SOURCES } from "@/lib/mock-admin";
import { useOnboardingStore } from "@/stores/onboarding.store";
import { fadeInUp } from "@/lib/animations";

type SourceStatus = "connected" | "pending" | "error" | "not_configured";

const STATUS_CONFIG: Record<
  SourceStatus,
  { label: string; color: string; dot: string }
> = {
  connected: {
    label: "Connected",
    color: "bg-accent-success/15 text-accent-success",
    dot: "bg-accent-success",
  },
  pending: {
    label: "Pending",
    color: "bg-accent-warning/15 text-accent-warning",
    dot: "bg-accent-warning",
  },
  error: {
    label: "Error",
    color: "bg-accent-error/15 text-accent-error",
    dot: "bg-accent-error",
  },
  not_configured: {
    label: "Not configured",
    color: "bg-text-muted/15 text-text-muted",
    dot: "bg-text-muted",
  },
};

export default function AdminDataSourcePage() {
  const completeAdminItem = useOnboardingStore((s) => s.completeAdminItem);
  const [sources, setSources] = useState(MOCK_DATA_SOURCES);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "done">(
    "idle",
  );

  function handleConnect(sourceId: string) {
    setConnectingId(sourceId);
    setSources((prev) =>
      prev.map((s) =>
        s.id === sourceId ? { ...s, status: "pending" as const } : s,
      ),
    );
    setTimeout(() => {
      setSources((prev) =>
        prev.map((s) =>
          s.id === sourceId
            ? {
                ...s,
                status: "connected" as const,
                lastSync: new Date().toISOString(),
              }
            : s,
        ),
      );
      setConnectingId(null);
      completeAdminItem("connect_source");
    }, 1500);
  }

  function handleUploadBatch() {
    setUploadState("uploading");
    setTimeout(() => {
      setUploadState("done");
      completeAdminItem("upload_batch");
    }, 2000);
  }

  const hasConnected = sources.some((s) => s.status === "connected");

  return (
    <motion.div className="h-full overflow-y-auto p-6" {...fadeInUp}>
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-lg font-bold text-text-primary">Data sources</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Manage database connections and external data imports. Internal
            sources are managed automatically.
          </p>
        </div>

        <div className="divide-y divide-surface-border rounded-lg border border-surface-border bg-surface-raised">
          {sources.map((source) => {
            const status = STATUS_CONFIG[source.status as SourceStatus];
            const isConnecting = connectingId === source.id;
            return (
              <motion.div
                key={source.id}
                className="flex items-start justify-between p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex-1 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="flex h-1.5 w-1.5 rounded-full">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${status.dot}`}
                      />
                    </span>
                    <span className="text-sm font-medium text-text-primary">
                      {source.label}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}
                    >
                      {isConnecting ? "Connecting..." : status.label}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-text-secondary">
                    {source.description}
                  </p>
                  {source.lastSync && (
                    <p className="mt-1 text-xs text-text-muted">
                      Last sync: {new Date(source.lastSync).toLocaleString()}
                    </p>
                  )}
                </div>
                {source.status === "not_configured" ? (
                  <button
                    onClick={() => handleConnect(source.id)}
                    disabled={isConnecting}
                    className="rounded-md border border-surface-border px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-surface-overlay disabled:opacity-50"
                  >
                    {isConnecting ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      "Connect"
                    )}
                  </button>
                ) : (
                  <button className="rounded-md border border-surface-border px-3 py-1.5 text-xs font-medium text-text-muted hover:bg-surface-overlay">
                    Configure
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>

        {hasConnected && (
          <motion.div
            className="rounded-lg border border-surface-border bg-surface-raised p-5"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-primary/15">
                <Upload size={18} className="text-accent-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-text-primary">
                  Upload First Batch
                </h3>
                <p className="mt-1 text-xs text-text-secondary">
                  Upload a batch of contract PDFs to populate your workspace.
                  Airlock will parse, extract, and create vaults automatically.
                </p>
                <div className="mt-3">
                  {uploadState === "idle" && (
                    <button
                      onClick={handleUploadBatch}
                      className="inline-flex items-center gap-2 rounded-lg bg-accent-primary px-4 py-2 text-xs font-semibold text-surface-base transition-colors hover:bg-accent-primary-hover"
                    >
                      <Upload size={14} />
                      Upload Batch
                    </button>
                  )}
                  {uploadState === "uploading" && (
                    <div className="flex items-center gap-2 text-xs text-accent-primary">
                      <Loader2 size={14} className="animate-spin" />
                      Processing batch upload...
                    </div>
                  )}
                  {uploadState === "done" && (
                    <div className="flex items-center gap-2 text-xs text-accent-success">
                      <CheckCircle size={14} />
                      Batch uploaded successfully
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
