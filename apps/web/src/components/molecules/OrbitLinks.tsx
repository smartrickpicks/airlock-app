"use client";

import type { OrbitLink, OrbitProfile } from "@/stores/orbit.store";
import { orbitApi } from "@/lib/orbit-api";

interface OrbitLinksProps {
  links: OrbitLink[];
  slug: string;
  theme: OrbitProfile["theme"];
}

export default function OrbitLinks({ links, slug, theme }: OrbitLinksProps) {
  if (links.length === 0) return null;

  const handleLinkClick = (link: OrbitLink) => {
    // Fire-and-forget click tracking
    orbitApi.trackClick(slug, link.id).catch(() => {
      // Silently ignore tracking failures
    });
    window.open(link.url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="w-full max-w-md mx-auto px-6 space-y-3">
      {links.map((link) => (
        <button
          key={link.id}
          type="button"
          onClick={() => handleLinkClick(link)}
          className="w-full rounded-xl px-5 py-4 text-center font-medium text-white transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]"
          style={{
            backgroundColor: `${theme.primary_color || "#7c3aed"}22`,
            border: `1px solid ${theme.accent_color || theme.primary_color || "#7c3aed"}55`,
          }}
        >
          {link.title}
        </button>
      ))}
    </div>
  );
}
