"use client";

import { useAdminStore } from "@/stores/admin.store";
import { FLAG_STATUS_CONFIG, type FeatureFlagStatus } from "@/lib/mock-admin";

const STATUS_CYCLE: FeatureFlagStatus[] = ["disabled", "beta", "enabled"];

export default function FeatureFlags() {
  const { featureFlags, toggleFeatureFlag } = useAdminStore();

  const cycleStatus = (flagId: string, current: FeatureFlagStatus) => {
    const idx = STATUS_CYCLE.indexOf(current);
    const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
    toggleFeatureFlag(flagId, next);
  };

  const moduleFlags = featureFlags.filter((f) => f.module !== null);
  const platformFlags = featureFlags.filter((f) => f.module === null);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">
          Feature Control Plane
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          Toggle features for the entire workspace. Click a status to cycle
          through disabled → beta → enabled.
        </p>
      </div>

      <FlagSection
        title="Module Features"
        flags={moduleFlags}
        onCycle={cycleStatus}
      />
      <FlagSection
        title="Platform Features"
        flags={platformFlags}
        onCycle={cycleStatus}
      />
    </div>
  );
}

function FlagSection({
  title,
  flags,
  onCycle,
}: {
  title: string;
  flags: ReturnType<typeof useAdminStore.getState>["featureFlags"];
  onCycle: (id: string, current: FeatureFlagStatus) => void;
}) {
  return (
    <div>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
        {title}
      </h3>
      <div className="rounded-lg border border-surface-border bg-surface-raised divide-y divide-surface-border">
        {flags.map((flag) => {
          const cfg = FLAG_STATUS_CONFIG[flag.status];
          return (
            <div
              key={flag.id}
              className="flex items-center justify-between px-4 py-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-text-primary">
                    {flag.label}
                  </span>
                  {flag.module && (
                    <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-surface-overlay text-text-muted">
                      {flag.module}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-text-muted truncate">
                  {flag.description}
                </p>
              </div>
              <button
                onClick={() => onCycle(flag.id, flag.status)}
                className={`ml-4 flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${cfg.color}`}
              >
                <span
                  className={`inline-block h-1.5 w-1.5 rounded-full ${cfg.dotColor}`}
                />
                {cfg.label}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
