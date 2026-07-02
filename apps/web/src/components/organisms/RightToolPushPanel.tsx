"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Mail,
  MessageSquare,
  Phone,
  Globe,
  ChevronRight,
  X,
} from "lucide-react";
import { useNotificationStore } from "@/stores/notification.store";
import { useMessengerStore } from "@/stores/messenger.store";
import { useModuleStore } from "@/stores/module.store";
import { useShellStore } from "@/stores/shell.store";
import {
  NOTIFICATION_CATEGORY_CONFIG,
  NOTIFICATION_TYPE_CONFIG,
} from "@/lib/mock-notifications";
import { MOCK_CRM_INBOX_THREADS } from "@/lib/mock-crm-enhancements";

const CHANNEL_ICON = {
  text: MessageSquare,
  email: Mail,
  web_form: Globe,
  call: Phone,
} as const;

export default function RightToolPushPanel() {
  const router = useRouter();
  const activeRightTool = useShellStore((s) => s.activeRightTool);
  const closeTool = useShellStore((s) => s.closeTool);
  const activeModule = useModuleStore((s) => s.activeModule);
  const filteredNotifications = useNotificationStore(
    (s) => s.filteredNotifications,
  );
  const setFilterCategory = useNotificationStore((s) => s.setFilterCategory);
  const markRead = useNotificationStore((s) => s.markRead);
  const filteredConversations = useMessengerStore(
    (s) => s.filteredConversations,
  );
  const [actionNote, setActionNote] = useState(
    "Choose a quick action to jump directly into a workspace flow.",
  );
  const notifications = filteredNotifications();
  const conversations = filteredConversations(
    activeModule === "home" ? "contracts" : activeModule,
  );

  const title = useMemo(() => {
    switch (activeRightTool) {
      case "activity":
        return "Activity & Alerts";
      case "inbox":
        return "Inbox";
      case "quick_actions":
        return "Quick Actions";
      default:
        return "";
    }
  }, [activeRightTool]);

  if (
    activeRightTool !== "activity" &&
    activeRightTool !== "inbox" &&
    activeRightTool !== "quick_actions"
  ) {
    return null;
  }

  return (
    <aside className="flex h-full w-[360px] flex-shrink-0 flex-col border-l border-surface-border bg-surface-raised">
      <div className="flex items-center justify-between border-b border-surface-border px-4 py-3">
        <div>
          <div className="text-sm font-semibold text-text-primary">{title}</div>
          <div className="text-[11px] text-text-muted">
            {activeRightTool === "activity"
              ? "Global and workspace-triggered work"
              : activeRightTool === "inbox"
                ? "Comms and memory-linked intake"
                : "Fast actions scoped to the current workspace"}
          </div>
        </div>
        <button
          className="rounded p-1 text-text-muted transition-colors hover:bg-surface-overlay hover:text-text-primary"
          onClick={closeTool}
          aria-label="Close tool panel"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeRightTool === "activity" ? (
          <div className="space-y-3 p-4">
            <div className="flex flex-wrap gap-2">
              <FilterChip
                label="All"
                onClick={() => setFilterCategory("all")}
              />
              <FilterChip
                label="Contracts"
                onClick={() => setFilterCategory("contract")}
              />
              <FilterChip
                label="Vault"
                onClick={() => setFilterCategory("crm")}
              />
              <FilterChip
                label="Tasks"
                onClick={() => setFilterCategory("task")}
              />
            </div>
            {notifications.map((item) => {
              const typeCfg = NOTIFICATION_TYPE_CONFIG[item.type];
              const catCfg = NOTIFICATION_CATEGORY_CONFIG[item.category];
              return (
                <button
                  key={item.id}
                  className="block w-full rounded-xl border border-surface-border bg-surface-overlay p-3 text-left transition-colors hover:bg-surface-raised"
                  onClick={() => {
                    markRead(item.id);
                    if (item.href) router.push(item.href);
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-text-primary">
                        {item.title}
                      </div>
                      <div className="mt-1 text-xs text-text-muted">
                        {item.body}
                      </div>
                    </div>
                    <div
                      className={`rounded-full px-2 py-1 text-[10px] font-medium ${typeCfg.bgColor} ${typeCfg.color}`}
                    >
                      {catCfg.label}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : null}

        {activeRightTool === "inbox" ? (
          <div className="space-y-4 p-4">
            <section>
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                Omni-Channel Intake
              </div>
              <div className="space-y-2">
                {MOCK_CRM_INBOX_THREADS.map((thread) => {
                  const Icon = CHANNEL_ICON[thread.channel];
                  return (
                    <button
                      key={thread.id}
                      className="block w-full rounded-xl border border-surface-border bg-surface-overlay p-3 text-left transition-colors hover:bg-surface-raised"
                      onClick={() => router.push("/crm/inbox")}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2">
                          <Icon
                            size={15}
                            className="mt-0.5 text-accent-primary"
                          />
                          <div>
                            <div className="text-sm font-medium text-text-primary">
                              {thread.contactName}
                            </div>
                            <div className="text-[11px] text-text-muted">
                              {thread.accountName}
                            </div>
                            <div className="mt-1 text-xs text-text-secondary">
                              {thread.preview}
                            </div>
                          </div>
                        </div>
                        <ChevronRight size={14} className="text-text-muted" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
            <section>
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                Internal Collaboration
              </div>
              <div className="space-y-2">
                {conversations.slice(0, 4).map((conversation) => (
                  <button
                    key={conversation.id}
                    className="block w-full rounded-xl border border-surface-border bg-surface-overlay p-3 text-left transition-colors hover:bg-surface-raised"
                    onClick={() => {
                      closeTool();
                      useMessengerStore.getState().openDrawer();
                      useMessengerStore
                        .getState()
                        .openConversation(conversation.id);
                      useShellStore.getState().openTool("messenger");
                    }}
                  >
                    <div className="text-sm font-medium text-text-primary">
                      {conversation.name ??
                        conversation.participants.find(
                          (p) => p.userId !== "user_self",
                        )?.name ??
                        "Conversation"}
                    </div>
                    <div className="mt-1 text-xs text-text-muted">
                      {conversation.lastMessage?.content ?? "No messages yet"}
                    </div>
                  </button>
                ))}
              </div>
            </section>
          </div>
        ) : null}

        {activeRightTool === "quick_actions" ? (
          <div className="space-y-4 p-4">
            <div className="grid gap-2">
              <QuickActionButton
                label="Create Task"
                onClick={() =>
                  go(
                    router,
                    "/tasks/inbox",
                    "Opened task creation flow in Tasks.",
                  )
                }
              />
              <QuickActionButton
                label="Create Contact"
                onClick={() =>
                  go(
                    router,
                    "/crm/contacts",
                    "Jumped to Vault contacts for stakeholder creation.",
                  )
                }
              />
              <QuickActionButton
                label="Upload / Import Document"
                onClick={() =>
                  go(
                    router,
                    "/documents/library",
                    "Jumped to Documents import flow.",
                  )
                }
              />
              <QuickActionButton
                label="Run Preflight"
                onClick={() =>
                  go(
                    router,
                    "/contracts/triage",
                    "Opened contract intake and preflight queue.",
                  )
                }
              />
              <QuickActionButton
                label="Generate Contract"
                onClick={() =>
                  go(
                    router,
                    "/contracts/generator",
                    "Opened generator workspace.",
                  )
                }
              />
              <QuickActionButton
                label="Send for Signature"
                onClick={() =>
                  go(
                    router,
                    "/contracts/review-queue",
                    "Opened contract review and signature handoff.",
                  )
                }
              />
            </div>
            <div className="rounded-xl border border-surface-border bg-surface-overlay p-3 text-xs text-text-muted">
              {actionNote}
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );

  function go(
    pushRouter: ReturnType<typeof useRouter>,
    href: string,
    note: string,
  ) {
    setActionNote(note);
    pushRouter.push(href);
  }
}

function FilterChip({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="rounded-full bg-surface-overlay px-2.5 py-1 text-[10px] font-medium text-text-secondary transition-colors hover:text-text-primary"
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function QuickActionButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="rounded-xl border border-surface-border bg-surface-overlay px-3 py-3 text-left text-sm font-medium text-text-primary transition-colors hover:bg-surface-raised"
      onClick={onClick}
    >
      {label}
    </button>
  );
}
