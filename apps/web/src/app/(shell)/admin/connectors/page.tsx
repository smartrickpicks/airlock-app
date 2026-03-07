"use client";

import ConnectorsView from "@/components/organisms/ConnectorsView";

export default function AdminConnectorsPage() {
  return (
    <div className="h-full overflow-y-auto flex flex-col gap-6 p-6">
      <ConnectorsView />
    </div>
  );
}
