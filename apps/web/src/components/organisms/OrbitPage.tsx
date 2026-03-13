"use client";

import type { OrbitProfile, OrbitSection } from "@/stores/orbit.store";
import OrbitHero from "@/components/molecules/OrbitHero";
import OrbitLinks from "@/components/molecules/OrbitLinks";
import OrbitQuiz from "@/components/molecules/OrbitQuiz";

interface OrbitPageProps {
  profile: OrbitProfile;
}

function renderSection(section: OrbitSection, profile: OrbitProfile) {
  if (!section.is_visible) return null;

  switch (section.section_type) {
    case "hero":
      return <OrbitHero key={section.id} profile={profile} />;

    case "links":
      return (
        <OrbitLinks
          key={section.id}
          links={profile.links}
          slug={profile.slug}
          theme={profile.theme}
        />
      );

    case "persona_quiz":
      return (
        <OrbitQuiz
          key={section.id}
          slug={profile.slug}
          theme={profile.theme}
        />
      );

    default:
      return null;
  }
}

export default function OrbitPage({ profile }: OrbitPageProps) {
  const sortedSections = [...profile.sections].sort(
    (a, b) => a.order_index - b.order_index,
  );

  return (
    <div
      className="min-h-screen w-full"
      style={{ backgroundColor: "#0a0a0f" }}
    >
      <div className="max-w-lg mx-auto pb-16 space-y-8">
        {sortedSections.map((section) => renderSection(section, profile))}
      </div>

      {/* Footer */}
      <div className="text-center pb-8">
        <p className="text-white/20 text-xs">Powered by Airlock</p>
      </div>
    </div>
  );
}
