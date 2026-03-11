import type { ReactNode } from "react";
import AdminOnboardingChecklist from "@/components/molecules/AdminOnboardingChecklist";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full w-full overflow-hidden">
      <div className="flex-1 overflow-hidden">{children}</div>
      <div className="hidden w-[260px] shrink-0 overflow-y-auto border-l border-surface-border bg-surface-base p-4 xl:block">
        <AdminOnboardingChecklist />
      </div>
    </div>
  );
}
