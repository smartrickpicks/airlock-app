import { redirect } from "next/navigation";

/**
 * Contracts Module Index
 *
 * Redirects to the Triage Dashboard — the default landing view
 * for the Contracts module. This prevents a 404 when navigating
 * to /contracts directly (e.g., from the ModuleBar).
 */
export default function ContractsPage() {
  redirect("/contracts/triage");
}
