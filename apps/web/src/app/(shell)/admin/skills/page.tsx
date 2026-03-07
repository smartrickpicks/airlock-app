"use client";

import SkillsList from "@/components/organisms/SkillsList";

export default function AdminSkillsPage() {
  return (
    <div className="h-full overflow-y-auto flex flex-col gap-6 p-6">
      <SkillsList />
    </div>
  );
}
