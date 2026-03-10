"use client";

import { useParams, useRouter } from "next/navigation";
import { getDossier } from "@/lib/mock-dossier";
import MemberDossierComponent from "@/components/organisms/MemberDossier";

export default function MemberDossierPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;

  const dossier = getDossier(userId);

  if (!dossier) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="text-center">
          <p className="text-sm text-text-muted">Member not found</p>
          <button
            onClick={() => router.push("/admin/members")}
            className="mt-2 text-xs text-accent-primary hover:underline"
          >
            Back to members
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <button
        onClick={() => router.push("/admin/members")}
        className="mb-4 flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary"
      >
        &#x2190; Back to members
      </button>
      <MemberDossierComponent dossier={dossier} />
    </div>
  );
}
