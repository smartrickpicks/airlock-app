"use client";

import OttoAvatar from "@/components/atoms/OttoAvatar";
import UserAvatar from "@/components/atoms/UserAvatar";
import ChatEmbed from "@/components/molecules/ChatEmbed";
import type {
  OttoArchetype,
  OttoChamber,
  OttoState,
} from "@/components/atoms/OttoAvatar";
import type { MetaArchetype } from "@/components/atoms/UserAvatar";
import type { ChatEmbedData } from "@/components/molecules/ChatEmbed";

/* ── Types ─────────────────────────────────────────────────────────────── */

export interface ChatMessageProps {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: string;
  userName?: string;
  userImageUrl?: string;
  userMetaArchetype?: MetaArchetype;
  archetype?: OttoArchetype;
  chamber?: OttoChamber;
  ottoState?: OttoState;
  personaLabel?: string;
  isStreaming?: boolean;
  embeds?: ChatEmbedData[];
  onEmbedAction?: (type: string, payload: Record<string, unknown>) => void;
}

/* ── Archetype dot color for persona badge ─────────────────────────────── */

const ARCHETYPE_DOT: Record<OttoArchetype, string> = {
  analyst: "bg-[#6A9BCC]",
  architect: "bg-[#6366F1]",
  connector: "bg-[#14B8A6]",
  executor: "bg-[#F59E0B]",
  guardian: "bg-[#22C55E]",
  strategist: "bg-[#A855F7]",
};

/* ── Markdown-lite renderer ────────────────────────────────────────────── */

function OttoMarkdown({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        if (!line.trim()) return <br key={i} />;

        if (line.startsWith("**") && line.endsWith("**")) {
          return (
            <p key={i} className="font-semibold text-text-primary">
              {line.replace(/\*\*/g, "")}
            </p>
          );
        }

        if (/^[\d]+\./.test(line.trim()) || line.trim().startsWith("- ")) {
          const formatted = line
            .replace(/\*\*(.+?)\*\*/g, "$1")
            .replace(/--/g, "\u2014");
          return (
            <p key={i} className="pl-2 text-text-secondary">
              {formatted}
            </p>
          );
        }

        const parts = line.split(/(\*\*.+?\*\*)/g);
        return (
          <p key={i}>
            {parts.map((part, j) =>
              part.startsWith("**") && part.endsWith("**") ? (
                <span key={j} className="font-semibold text-text-primary">
                  {part.replace(/\*\*/g, "")}
                </span>
              ) : (
                <span key={j}>{part.replace(/--/g, "\u2014")}</span>
              ),
            )}
          </p>
        );
      })}
    </div>
  );
}

/* ── Component ─────────────────────────────────────────────────────────── */

export default function ChatMessage({
  role,
  content,
  timestamp,
  userName = "You",
  userImageUrl,
  userMetaArchetype,
  archetype,
  chamber,
  ottoState = "active",
  personaLabel,
  isStreaming,
  embeds,
  onEmbedAction,
}: ChatMessageProps) {
  if (role === "system") {
    return (
      <div className="py-1 text-center">
        <p className="text-[11px] italic text-text-muted">{content}</p>
      </div>
    );
  }

  const isUser = role === "user";

  return (
    <div className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div className="flex-shrink-0 pt-0.5">
        {isUser ? (
          <UserAvatar
            name={userName}
            imageUrl={userImageUrl}
            metaArchetype={userMetaArchetype}
            size="sm"
          />
        ) : (
          <OttoAvatar
            size="sm"
            archetype={archetype}
            chamber={chamber}
            state={isStreaming ? "thinking" : ottoState}
          />
        )}
      </div>

      <div
        className={`max-w-[80%] min-w-0 ${isUser ? "items-end" : "items-start"}`}
      >
        {!isUser && (archetype || personaLabel) && (
          <div className="mb-1 flex items-center gap-1.5">
            {archetype && (
              <span
                className={`h-1.5 w-1.5 rounded-full ${ARCHETYPE_DOT[archetype]}`}
              />
            )}
            <span className="text-[10px] font-medium text-text-muted capitalize">
              {personaLabel || archetype || "Otto"}
            </span>
            {chamber && (
              <>
                <span className="text-[8px] text-text-muted">&middot;</span>
                <span className="text-[10px] text-text-muted capitalize">
                  {chamber}
                </span>
              </>
            )}
          </div>
        )}

        <div
          className={`rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
            isUser
              ? "bg-[#00D1FF]/10 text-text-primary"
              : "bg-surface-overlay text-text-secondary"
          }`}
        >
          {isUser ? <p>{content}</p> : <OttoMarkdown content={content} />}

          {isStreaming && !isUser && (
            <span className="inline-block ml-0.5 w-[2px] h-[14px] bg-[#00D1FF] animate-pulse" />
          )}
        </div>

        {!isUser && embeds && embeds.length > 0 && (
          <div className="mt-2 space-y-2">
            {embeds.map((embed, idx) => (
              <ChatEmbed key={idx} embed={embed} onAction={onEmbedAction} />
            ))}
          </div>
        )}

        {timestamp && (
          <span
            className={`mt-0.5 block text-[9px] text-text-muted ${isUser ? "text-right" : "text-left"}`}
          >
            {new Date(timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
      </div>
    </div>
  );
}
