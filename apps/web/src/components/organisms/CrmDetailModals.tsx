"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  MessageSquareMore,
  Users,
} from "lucide-react";
import Modal from "@/components/molecules/Modal";
import ProgressBar from "@/components/atoms/ProgressBar";
import AccountMemoryWorkspace from "@/components/organisms/AccountMemoryWorkspace";
import {
  CHAMBER_LABELS,
  CONTRACT_READINESS_LABELS,
  LEAD_SOURCE_LABELS,
  LEAD_STAGE_CONFIG,
  SEGMENT_LABELS,
  STAKEHOLDER_ROLE_LABELS,
  type CrmAccount,
  type CrmDeal,
  type CrmLead,
} from "@/lib/mock-crm";

export function AccountDetailModal({
  account,
  isOpen,
  onClose,
  onAddContact,
  onPromoteToBuild,
}: {
  account: CrmAccount | null;
  isOpen: boolean;
  onClose: () => void;
  onAddContact?: () => void;
  onPromoteToBuild?: () => void;
}) {
  const [activeTab, setActiveTab] = useState<
    "overview" | "workspace" | "stakeholders" | "artifacts"
  >("overview");
  if (!account) return null;
  const workspace = account.accountMemory;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Account Detail" size="lg">
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-text-primary">
              {account.name}
            </h3>
            <p className="mt-1 text-sm text-text-secondary">
              {SEGMENT_LABELS[account.segment]} account with {account.dealCount}{" "}
              active deal
              {account.dealCount !== 1 ? "s" : ""}.
            </p>
            {(account.latestSummary || account.workflowName) && (
              <p className="mt-2 max-w-3xl text-sm text-text-secondary">
                {account.latestSummary ||
                  "Account workspace available for communications and shared memory."}
              </p>
            )}
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            {onAddContact ? (
              <button
                onClick={onAddContact}
                className="rounded-full border border-surface-border px-2 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-overlay hover:text-text-primary"
              >
                Add Contact
              </button>
            ) : null}
            {onPromoteToBuild ? (
              <button
                onClick={onPromoteToBuild}
                className="rounded-full bg-chamber-build/15 px-2 py-1 text-xs font-medium text-chamber-build transition-colors hover:bg-chamber-build/25"
              >
                Promote to Build
              </button>
            ) : null}
            <span className="rounded-full bg-surface-overlay px-2 py-1 text-xs font-medium text-text-secondary">
              Health {account.healthScore}
            </span>
            <span className="rounded-full bg-accent-primary/10 px-2 py-1 text-xs font-medium text-accent-primary">
              Account Memory
            </span>
            {workspace?.conceptBadge ? (
              <span className="rounded-full bg-surface-overlay px-2 py-1 text-xs font-medium text-text-secondary">
                {workspace.conceptBadge}
              </span>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
          <MetaItem label="Segment" value={SEGMENT_LABELS[account.segment]} />
          <MetaItem label="Deals" value={String(account.dealCount)} />
          <MetaItem
            label="Value"
            value={`$${account.totalValue.toLocaleString()}`}
          />
          <MetaItem label="Contacts" value={String(account.contacts.length)} />
          <MetaItem
            label="Owner"
            value={account.primaryOwnerName || "Unassigned"}
          />
          <MetaItem
            label="Chamber"
            value={
              account.currentChamber
                ? CHAMBER_LABELS[account.currentChamber]
                : "Discover"
            }
          />
          <MetaItem
            label="Contract Readiness"
            value={
              account.contractReadiness
                ? CONTRACT_READINESS_LABELS[account.contractReadiness]
                : "Not Started"
            }
          />
          <MetaItem
            label="Pending Gates"
            value={String(account.pendingGateCount ?? 0)}
          />
        </div>

        <div className="flex flex-wrap gap-2 border-b border-surface-border pb-3">
          {[
            { id: "overview", label: "Overview", icon: CheckCircle2 },
            { id: "workspace", label: "Workspace", icon: MessageSquareMore },
            { id: "stakeholders", label: "Stakeholders", icon: Users },
            { id: "artifacts", label: "Artifacts + AI", icon: Bot },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() =>
                  setActiveTab(
                    tab.id as
                      | "overview"
                      | "workspace"
                      | "stakeholders"
                      | "artifacts",
                  )
                }
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? "bg-accent-primary/15 text-accent-primary"
                    : "bg-surface-overlay text-text-secondary hover:text-text-primary"
                }`}
              >
                <Icon size={12} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === "workspace" && workspace ? (
          <AccountMemoryWorkspace
            workspace={workspace}
            accountName={account.name}
          />
        ) : null}

        {activeTab === "overview" ? (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <div className="space-y-4">
              <div className="rounded-lg border border-surface-border bg-surface-sunken/40 p-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Contacts
                </h4>
                <div className="mt-3 space-y-2">
                  {account.contacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="flex items-center justify-between rounded-lg bg-surface-raised px-3 py-2"
                    >
                      <div>
                        <div className="text-sm font-medium text-text-primary">
                          {contact.name}
                        </div>
                        <div className="text-xs text-text-muted">
                          {contact.role}
                          {contact.email ? ` · ${contact.email}` : ""}
                        </div>
                      </div>
                      <div className="text-right text-xs text-text-secondary">
                        <div>{contact.interactionCount} interactions</div>
                        <div>
                          {new Date(
                            contact.lastInteraction,
                          ).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-surface-border bg-surface-sunken/40 p-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Lifecycle
                </h4>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <MetaItem
                    label="Next Recommended Action"
                    value={
                      account.nextRecommendedAction || "Awaiting next action"
                    }
                  />
                  <MetaItem
                    label="Workflow"
                    value={account.workflowName || "No active workflow"}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border border-surface-border bg-surface-sunken/40 p-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Account Memory Status
                </h4>
                {workspace ? (
                  <div className="mt-3 space-y-3 text-sm text-text-secondary">
                    <div className="rounded-lg border border-surface-border bg-surface-raised p-3">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                        Pending Approvals
                      </div>
                      <div className="mt-1 text-text-primary">
                        {workspace.pendingApprovals}
                      </div>
                    </div>
                    <div className="rounded-lg border border-surface-border bg-surface-raised p-3">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                        Open Actions
                      </div>
                      <div className="mt-1 text-text-primary">
                        {workspace.openActionItems}
                      </div>
                    </div>
                    {workspace.stakeholderGap ? (
                      <div className="rounded-lg border border-amber-400/20 bg-amber-500/10 p-3 text-amber-200">
                        <div className="flex items-start gap-2">
                          <AlertTriangle size={14} className="mt-0.5" />
                          <div>
                            <div className="text-[10px] font-semibold uppercase tracking-wider">
                              Stakeholder Gap
                            </div>
                            <div className="mt-1 text-sm">
                              {workspace.stakeholderGap}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-text-muted">
                    Account memory is not expanded for this mock account yet.
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === "stakeholders" ? (
          workspace ? (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
              <div className="rounded-lg border border-surface-border bg-surface-sunken/40 p-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Stakeholder Map
                </h4>
                <div className="mt-3 space-y-3">
                  {workspace.stakeholders.map((stakeholder) => (
                    <div
                      key={stakeholder.id}
                      className="rounded-lg border border-surface-border bg-surface-raised p-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="text-sm font-medium text-text-primary">
                            {stakeholder.name}
                          </div>
                          <div className="text-xs text-text-muted">
                            {stakeholder.roleTitle} ·{" "}
                            {
                              STAKEHOLDER_ROLE_LABELS[
                                stakeholder.stakeholderRole
                              ]
                            }
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 text-[10px]">
                          <span className="rounded-full bg-surface-overlay px-2 py-0.5 text-text-secondary">
                            {stakeholder.influence} influence
                          </span>
                          <span className="rounded-full bg-surface-overlay px-2 py-0.5 text-text-secondary">
                            {stakeholder.status}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 ${
                              stakeholder.sentiment === "positive"
                                ? "bg-accent-success/15 text-accent-success"
                                : stakeholder.sentiment === "negative"
                                  ? "bg-accent-danger/15 text-accent-danger"
                                  : "bg-surface-overlay text-text-secondary"
                            }`}
                          >
                            {stakeholder.sentiment}
                          </span>
                        </div>
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <MetaItem
                          label="Decision Role"
                          value={stakeholder.decisionRole}
                        />
                        <MetaItem label="Owner" value={stakeholder.ownerName} />
                      </div>
                      <p className="mt-3 text-sm text-text-secondary">
                        {stakeholder.notes}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-text-muted">
                        {stakeholder.channelLabels.map((label) => (
                          <span
                            key={label}
                            className="rounded-full bg-surface-overlay px-2 py-0.5"
                          >
                            {label}
                          </span>
                        ))}
                        <span>
                          Last touched{" "}
                          {new Date(
                            stakeholder.lastTouched,
                          ).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-lg border border-surface-border bg-surface-sunken/40 p-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                    Stakeholder Groups
                  </h4>
                  <div className="mt-3 space-y-2">
                    {workspace.stakeholderGroups.map((group) => (
                      <div
                        key={group.id}
                        className="rounded-lg border border-surface-border bg-surface-raised p-3"
                      >
                        <div className="text-sm font-medium text-text-primary">
                          {group.name}
                        </div>
                        <p className="mt-1 text-xs text-text-secondary">
                          {group.description}
                        </p>
                        <div className="mt-2 text-[11px] text-text-muted">
                          Members: {group.members.join(", ")}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
                          {group.channelModes.map((mode) => (
                            <span
                              key={mode}
                              className="rounded-full bg-surface-overlay px-2 py-0.5 text-text-secondary"
                            >
                              {mode}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <EmptyAccountSection text="Stakeholder mapping is not expanded for this mock account yet." />
          )
        ) : null}

        {activeTab === "artifacts" ? (
          workspace ? (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="rounded-lg border border-surface-border bg-surface-sunken/40 p-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Linked Artifacts
                </h4>
                <div className="mt-3 space-y-2">
                  {workspace.artifacts.map((artifact) => (
                    <div
                      key={artifact.id}
                      className="flex items-center justify-between rounded-lg border border-surface-border bg-surface-raised px-3 py-2"
                    >
                      <div>
                        <div className="text-sm text-text-primary">
                          {artifact.label}
                        </div>
                        <div className="text-[10px] uppercase tracking-wider text-text-muted">
                          {artifact.type.replace("_", " ")}
                        </div>
                      </div>
                      <div className="text-right text-xs text-text-secondary">
                        <div>{artifact.status}</div>
                        <div className="text-[10px] text-text-muted">
                          {new Date(artifact.updatedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-surface-border bg-surface-sunken/40 p-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                  AI Assist
                </h4>
                <div className="mt-3 space-y-2">
                  {workspace.aiAssist.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-lg border border-surface-border bg-surface-raised p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-medium text-text-primary">
                          {item.title}
                        </div>
                        <span className="text-[10px] text-text-muted">
                          {item.confidence}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-text-secondary">
                        {item.detail}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <EmptyAccountSection text="Artifacts and AI assist are not expanded for this mock account yet." />
          )
        ) : null}
      </div>
    </Modal>
  );
}

export function LeadDetailModal({
  lead,
  isOpen,
  onClose,
}: {
  lead: CrmLead | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!lead) return null;
  const stage = LEAD_STAGE_CONFIG[lead.stage];
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Lead Detail" size="md">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-base font-semibold text-text-primary">
            {lead.name}
          </h3>
          <p className="mt-1 text-sm text-text-secondary">
            {LEAD_SOURCE_LABELS[lead.source]} lead with match status{" "}
            {lead.matchStatus}.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <MetaItem label="Source" value={LEAD_SOURCE_LABELS[lead.source]} />
          <MetaItem label="Stage" value={stage.label} />
          <MetaItem
            label="Score"
            value={lead.score !== null ? String(lead.score) : "Pending"}
          />
          <MetaItem label="Assigned" value={lead.assignedRep || "Unassigned"} />
          <MetaItem
            label="Chamber"
            value={
              lead.currentChamber
                ? CHAMBER_LABELS[lead.currentChamber]
                : "Discover"
            }
          />
          <MetaItem
            label="Contract Readiness"
            value={
              lead.contractReadiness
                ? CONTRACT_READINESS_LABELS[lead.contractReadiness]
                : "Not Started"
            }
          />
        </div>
        {(lead.latestSummary ||
          lead.nextRecommendedAction ||
          lead.workflowName) && (
          <div className="rounded-lg border border-surface-border bg-surface-sunken/40 p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Lifecycle
            </h4>
            {lead.latestSummary && (
              <p className="mt-3 text-sm text-text-secondary">
                {lead.latestSummary}
              </p>
            )}
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <MetaItem
                label="Next Recommended Action"
                value={
                  lead.nextRecommendedAction || "Awaiting reviewer decision"
                }
              />
              <MetaItem
                label="Workflow"
                value={lead.workflowName || "No active workflow"}
              />
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

export function DealDetailModal({
  deal,
  isOpen,
  onClose,
}: {
  deal: CrmDeal | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!deal) return null;
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Deal Detail" size="md">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-base font-semibold text-text-primary">
            {deal.title}
          </h3>
          <p className="mt-1 text-sm text-text-secondary">
            {deal.accountName} · {deal.vaultSlug}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <MetaItem label="Value" value={`$${deal.value.toLocaleString()}`} />
          <MetaItem label="Rep" value={deal.assignedRep || "Unassigned"} />
          <MetaItem label="Tasks" value={String(deal.taskCount)} />
          <MetaItem label="Overdue" value={String(deal.overdueTaskCount)} />
          <MetaItem
            label="Chamber"
            value={
              deal.currentChamber
                ? CHAMBER_LABELS[deal.currentChamber]
                : "Build"
            }
          />
          <MetaItem
            label="Contract Readiness"
            value={
              deal.contractReadiness
                ? CONTRACT_READINESS_LABELS[deal.contractReadiness]
                : "Not Started"
            }
          />
        </div>
        <div className="rounded-lg border border-surface-border bg-surface-sunken/40 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Progress
            </span>
            <span className="text-xs text-text-secondary">
              {deal.daysInStage}d in stage
            </span>
          </div>
          <ProgressBar
            value={deal.progressPercent}
            showLabel
            className="mt-3"
          />
          {deal.nextTask && (
            <p className="mt-3 text-sm text-text-secondary">
              <span className="text-text-muted">Next task:</span>{" "}
              {deal.nextTask}
            </p>
          )}
        </div>
        {(deal.latestSummary ||
          deal.nextRecommendedAction ||
          deal.workflowName) && (
          <div className="rounded-lg border border-surface-border bg-surface-sunken/40 p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Lifecycle
            </h4>
            {deal.latestSummary && (
              <p className="mt-3 text-sm text-text-secondary">
                {deal.latestSummary}
              </p>
            )}
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <MetaItem
                label="Next Recommended Action"
                value={deal.nextRecommendedAction || "Awaiting next branch"}
              />
              <MetaItem
                label="Workflow"
                value={deal.workflowName || "No active workflow"}
              />
              <MetaItem
                label="Pending Gates"
                value={String(deal.pendingGateCount ?? 0)}
              />
              <MetaItem
                label="Intake Source"
                value={
                  deal.intakeSource
                    ? LEAD_SOURCE_LABELS[deal.intakeSource]
                    : "Unknown"
                }
              />
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-surface-border bg-surface-raised p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
        {label}
      </div>
      <div className="mt-1 text-sm text-text-primary">{value}</div>
    </div>
  );
}

function EmptyAccountSection({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-surface-border bg-surface-sunken/40 p-4 text-sm text-text-muted">
      {text}
    </div>
  );
}
