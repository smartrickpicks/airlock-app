"use client";

import { useState } from "react";

interface CodeBlockEmbedProps {
  code: string;
  language?: string;
  title?: string;
}

export default function CodeBlockEmbed({
  code,
  language = "text",
  title,
}: CodeBlockEmbedProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg border border-surface-border bg-surface-raised overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-surface-border px-3 py-1.5">
        <span className="text-[10px] font-mono text-text-muted">
          {title || language}
        </span>
        <button
          onClick={handleCopy}
          className="text-[10px] text-text-muted hover:text-text-primary transition-colors"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      {/* Code */}
      <pre className="overflow-x-auto p-3 text-[12px] leading-relaxed font-mono text-text-secondary bg-surface-sunken">
        <code>{code}</code>
      </pre>
    </div>
  );
}
