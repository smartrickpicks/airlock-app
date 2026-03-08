export interface CrmInboxThread {
  id: string;
  accountName: string;
  contactName: string;
  channel: "text" | "email" | "web_form" | "call";
  unreadCount: number;
  timestamp: string;
  preview: string;
  intent: string;
  confidence: number;
  recommendedAction: string;
}

export interface CrmContactNode {
  id: string;
  accountName: string;
  name: string;
  role: string;
  interactions: number;
  lastInteraction: string;
  source: "manual" | "inbound" | "entity_resolution";
  managerName?: string | null;
}

export interface CrmActivityEvent {
  id: string;
  type: "text" | "email" | "call" | "deal" | "task" | "lead" | "alert";
  title: string;
  detail: string;
  timestamp: string;
  accountName: string;
  actionLabel?: string;
}

export interface CrmHealthCard {
  id: string;
  accountName: string;
  healthScore: number;
  trend: number;
  status: "ok" | "watch" | "at_risk";
  deals: number;
  lastContact: string;
  riskFactors: string[];
  recommendedActions: string[];
}

export interface CrmRenewal {
  id: string;
  dueDate: string;
  accountName: string;
  contractName: string;
  value: number;
  status: "urgent" | "upcoming" | "healthy";
}

export interface CrmOnboardingCard {
  id: string;
  accountName: string;
  startedAt: string;
  progressPercent: number;
  steps: Array<{
    id: string;
    label: string;
    done: boolean;
    owner: string;
    dueLabel: string;
    detail?: string;
  }>;
}

export const MOCK_CRM_INBOX_THREADS: CrmInboxThread[] = [
  {
    id: "crm_inbox_001",
    accountName: "Northstar Studios",
    contactName: "Leah Morgan",
    channel: "text",
    unreadCount: 2,
    timestamp: "10:42 AM",
    preview:
      "Can we get the services agreement ready today if finance signs off?",
    intent: "deal_discussion",
    confidence: 92,
    recommendedAction:
      "Open account workspace and prepare signature-ready draft.",
  },
  {
    id: "crm_inbox_002",
    accountName: "Beacon Artists",
    contactName: "Andre Cole",
    channel: "email",
    unreadCount: 1,
    timestamp: "9:15 AM",
    preview: "Attached updated onboarding requirements and timeline.",
    intent: "onboarding_follow_up",
    confidence: 88,
    recommendedAction: "Attach artifact and create follow-up task bundle.",
  },
  {
    id: "crm_inbox_003",
    accountName: "Atlas Creative Group",
    contactName: "Web Intake",
    channel: "web_form",
    unreadCount: 1,
    timestamp: "Yesterday",
    preview:
      "Need help reviewing a new distribution agreement before month end.",
    intent: "new_lead",
    confidence: 95,
    recommendedAction: "Create discovery lead and route to qualification.",
  },
];

export const MOCK_CRM_CONTACTS: CrmContactNode[] = [
  {
    id: "crm_contact_001",
    accountName: "Northstar Studios",
    name: "Leah Morgan",
    role: "VP Partnerships",
    interactions: 12,
    lastInteraction: "10m ago",
    source: "inbound",
  },
  {
    id: "crm_contact_002",
    accountName: "Northstar Studios",
    name: "Melissa Grant",
    role: "Legal Counsel",
    interactions: 5,
    lastInteraction: "3d ago",
    source: "entity_resolution",
    managerName: "Leah Morgan",
  },
  {
    id: "crm_contact_003",
    accountName: "Northstar Studios",
    name: "Andre Cole",
    role: "Finance Director",
    interactions: 3,
    lastInteraction: "1d ago",
    source: "manual",
    managerName: "Leah Morgan",
  },
  {
    id: "crm_contact_004",
    accountName: "Beacon Artists",
    name: "Sarah Kim",
    role: "Operations Lead",
    interactions: 8,
    lastInteraction: "2h ago",
    source: "manual",
  },
  {
    id: "crm_contact_005",
    accountName: "Beacon Artists",
    name: "Tom Barker",
    role: "CFO",
    interactions: 2,
    lastInteraction: "2d ago",
    source: "inbound",
    managerName: "Sarah Kim",
  },
];

export const MOCK_CRM_ACTIVITY: CrmActivityEvent[] = [
  {
    id: "crm_activity_001",
    type: "text",
    title: "Leah Morgan texted about contract timing",
    detail: "Intent classified as deal discussion with 92% confidence.",
    timestamp: "Today · 10:42 AM",
    accountName: "Northstar Studios",
    actionLabel: "Open Thread",
  },
  {
    id: "crm_activity_002",
    type: "deal",
    title: "Northstar moved to Build",
    detail: "Contract prep recommendation created and review task opened.",
    timestamp: "Today · 9:10 AM",
    accountName: "Northstar Studios",
    actionLabel: "View Deal",
  },
  {
    id: "crm_activity_003",
    type: "task",
    title: "Beacon follow-up packet resolved",
    detail: "Review bundle completed by Ana Chen.",
    timestamp: "Yesterday · 4:18 PM",
    accountName: "Beacon Artists",
  },
  {
    id: "crm_activity_004",
    type: "lead",
    title: "Atlas Creative lead created from web intake",
    detail: "Entity resolution confidence 74%. Needs qualification review.",
    timestamp: "Yesterday · 11:00 AM",
    accountName: "Atlas Creative Group",
    actionLabel: "Qualify",
  },
];

export const MOCK_CRM_HEALTH: CrmHealthCard[] = [
  {
    id: "crm_health_001",
    accountName: "Northstar Studios",
    healthScore: 82,
    trend: 3,
    status: "ok",
    deals: 2,
    lastContact: "10m ago",
    riskFactors: ["Finance approver still inferred"],
    recommendedActions: [
      "Confirm payment language",
      "Prepare signature packet",
    ],
  },
  {
    id: "crm_health_002",
    accountName: "Summit Media",
    healthScore: 54,
    trend: -12,
    status: "at_risk",
    deals: 1,
    lastContact: "14d ago",
    riskFactors: ["No contact in 14 days", "Deal stalled at proposal"],
    recommendedActions: ["Send check-in text", "Escalate to account owner"],
  },
  {
    id: "crm_health_003",
    accountName: "Beacon Artists",
    healthScore: 76,
    trend: -2,
    status: "watch",
    deals: 1,
    lastContact: "2h ago",
    riskFactors: ["Timeline still unconfirmed"],
    recommendedActions: ["Schedule kickoff call"],
  },
];

export const MOCK_CRM_RENEWALS: CrmRenewal[] = [
  {
    id: "crm_renewal_001",
    dueDate: "Mar 15",
    accountName: "Henderson Co",
    contractName: "henderson-msa",
    value: 120000,
    status: "upcoming",
  },
  {
    id: "crm_renewal_002",
    dueDate: "Apr 1",
    accountName: "Summit Media",
    contractName: "summit-msa",
    value: 240000,
    status: "upcoming",
  },
  {
    id: "crm_renewal_003",
    dueDate: "Apr 15",
    accountName: "Warner Bros",
    contractName: "warner-amend",
    value: 95000,
    status: "healthy",
  },
  {
    id: "crm_renewal_004",
    dueDate: "Jun 1",
    accountName: "Ostereo Music",
    contractName: "ostereo-msa",
    value: 180000,
    status: "healthy",
  },
];

export const MOCK_CRM_ONBOARDING: CrmOnboardingCard[] = [
  {
    id: "crm_onboarding_001",
    accountName: "Acme Inc",
    startedAt: "Mar 2",
    progressPercent: 60,
    steps: [
      {
        id: "o1",
        label: "Create account in system",
        done: true,
        owner: "Ana C.",
        dueLabel: "Mar 2",
      },
      {
        id: "o2",
        label: "Provision Smart Line number",
        done: true,
        owner: "System",
        dueLabel: "Mar 2",
        detail: "+1-555-0142 active",
      },
      {
        id: "o3",
        label: "Send welcome packet",
        done: true,
        owner: "Sarah M.",
        dueLabel: "Mar 3",
      },
      {
        id: "o4",
        label: "Assign team members",
        done: false,
        owner: "--",
        dueLabel: "Mar 5",
      },
      {
        id: "o5",
        label: "Schedule kickoff call",
        done: false,
        owner: "--",
        dueLabel: "Mar 7",
      },
    ],
  },
];

export const MOCK_CRM_QUALIFY_COLUMNS = {
  captured: [
    "Atlas Creative Group — inbound web form",
    "Bluebird Rights — contract upload",
  ],
  reviewing: [
    "Beacon Artists — dedicated text intake",
    "Northstar Studios — discovery transcript",
  ],
  ready: ["Henderson Co — qualified for build"],
} as const;

export const MOCK_CRM_DEAL_REVIEW = [
  {
    id: "crm_deal_review_001",
    deal: "Northstar Services Agreement",
    account: "Northstar Studios",
    stage: "Proposal",
    blocker: "Payment language pending finance sign-off",
    owner: "Ana Chen",
  },
  {
    id: "crm_deal_review_002",
    deal: "Beacon Artist Onboarding",
    account: "Beacon Artists",
    stage: "Discovery",
    blocker: "Need legal stakeholder confirmed",
    owner: "Sarah Miller",
  },
];
