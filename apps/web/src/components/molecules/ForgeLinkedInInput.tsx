"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Linkedin } from "lucide-react";

interface ForgeLinkedInInputProps {
  onSubmit: (url: string) => void;
  isLoading?: boolean;
}

export default function ForgeLinkedInInput({
  onSubmit,
  isLoading = false,
}: ForgeLinkedInInputProps) {
  const [url, setUrl] = useState("");

  const handleSubmit = () => {
    if (!url.trim() || isLoading) return;
    onSubmit(url.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSubmit();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex items-center gap-2 py-2"
    >
      <div className="flex flex-1 items-center gap-2 rounded-lg border border-surface-border bg-surface-overlay px-3 py-2">
        <Linkedin className="h-4 w-4 shrink-0 text-text-muted" />
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          placeholder="https://linkedin.com/in/yourname"
          className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none disabled:opacity-50"
        />
      </div>
      <button
        onClick={handleSubmit}
        disabled={!url.trim() || isLoading}
        className="rounded-lg bg-accent-primary px-4 py-2 text-sm font-medium text-text-inverse transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isLoading ? "Scanning..." : "Go"}
      </button>
      <button
        onClick={() => onSubmit("skip")}
        disabled={isLoading}
        className="text-sm text-text-muted transition-colors hover:text-text-secondary disabled:opacity-40"
      >
        Skip
      </button>
    </motion.div>
  );
}
