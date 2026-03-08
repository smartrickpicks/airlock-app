"use client";

import dynamic from "next/dynamic";

const CapabilityTree = dynamic(
  () => import("@/components/organisms/CapabilityTree"),
  { ssr: false },
);

export default function AdminCapabilityTreePage() {
  return (
    <div className="h-full w-full">
      <CapabilityTree />
    </div>
  );
}
