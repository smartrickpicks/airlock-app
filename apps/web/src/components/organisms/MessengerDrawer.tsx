"use client";

import { useEffect } from "react";
import { MessageCircle, X } from "lucide-react";
import { useMessengerStore } from "@/stores/messenger.store";
import { useModuleStore } from "@/stores/module.store";
import ConversationList from "@/components/organisms/ConversationList";
import ChatView from "@/components/organisms/ChatView";

export default function MessengerDrawer() {
  const {
    isDrawerOpen,
    closeDrawer,
    activeConversationId,
    conversations,
    messages,
    scope,
    searchQuery,
    typingUsers,
    openConversation,
    backToList,
    setScope,
    setSearchQuery,
    sendMessage,
    filteredConversations,
  } = useMessengerStore();

  const activeModule = useModuleStore((s) => s.activeModule) || "contracts";

  // Close on Escape
  useEffect(() => {
    if (!isDrawerOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDrawer();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isDrawerOpen, closeDrawer]);

  if (!isDrawerOpen) return null;

  const activeConversation = activeConversationId
    ? conversations.find((c) => c.id === activeConversationId) || null
    : null;
  const activeMessages = activeConversationId
    ? messages[activeConversationId] || []
    : [];
  const activeTyping = activeConversationId
    ? typingUsers[activeConversationId] || []
    : [];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[var(--z-overlay)]"
        onClick={closeDrawer}
      />

      {/* Drawer panel */}
      <div className="fixed right-0 top-0 z-[var(--z-modal)] flex h-full w-[340px] flex-col border-l border-surface-border bg-surface-raised shadow-2xl">
        {/* Drawer header */}
        <div className="flex items-center justify-between border-b border-surface-border px-4 py-2.5">
          <div className="flex items-center gap-2">
            <MessageCircle size={16} className="text-accent-primary" />
            <span className="text-sm font-semibold text-text-primary">
              Messenger
            </span>
          </div>
          <button
            onClick={closeDrawer}
            className="text-text-muted hover:text-text-primary transition-colors"
            aria-label="Close messenger"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {activeConversation ? (
            <ChatView
              conversation={activeConversation}
              messages={activeMessages}
              typingUsers={activeTyping}
              onBack={backToList}
              onSendMessage={(content) =>
                sendMessage(activeConversation.id, content)
              }
            />
          ) : (
            <ConversationList
              conversations={filteredConversations(activeModule)}
              scope={scope}
              activeModule={activeModule}
              searchQuery={searchQuery}
              onSelectConversation={openConversation}
              onScopeChange={setScope}
              onSearchChange={setSearchQuery}
            />
          )}
        </div>
      </div>
    </>
  );
}
