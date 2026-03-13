"use client";

import type { OrbitProfile } from "@/stores/orbit.store";

interface OrbitHeroProps {
  profile: OrbitProfile;
}

export default function OrbitHero({ profile }: OrbitHeroProps) {
  const { display_name, tagline, avatar_url, brand_pillars, theme } = profile;

  return (
    <div className="flex flex-col items-center text-center py-12 px-6 space-y-6">
      {/* Avatar */}
      <div
        className="h-24 w-24 rounded-full overflow-hidden border-4 flex-shrink-0"
        style={{ borderColor: theme.accent_color || theme.primary_color || "#7c3aed" }}
      >
        {avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatar_url}
            alt={display_name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center text-3xl font-bold text-white"
            style={{ backgroundColor: theme.primary_color || "#7c3aed" }}
          >
            {display_name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Name */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-white">{display_name}</h1>
        {tagline && (
          <p className="text-lg text-white/70 max-w-md mx-auto">{tagline}</p>
        )}
      </div>

      {/* Brand pillars */}
      {brand_pillars.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 max-w-lg">
          {brand_pillars.map((pillar) => (
            <span
              key={pillar}
              className="rounded-full px-3 py-1 text-sm font-medium text-white/90"
              style={{ backgroundColor: `${theme.primary_color || "#7c3aed"}33` }}
            >
              {pillar}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
