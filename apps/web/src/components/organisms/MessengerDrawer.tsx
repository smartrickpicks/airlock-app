"use client";

import { useEffect, useState } from "react";
import { MessageCircle, Search, X, Bookmark, Smile } from "lucide-react";
import { useMessengerStore } from "@/stores/messenger.store";
import { useModuleStore } from "@/stores/module.store";
import ConversationList from "@/components/organisms/ConversationList";
import ChatView from "@/components/organisms/ChatView";
import ChatPreferences from "@/components/organisms/ChatPreferences";
import SearchMessages from "@/components/molecules/SearchMessages";
import SavedMessages from "@/components/molecules/SavedMessages";
import SetStatusModal from "@/components/molecules/SetStatusModal";

export default function MessengerDrawer() {
  const [showPrefs, setShowPrefs] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [showSetStatus, setShowSetStatus] = useState(false);

  const myStatus = useMessengerStore((s) => s.userStatuses["user_001"]);

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

      {showSetStatus && (
        <SetStatusModal onClose={() => setShowSetStatus(false)} />
      )}

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
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowSetStatus(true)}
              className="p-1.5 rounded text-text-tertiary hover:text-text-primary hover:bg-surface-hover transition-colors flex items-center gap-1"
              aria-label="Set status"
              title={
                myStatus ? `${myStatus.emoji} ${myStatus.text}` : "Set status"
              }
            >
              {myStatus ? (
                <span className="text-xs leading-none">{myStatus.emoji}</span>
              ) : (
                <Smile size={16} />
              )}
            </button>
            <button
              onClick={() => {
                setShowSearch((v) => !v);
                setShowPrefs(false);
                setShowSaved(false);
              }}
              className="p-1.5 rounded text-text-tertiary hover:text-text-primary hover:bg-surface-hover transition-colors"
              aria-label="Search messages"
            >
              <Search size={16} />
            </button>
            <button
              onClick={() => {
                setShowSaved((v) => !v);
                setShowSearch(false);
                setShowPrefs(false);
              }}
              className={`p-1.5 rounded transition-colors hover:bg-surface-hover ${showSaved ? "text-[#00D1FF]" : "text-text-tertiary hover:text-text-primary"}`}
              aria-label="Saved messages"
            >
              <Bookmark size={16} />
            </button>
            <button
              onClick={() => {
                setShowPrefs(true);
                setShowSearch(false);
              }}
              className="p-1.5 rounded text-text-tertiary hover:text-text-primary hover:bg-surface-hover transition-colors"
              aria-label="Chat preferences"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
            </button>
            <button
              onClick={closeDrawer}
              className="text-text-muted hover:text-text-primary transition-colors"
              aria-label="Close messenger"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {showSearch ? (
            <SearchMessages
              onClose={() => setShowSearch(false)}
              onResultClick={(id) => {
                setShowSearch(false);
                openConversation(id);
              }}
            />
          ) : showSaved ? (
            <SavedMessages onClose={() => setShowSaved(false)} />
          ) : showPrefs ? (
            <ChatPreferences onClose={() => setShowPrefs(false)} />
          ) : activeConversation ? (
            <ChatView
              conversation={activeConversation}
              messages={activeMessages}
              typingUsers={activeTyping}
              onBack={backToList}
              onSendMessage={(content) =>
                sendMessage(activeConversation.id, content)
              }
              onSendGif={(gifData) =>
                sendMessage(activeConversation.id, "", gifData)
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
