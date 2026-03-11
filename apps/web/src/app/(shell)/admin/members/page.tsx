"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAdminStore } from "@/stores/admin.store";
import MembersTable from "@/components/organisms/MembersTable";
import InviteModal from "@/components/molecules/InviteModal";
import PendingInvitesList from "@/components/molecules/PendingInvitesList";
import { fadeInUp } from "@/lib/animations";

export default function AdminMembersPage() {
  const { fetchAdmin } = useAdminStore();
  const [showInvite, setShowInvite] = useState(false);
  const [inviteRefreshKey, setInviteRefreshKey] = useState(0);

  useEffect(() => {
    fetchAdmin();
  }, [fetchAdmin]);

  const handleInviteSent = () => {
    setInviteRefreshKey((k) => k + 1);
  };

  return (
    <motion.div className="h-full overflow-y-auto p-6" {...fadeInUp}>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Members</h1>
          <p className="mt-0.5 text-sm text-text-secondary">
            Manage workspace members, roles, and invitations
          </p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-1.5 rounded-md bg-accent-primary px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
        >
          <span className="text-base leading-none">+</span>
          Invite Member
        </button>
      </div>

      {/* Members table */}
      <MembersTable />

      {/* Pending invites section */}
      <div className="mt-8">
        <h2 className="mb-3 text-base font-semibold text-text-primary">
          Pending Invites
        </h2>
        <PendingInvitesList refreshKey={inviteRefreshKey} />
      </div>

      {/* Invite modal */}
      <InviteModal
        isOpen={showInvite}
        onClose={() => setShowInvite(false)}
        onInviteSent={handleInviteSent}
      />
    </motion.div>
  );
}
