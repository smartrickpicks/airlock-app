"use client";

import { useState } from "react";
import { ChevronDown, Eye } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type {
  ProvenanceData,
  DriveEvidence,
  BehavioralTension,
  ProfileDistance,
  ForgeDrives,
} from "@/lib/mock-forge";

interface InferenceProvenancePanelProps {
  provenance: ProvenanceData;
  confidenceBreakdown: Record<string, number>;
  drives: ForgeDrives;
}

const DRIVE_COLORS: Record<string, string> = {
  dominance: "text-accent-primary",
  extraversion: "text-accent-warning",
  patience: "text-accent-success",
  formality: "text-[var(--chamber-review)]",
};

const BREAKDOWN_LABELS: Record<string, string> = {
  conversation_base: "Conversation",
  additional_questions: "Extra questions",
  linkedin: "LinkedIn import",
  resume: "Resume upload",
  career_title: "Career title",
  distance_penalty: "Distance penalty",
};

export default function InferenceProvenancePanel({
  provenance,
  confidenceBreakdown,
  drives,
}: InferenceProvenancePanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const matchProfile = provenance.all_distances.find((d) => d.is_match);
  const runnerUp = provenance.all_distances.find((d) => d.is_runner_up);
  const rejectedTop5 = provenance.all_distances
    .filter((d) => !d.is_match && !d.is_runner_up)
    .slice(0, 5);

  return (
    <div className="rounded-lg border border-surface-border bg-surface-raised">
      {/* Toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-surface-overlay/50"
      >
        <div className="flex items-center gap-2">
          <Eye size={14} className="text-accent-primary" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
            How I got here
          </span>
        </div>
        <ChevronDown
          size={14}
          className={`text-text-muted transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="space-y-4 border-t border-surface-border px-4 pb-4 pt-3">
              {/* Section 1: Confidence Breakdown */}
              <section>
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
                  Confidence Sources
                </h4>
                <div className="mt-2 space-y-1.5">
                  {Object.entries(confidenceBreakdown).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between"
                    >
                      <span className="text-[11px] text-text-secondary">
                        {BREAKDOWN_LABELS[key] ?? key.replace(/_/g, " ")}
                      </span>
                      <span
                        className={`text-[11px] font-semibold ${
                          value >= 0 ? "text-accent-success" : "text-red-400"
                        }`}
                      >
                        {value >= 0 ? "+" : ""}
                        {Math.round(value * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Section 2: Drive Evidence */}
              <section>
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
                  Drive Evidence
                </h4>
                <div className="mt-2 space-y-2">
                  {provenance.drive_evidence.map((ev) => (
                    <DriveEvidenceRow key={ev.drive} evidence={ev} />
                  ))}
                </div>
              </section>

              {/* Section 3: Profile Distances */}
              <section>
                <button
                  onClick={() =>
                    setActiveSection(
                      activeSection === "distances" ? null : "distances",
                    )
                  }
                  className="flex w-full items-center justify-between"
                >
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
                    Why not another profile?
                  </h4>
                  <ChevronDown
                    size={12}
                    className={`text-text-muted transition-transform ${
                      activeSection === "distances" ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <AnimatePresence>
                  {activeSection === "distances" && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mt-2 space-y-1 overflow-hidden"
                    >
                      {matchProfile && (
                        <DistanceRow distance={matchProfile} variant="match" />
                      )}
                      {runnerUp && (
                        <DistanceRow distance={runnerUp} variant="runner-up" />
                      )}
                      {rejectedTop5.map((d) => (
                        <DistanceRow
                          key={d.profile_id}
                          distance={d}
                          variant="rejected"
                        />
                      ))}
                      <p className="pt-1 text-[9px] text-text-muted">
                        {provenance.all_distances.length -
                          2 -
                          rejectedTop5.length}{" "}
                        more profiles further away — all 17 computed.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>

              {/* Section 4: Behavioral Tensions */}
              {provenance.behavioral_tensions.length > 0 && (
                <section>
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-accent-warning">
                    Behavioral Tensions
                  </h4>
                  <div className="mt-2 space-y-2">
                    {provenance.behavioral_tensions.map((t, i) => (
                      <TensionCard key={i} tension={t} />
                    ))}
                  </div>
                </section>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DriveEvidenceRow({ evidence }: { evidence: DriveEvidence }) {
  const [expanded, setExpanded] = useState(false);
  const color = DRIVE_COLORS[evidence.drive] ?? "text-text-secondary";

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 text-left"
      >
        <span className={`w-20 text-[11px] font-semibold ${color}`}>
          {evidence.drive.charAt(0).toUpperCase() + evidence.drive.slice(1)}
        </span>
        <span className="text-[11px] font-bold text-text-primary">
          {evidence.value}
        </span>
        <ChevronDown
          size={10}
          className={`ml-auto text-text-muted transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="ml-2 mt-1 space-y-1 border-l border-surface-border pl-3">
              {evidence.signals.map((s, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span
                    className={`shrink-0 text-[10px] font-semibold ${
                      s.contribution >= 0
                        ? "text-accent-success"
                        : "text-red-400"
                    }`}
                  >
                    {s.contribution >= 0 ? "+" : ""}
                    {s.contribution}
                  </span>
                  <span className="text-[10px] text-text-muted">
                    {s.reason}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DistanceRow({
  distance,
  variant,
}: {
  distance: ProfileDistance;
  variant: "match" | "runner-up" | "rejected";
}) {
  const bgClass =
    variant === "match"
      ? "bg-accent-primary/10 border-accent-primary/30"
      : variant === "runner-up"
        ? "bg-accent-warning/10 border-accent-warning/30"
        : "bg-surface-overlay border-surface-border";

  return (
    <div className={`rounded border px-2 py-1.5 ${bgClass}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-text-primary">
            {distance.profile_name}
          </span>
          {variant === "match" && (
            <span className="rounded-full bg-accent-primary/20 px-1.5 py-0.5 text-[9px] font-bold text-accent-primary">
              MATCH
            </span>
          )}
          {variant === "runner-up" && (
            <span className="rounded-full bg-accent-warning/20 px-1.5 py-0.5 text-[9px] font-bold text-accent-warning">
              RUNNER-UP
            </span>
          )}
        </div>
        <span className="text-[10px] font-mono text-text-muted">
          d={distance.distance.toFixed(2)}
        </span>
      </div>
      {distance.rejection_reason && (
        <p className="mt-0.5 text-[10px] text-text-muted">
          {distance.rejection_reason}
        </p>
      )}
    </div>
  );
}

function TensionCard({ tension }: { tension: BehavioralTension }) {
  return (
    <div className="rounded border border-accent-warning/30 bg-accent-warning/5 px-3 py-2">
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-semibold text-accent-warning">
          {tension.drive_a}: {tension.value_a}
        </span>
        <span className="text-[10px] text-text-muted">vs</span>
        <span className="text-[11px] font-semibold text-accent-warning">
          {tension.drive_b}: {tension.value_b}
        </span>
      </div>
      <p className="mt-1 text-[11px] leading-relaxed text-text-secondary">
        {tension.description}
      </p>
    </div>
  );
}
