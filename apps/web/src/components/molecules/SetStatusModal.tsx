"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useMessengerStore } from "@/stores/messenger.store";

const QUICK_STATUSES = [
  { emoji: "📞", text: "In a meeting" },
  { emoji: "🚌", text: "Commuting" },
  { emoji: "🤒", text: "Out sick" },
  { emoji: "🏖️", text: "On vacation" },
  { emoji: "🎯", text: "Focusing" },
  { emoji: "🍽️", text: "Lunch break" },
];

export default function SetStatusModal({ onClose }: { onClose: () => void }) {
  const setUserStatus = useMessengerStore((s) => s.setUserStatus);
  const clearUserStatus = useMessengerStore((s) => s.clearUserStatus);
  const currentStatus = useMessengerStore((s) => s.userStatuses["user_001"]);

  const [emoji, setEmoji] = useState(currentStatus?.emoji || "😊");
  const [text, setText] = useState(currentStatus?.text || "");

  const handleSave = () => {
    if (text.trim()) {
      setUserStatus(emoji, text.trim());
    }
    onClose();
  };

  const handleClear = () => {
    clearUserStatus();
    onClose();
  };

  const handleQuickStatus = (quick: { emoji: string; text: string }) => {
    setUserStatus(quick.emoji, quick.text);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-sm rounded-lg border border-white/10 bg-[#1a1a2e] shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h3 className="text-sm font-semibold text-white">Set Status</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Custom status input */}
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 rounded-md bg-white/5 px-3 py-2">
            <button
              onClick={() => {
                const emojis = ["😊", "🎯", "💻", "📚", "🔥", "✨", "🚀", "💡"];
                const idx = emojis.indexOf(emoji);
                setEmoji(emojis[(idx + 1) % emojis.length]);
              }}
              className="text-lg hover:scale-110 transition-transform"
              title="Click to change emoji"
            >
              {emoji}
            </button>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="What's your status?"
              className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 outline-none"
              maxLength={80}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
              }}
            />
          </div>
        </div>

        {/* Quick statuses */}
        <div className="border-t border-white/5 px-4 py-2">
          <p className="mb-2 text-xs text-gray-500">Quick set</p>
          <div className="space-y-0.5">
            {QUICK_STATUSES.map((qs) => (
              <button
                key={qs.text}
                onClick={() => handleQuickStatus(qs)}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-gray-300 transition-colors hover:bg-white/[0.06]"
              >
                <span>{qs.emoji}</span>
                <span>{qs.text}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between border-t border-white/10 px-4 py-3">
          {currentStatus ? (
            <button
              onClick={handleClear}
              className="text-xs text-red-400 hover:text-red-300"
            >
              Clear status
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded px-3 py-1.5 text-xs text-gray-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="rounded bg-[#00D1FF]/20 px-3 py-1.5 text-xs text-[#00D1FF] hover:bg-[#00D1FF]/30 disabled:opacity-40"
              disabled={!text.trim()}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
