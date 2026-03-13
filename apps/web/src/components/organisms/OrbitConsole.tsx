"use client";

import { useState } from "react";
import { useOrbitStore } from "@/stores/orbit.store";
import type { OrbitSection } from "@/stores/orbit.store";
import { orbitApi } from "@/lib/orbit-api";
import Button from "@/components/atoms/Button";

export default function OrbitConsole() {
  const { profile, setProfile, updateSection, reorderSections } = useOrbitStore();
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  if (!profile) return null;

  const sortedSections = [...profile.sections].sort(
    (a, b) => a.order_index - b.order_index,
  );

  const handlePublishToggle = async () => {
    setIsPublishing(true);
    setPublishError(null);
    try {
      const updated = await orbitApi.updateOrbit({
        is_published: !profile.is_published,
      });
      setProfile(updated);
    } catch {
      setPublishError("Failed to update publish status. Please try again.");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleToggleVisibility = async (section: OrbitSection) => {
    try {
      const updated = await orbitApi.updateSection(section.id, {
        is_visible: !section.is_visible,
      });
      updateSection(updated);
    } catch {
      // Silently ignore — could add toast here
    }
  };

  const handleMoveUp = async (section: OrbitSection, index: number) => {
    if (index === 0) return;
    const newSections = [...sortedSections];
    const prev = newSections[index - 1];
    const curr = newSections[index];

    // Swap order_index values
    const updatedOrder = newSections.map((s) => {
      if (s.id === curr.id) return { id: s.id, order_index: prev.order_index };
      if (s.id === prev.id) return { id: s.id, order_index: curr.order_index };
      return { id: s.id, order_index: s.order_index };
    });

    try {
      const updated = await orbitApi.reorderSections({ order: updatedOrder });
      reorderSections(updated);
    } catch {
      // Silently ignore
    }
  };

  const handleMoveDown = async (section: OrbitSection, index: number) => {
    if (index === sortedSections.length - 1) return;
    const newSections = [...sortedSections];
    const next = newSections[index + 1];
    const curr = newSections[index];

    const updatedOrder = newSections.map((s) => {
      if (s.id === curr.id) return { id: s.id, order_index: next.order_index };
      if (s.id === next.id) return { id: s.id, order_index: curr.order_index };
      return { id: s.id, order_index: s.order_index };
    });

    try {
      const updated = await orbitApi.reorderSections({ order: updatedOrder });
      reorderSections(updated);
    } catch {
      // Silently ignore
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    try {
      await orbitApi.deleteSection(sectionId);
      const updated = await orbitApi.getMyOrbit();
      setProfile(updated);
    } catch {
      // Silently ignore
    }
  };

  const sectionTypeBadgeColor: Record<string, string> = {
    hero: "bg-purple-500/20 text-purple-300",
    links: "bg-blue-500/20 text-blue-300",
    persona_quiz: "bg-green-500/20 text-green-300",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Orbit Console</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            <span className="font-mono text-text-muted">/{profile.slug}</span>
            {" — "}
            <a
              href={`/orbit/${profile.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-primary hover:underline"
            >
              View page
            </a>
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Published status badge */}
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              profile.is_published
                ? "bg-green-500/20 text-green-300"
                : "bg-gray-500/20 text-gray-400"
            }`}
          >
            {profile.is_published ? "Published" : "Draft"}
          </span>

          {/* Publish/Unpublish button */}
          <Button
            variant={profile.is_published ? "secondary" : "primary"}
            size="sm"
            onClick={handlePublishToggle}
            disabled={isPublishing}
          >
            {isPublishing
              ? "Saving..."
              : profile.is_published
                ? "Unpublish"
                : "Publish"}
          </Button>
        </div>
      </div>

      {publishError && (
        <p className="text-sm text-red-400">{publishError}</p>
      )}

      {/* Stats row */}
      <div className="flex gap-4">
        <div className="rounded-lg border border-surface-border bg-surface-raised px-4 py-3">
          <p className="text-xs text-text-muted">Page views</p>
          <p className="text-lg font-semibold text-text-primary">{profile.page_views.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border border-surface-border bg-surface-raised px-4 py-3">
          <p className="text-xs text-text-muted">Sections</p>
          <p className="text-lg font-semibold text-text-primary">{profile.sections.length}</p>
        </div>
        <div className="rounded-lg border border-surface-border bg-surface-raised px-4 py-3">
          <p className="text-xs text-text-muted">Links</p>
          <p className="text-lg font-semibold text-text-primary">{profile.links.length}</p>
        </div>
      </div>

      {/* Section list */}
      <div>
        <h2 className="text-sm font-semibold text-text-secondary mb-3 uppercase tracking-wide">
          Sections
        </h2>

        {sortedSections.length === 0 ? (
          <div className="rounded-lg border border-surface-border border-dashed p-8 text-center">
            <p className="text-text-muted text-sm">No sections yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedSections.map((section, index) => (
              <div
                key={section.id}
                className="flex items-center gap-3 rounded-lg border border-surface-border bg-surface-raised px-4 py-3"
              >
                {/* Move buttons */}
                <div className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    onClick={() => handleMoveUp(section, index)}
                    disabled={index === 0}
                    className="rounded p-0.5 text-text-muted hover:text-text-primary disabled:opacity-25 transition-colors"
                    aria-label="Move up"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveDown(section, index)}
                    disabled={index === sortedSections.length - 1}
                    className="rounded p-0.5 text-text-muted hover:text-text-primary disabled:opacity-25 transition-colors"
                    aria-label="Move down"
                  >
                    ▼
                  </button>
                </div>

                {/* Section info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-text-primary truncate">
                      {section.title}
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                        sectionTypeBadgeColor[section.section_type] ??
                        "bg-gray-500/20 text-gray-300"
                      }`}
                    >
                      {section.section_type}
                    </span>
                  </div>
                </div>

                {/* Visibility indicator */}
                <button
                  type="button"
                  onClick={() => handleToggleVisibility(section)}
                  className={`text-xs font-medium transition-colors ${
                    section.is_visible
                      ? "text-text-secondary hover:text-text-primary"
                      : "text-text-muted hover:text-text-secondary"
                  }`}
                  title={section.is_visible ? "Visible — click to hide" : "Hidden — click to show"}
                >
                  {section.is_visible ? "Visible" : "Hidden"}
                </button>

                {/* Delete */}
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDeleteSection(section.id)}
                >
                  Delete
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
