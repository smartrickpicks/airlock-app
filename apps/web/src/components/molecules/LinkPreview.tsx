"use client";

import { ExternalLink } from "lucide-react";

export interface LinkPreviewData {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  favicon?: string;
}

interface LinkPreviewProps {
  preview: LinkPreviewData;
}

export default function LinkPreview({ preview }: LinkPreviewProps) {
  const domain = new URL(preview.url).hostname.replace("www.", "");

  return (
    <a
      href={preview.url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-1 flex items-start gap-3 rounded-md border-l-2 border-blue-500 bg-white/[0.03] p-2.5 transition-colors hover:bg-white/[0.06] max-w-md"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          {preview.favicon && (
            <img
              src={preview.favicon}
              alt=""
              className="h-3.5 w-3.5 rounded-sm"
            />
          )}
          <span>{preview.siteName || domain}</span>
          <ExternalLink className="h-3 w-3 opacity-50" />
        </div>
        {preview.title && (
          <p className="mt-0.5 text-sm font-medium text-blue-400 line-clamp-1">
            {preview.title}
          </p>
        )}
        {preview.description && (
          <p className="mt-0.5 text-xs text-gray-400 line-clamp-2">
            {preview.description}
          </p>
        )}
      </div>
      {preview.image && (
        <img
          src={preview.image}
          alt={preview.title || ""}
          className="h-16 w-16 flex-shrink-0 rounded object-cover"
        />
      )}
    </a>
  );
}
