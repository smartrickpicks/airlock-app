"use client";

/**
 * CRM catch-all route — react-admin integration.
 * SSR is disabled for this route (react-admin is client-side only).
 * The CrmApp component is loaded via dynamic import in src/features/crm/.
 */
export default function CrmPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-1">CRM</h1>
      <p className="text-text-secondary">
        Vault hierarchy as CRM — react-admin integration
      </p>
      {/* TODO: dynamic import CrmApp from @/features/crm/CrmApp */}
    </div>
  );
}
