/**
 * Mock patch data for dev preview.
 * Models the patch workflow state machine: draft → applied/rejected.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PatchState =
  | "draft"
  | "submitted"
  | "needs_clarification"
  | "verifier_responded"
  | "verifier_approved"
  | "admin_hold"
  | "admin_approved"
  | "applied"
  | "rejected"
  | "cancelled"
  | "sent_to_otto"
  | "otto_returned";

export type ApprovalStepStatus =
  | "completed"
  | "active"
  | "pending"
  | "rejected"
  | "returned";

export interface PatchTransition {
  from: PatchState;
  to: PatchState;
  actor_id: string;
  actor_name: string;
  timestamp: string;
  note?: string;
}

export interface ApprovalStep {
  id: string;
  label: string;
  status: ApprovalStepStatus;
  actor_name: string | null;
  role: "author" | "verifier" | "admin" | "system";
  timestamp: string | null;
  sla_deadline: string | null;
  note?: string;
}

export interface Patch {
  id: string;
  vault_id: string;
  author_id: string;
  author_name: string;
  state: PatchState;
  version: number;
  field_name: string;
  current_value: string;
  proposed_value: string;
  intent: string;
  because_clause: string;
  history: PatchTransition[];
  approval_steps: ApprovalStep[];
  sla_deadline: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Constants — state machine
// ---------------------------------------------------------------------------

export const VALID_TRANSITIONS: {
  from: PatchState;
  to: PatchState;
  role: string;
}[] = [
  // Author actions
  { from: "draft", to: "submitted", role: "author" },
  { from: "draft", to: "cancelled", role: "author" },
  { from: "needs_clarification", to: "verifier_responded", role: "author" },
  { from: "needs_clarification", to: "cancelled", role: "author" },
  { from: "otto_returned", to: "submitted", role: "author" },
  { from: "otto_returned", to: "cancelled", role: "author" },

  // Verifier actions
  { from: "submitted", to: "verifier_approved", role: "verifier" },
  { from: "submitted", to: "needs_clarification", role: "verifier" },
  { from: "submitted", to: "rejected", role: "verifier" },
  { from: "verifier_responded", to: "verifier_approved", role: "verifier" },
  { from: "verifier_responded", to: "needs_clarification", role: "verifier" },
  { from: "verifier_responded", to: "rejected", role: "verifier" },

  // Admin actions
  { from: "verifier_approved", to: "admin_approved", role: "admin" },
  { from: "verifier_approved", to: "admin_hold", role: "admin" },
  { from: "verifier_approved", to: "rejected", role: "admin" },
  { from: "admin_hold", to: "admin_approved", role: "admin" },
  { from: "admin_hold", to: "rejected", role: "admin" },

  // System actions
  { from: "admin_approved", to: "applied", role: "system" },
  { from: "admin_approved", to: "sent_to_otto", role: "system" },
  { from: "sent_to_otto", to: "otto_returned", role: "system" },
];

export const STATE_LABELS: Record<PatchState, string> = {
  draft: "Draft",
  submitted: "Submitted",
  needs_clarification: "Needs Clarification",
  verifier_responded: "Verifier Responded",
  verifier_approved: "Verifier Approved",
  admin_hold: "Admin Hold",
  admin_approved: "Admin Approved",
  applied: "Applied",
  rejected: "Rejected",
  cancelled: "Cancelled",
  sent_to_otto: "Sent to Otto",
  otto_returned: "Otto Returned",
};

export function stateCategory(
  state: PatchState,
): "active" | "success" | "danger" | "neutral" | "warning" {
  switch (state) {
    case "draft":
    case "cancelled":
      return "neutral";
    case "submitted":
    case "verifier_responded":
    case "needs_clarification":
    case "admin_hold":
    case "sent_to_otto":
    case "otto_returned":
      return "active";
    case "verifier_approved":
    case "admin_approved":
      return "warning";
    case "applied":
      return "success";
    case "rejected":
      return "danger";
  }
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

export const MOCK_PATCHES: Record<string, Patch[]> = {
  vault_004: [
    // patch_001 — verifier_approved, waiting on admin
    {
      id: "patch_001",
      vault_id: "vault_004",
      author_id: "user_001",
      author_name: "Jane Builder",
      state: "verifier_approved",
      version: 1,
      field_name: "Territory",
      current_value: "Worldwide",
      proposed_value: "North America + European Union",
      intent: "Narrow territory to align with revised distribution capacity",
      because_clause:
        "Because Sony's APAC distribution arm was carved out in Amendment 3, worldwide rights no longer reflect operational scope.",
      history: [
        {
          from: "draft",
          to: "submitted",
          actor_id: "user_001",
          actor_name: "Jane Builder",
          timestamp: "2026-02-20T10:15:00Z",
          note: "Submitting territory narrowing per Amendment 3 carve-out.",
        },
        {
          from: "submitted",
          to: "verifier_approved",
          actor_id: "user_002",
          actor_name: "Tom Gatekeeper",
          timestamp: "2026-02-21T14:30:00Z",
          note: "Confirmed against Amendment 3, Section 4.2. Approved.",
        },
      ],
      approval_steps: [
        {
          id: "step_001a",
          label: "Author Submission",
          status: "completed",
          actor_name: "Jane Builder",
          role: "author",
          timestamp: "2026-02-20T10:15:00Z",
          sla_deadline: null,
        },
        {
          id: "step_001b",
          label: "Verifier Review",
          status: "completed",
          actor_name: "Tom Gatekeeper",
          role: "verifier",
          timestamp: "2026-02-21T14:30:00Z",
          sla_deadline: "2026-02-23T10:15:00Z",
          note: "Confirmed against Amendment 3, Section 4.2.",
        },
        {
          id: "step_001c",
          label: "Admin Approval",
          status: "active",
          actor_name: "Mike Director",
          role: "admin",
          timestamp: null,
          sla_deadline: "2026-03-07T14:30:00Z",
        },
        {
          id: "step_001d",
          label: "System Apply",
          status: "pending",
          actor_name: null,
          role: "system",
          timestamp: null,
          sla_deadline: null,
        },
      ],
      sla_deadline: "2026-03-07T14:30:00Z",
      created_at: "2026-02-20T09:45:00Z",
      updated_at: "2026-02-21T14:30:00Z",
    },

    // patch_002 — needs_clarification, returned by verifier
    {
      id: "patch_002",
      vault_id: "vault_004",
      author_id: "user_001",
      author_name: "Jane Builder",
      state: "needs_clarification",
      version: 1,
      field_name: "Distribution Fee",
      current_value: "15%",
      proposed_value: "12%",
      intent: "Reduce distribution fee to reflect renegotiated terms",
      because_clause:
        "Because Amendment 2 introduced a reduced fee schedule for digital-only distribution, the base rate should be updated to 12%.",
      history: [
        {
          from: "draft",
          to: "submitted",
          actor_id: "user_001",
          actor_name: "Jane Builder",
          timestamp: "2026-02-22T11:00:00Z",
          note: "Fee reduction per Amendment 2 renegotiation.",
        },
        {
          from: "submitted",
          to: "needs_clarification",
          actor_id: "user_002",
          actor_name: "Tom Gatekeeper",
          timestamp: "2026-02-23T09:20:00Z",
          note: "Amendment 2 references 12% for digital-only. Does this apply to physical+digital bundle? Please attach the relevant exhibit.",
        },
      ],
      approval_steps: [
        {
          id: "step_002a",
          label: "Author Submission",
          status: "completed",
          actor_name: "Jane Builder",
          role: "author",
          timestamp: "2026-02-22T11:00:00Z",
          sla_deadline: null,
        },
        {
          id: "step_002b",
          label: "Verifier Review",
          status: "returned",
          actor_name: "Tom Gatekeeper",
          role: "verifier",
          timestamp: "2026-02-23T09:20:00Z",
          sla_deadline: "2026-02-25T11:00:00Z",
          note: "Returned — need clarification on physical+digital bundle applicability.",
        },
        {
          id: "step_002c",
          label: "Admin Approval",
          status: "pending",
          actor_name: null,
          role: "admin",
          timestamp: null,
          sla_deadline: null,
        },
        {
          id: "step_002d",
          label: "System Apply",
          status: "pending",
          actor_name: null,
          role: "system",
          timestamp: null,
          sla_deadline: null,
        },
      ],
      sla_deadline: null,
      created_at: "2026-02-22T10:30:00Z",
      updated_at: "2026-02-23T09:20:00Z",
    },

    // patch_003 — applied, fully completed
    {
      id: "patch_003",
      vault_id: "vault_004",
      author_id: "user_001",
      author_name: "Jane Builder",
      state: "applied",
      version: 1,
      field_name: "Payment Terms",
      current_value: "Net 60",
      proposed_value: "Net 45",
      intent: "Shorten payment window to improve cash flow alignment",
      because_clause:
        "Because the licensee's accounting period was shortened to quarterly in the latest addendum, Net 45 better aligns with reporting cycles.",
      history: [
        {
          from: "draft",
          to: "submitted",
          actor_id: "user_001",
          actor_name: "Jane Builder",
          timestamp: "2026-02-10T08:00:00Z",
        },
        {
          from: "submitted",
          to: "verifier_approved",
          actor_id: "user_002",
          actor_name: "Tom Gatekeeper",
          timestamp: "2026-02-11T16:45:00Z",
          note: "Verified against latest addendum, Section 7.1.",
        },
        {
          from: "verifier_approved",
          to: "admin_approved",
          actor_id: "user_004",
          actor_name: "Mike Director",
          timestamp: "2026-02-12T10:00:00Z",
          note: "Approved. Aligns with updated accounting schedule.",
        },
        {
          from: "admin_approved",
          to: "applied",
          actor_id: "system",
          actor_name: "System",
          timestamp: "2026-02-12T10:01:00Z",
        },
      ],
      approval_steps: [
        {
          id: "step_003a",
          label: "Author Submission",
          status: "completed",
          actor_name: "Jane Builder",
          role: "author",
          timestamp: "2026-02-10T08:00:00Z",
          sla_deadline: null,
        },
        {
          id: "step_003b",
          label: "Verifier Review",
          status: "completed",
          actor_name: "Tom Gatekeeper",
          role: "verifier",
          timestamp: "2026-02-11T16:45:00Z",
          sla_deadline: "2026-02-13T08:00:00Z",
        },
        {
          id: "step_003c",
          label: "Admin Approval",
          status: "completed",
          actor_name: "Mike Director",
          role: "admin",
          timestamp: "2026-02-12T10:00:00Z",
          sla_deadline: "2026-02-14T16:45:00Z",
        },
        {
          id: "step_003d",
          label: "System Apply",
          status: "completed",
          actor_name: null,
          role: "system",
          timestamp: "2026-02-12T10:01:00Z",
          sla_deadline: null,
        },
      ],
      sla_deadline: null,
      created_at: "2026-02-10T07:30:00Z",
      updated_at: "2026-02-12T10:01:00Z",
    },

    // patch_004 — draft, not yet submitted
    {
      id: "patch_004",
      vault_id: "vault_004",
      author_id: "user_001",
      author_name: "Jane Builder",
      state: "draft",
      version: 1,
      field_name: "Minimum Guarantee",
      current_value: "$500,000",
      proposed_value: "$450,000",
      intent: "Reduce minimum guarantee to reflect narrowed territory scope",
      because_clause:
        "Because the territory was narrowed from Worldwide to NA+EU, the original $500K guarantee is disproportionate to the reduced market coverage.",
      history: [],
      approval_steps: [
        {
          id: "step_004a",
          label: "Author Submission",
          status: "pending",
          actor_name: "Jane Builder",
          role: "author",
          timestamp: null,
          sla_deadline: null,
        },
        {
          id: "step_004b",
          label: "Verifier Review",
          status: "pending",
          actor_name: null,
          role: "verifier",
          timestamp: null,
          sla_deadline: null,
        },
        {
          id: "step_004c",
          label: "Admin Approval",
          status: "pending",
          actor_name: null,
          role: "admin",
          timestamp: null,
          sla_deadline: null,
        },
        {
          id: "step_004d",
          label: "System Apply",
          status: "pending",
          actor_name: null,
          role: "system",
          timestamp: null,
          sla_deadline: null,
        },
      ],
      sla_deadline: null,
      created_at: "2026-03-01T14:00:00Z",
      updated_at: "2026-03-01T14:00:00Z",
    },
  ],

  vault_006: [],
};
