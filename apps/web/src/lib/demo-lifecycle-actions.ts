import {
  MOCK_CRM_ACCOUNTS,
  type AccountArtifact,
  type AccountMemoryEntry,
  type AccountMemoryWorkspaceData,
  type CrmAccount,
  type CrmContact,
  type LeadSource,
  type StakeholderRole,
} from "@/lib/mock-crm";
import { MOCK_DOCUMENTS, type Document } from "@/lib/mock-documents";
import { MOCK_TASKS, type Task } from "@/lib/mock-tasks";
import { MOCK_CALENDAR_EVENTS, type CalendarEvent } from "@/lib/mock-calendar";
import {
  MOCK_FEED_ITEMS,
  MOCK_PARENT_VAULTS,
  type FeedItem,
  type ParentVaultCard,
} from "@/lib/mock-review-queue";
import { MOCK_VAULTS } from "@/lib/mock-vaults";
import { useCrmStore } from "@/stores/crm.store";
import {
  useDemoLifecycleStore,
  type DemoGeneratedContract,
  type DemoSignatureState,
  mergeDemoAccounts,
  mergeDemoDocuments,
  mergeDemoEvents,
  mergeDemoReviewFeedItems,
  mergeDemoReviewParentVaults,
  mergeDemoTasks,
  mergeDemoVaults,
} from "@/stores/demo-lifecycle.store";
import { useDocumentsStore } from "@/stores/documents.store";
import { useTasksStore } from "@/stores/tasks.store";
import { useCalendarStore } from "@/stores/calendar.store";
import { useReviewQueueStore } from "@/stores/review-queue.store";
import { useVaultStore, type Vault } from "@/stores/vault.store";

const DEMO_USER_ID = "user_demo";
const DEMO_USER_NAME = "Demo Operator";

function nowIso(): string {
  return new Date().toISOString();
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function titleizeSource(source: LeadSource): string {
  return source.replace(/_/g, " ");
}

function buildWorkspace(
  accountName: string,
  ownerName: string,
): AccountMemoryWorkspaceData {
  return {
    label: "Account Memory",
    conceptBadge: "Vortex (concept)",
    primaryOwnerName: ownerName,
    pendingApprovals: 0,
    openActionItems: 0,
    nextRecommendedAction: "Review intake and assign the next workflow step.",
    stakeholderGap: "Finance reviewer not yet confirmed.",
    thread: [
      {
        id: `mem_boot_${Date.now()}`,
        channelType: "system",
        direction: "system",
        visibility: "system",
        title: "Account memory started",
        body: `${accountName} now has an account-scoped communication and memory workspace.`,
        actorName: "System",
        createdAt: nowIso(),
        workflowName: "Account Memory",
      },
    ],
    stakeholders: [],
    stakeholderGroups: [],
    artifacts: [],
    aiAssist: [
      {
        id: `ai_boot_${Date.now()}`,
        title: "Routing initialized",
        detail:
          "AI assist can now suggest ownership, missing stakeholders, and follow-up actions.",
        confidence: "demo",
      },
    ],
  };
}

function baseAccounts(): CrmAccount[] {
  const current = useCrmStore.getState().accounts;
  return current.length ? current : MOCK_CRM_ACCOUNTS;
}

function findAccount(accountId: string): CrmAccount | null {
  return (
    mergeDemoAccounts(baseAccounts()).find(
      (account) => account.id === accountId,
    ) ?? null
  );
}

function refreshCrmAccounts(): void {
  useCrmStore.setState((state) => ({
    accounts: mergeDemoAccounts(
      state.accounts.length ? state.accounts : MOCK_CRM_ACCOUNTS,
    ),
  }));
}

function refreshDocuments(): void {
  useDocumentsStore.setState((state) => {
    const base = state.documents.length ? state.documents : MOCK_DOCUMENTS;
    const merged = mergeDemoDocuments(base);
    return {
      documents: merged,
      selectedDocId: state.selectedDocId ?? merged[0]?.id ?? null,
    };
  });
}

function refreshTasks(): void {
  useTasksStore.setState((state) => ({
    tasks: mergeDemoTasks(state.tasks.length ? state.tasks : MOCK_TASKS),
  }));
}

function refreshEvents(): void {
  useCalendarStore.setState((state) => ({
    events: mergeDemoEvents(
      state.events.length ? state.events : MOCK_CALENDAR_EVENTS,
    ),
  }));
}

function refreshReviewQueue(): void {
  useReviewQueueStore.setState((state) => ({
    parentVaults: mergeDemoReviewParentVaults(
      state.parentVaults.length ? state.parentVaults : MOCK_PARENT_VAULTS,
    ),
    feedItems: mergeDemoReviewFeedItems(
      state.feedItems.length ? state.feedItems : MOCK_FEED_ITEMS,
    ),
  }));
}

function refreshVaults(): void {
  useVaultStore.setState((state) => ({
    vaults: mergeDemoVaults(
      state.vaults.length ? state.vaults : (MOCK_VAULTS as Vault[]),
    ),
    selectedVault: state.selectedVault
      ? (mergeDemoVaults([state.selectedVault]).find(
          (vault) => vault.id === state.selectedVault?.id,
        ) ?? state.selectedVault)
      : null,
  }));
}

function appendThread(
  account: CrmAccount,
  entry: Omit<AccountMemoryEntry, "id" | "createdAt">,
): CrmAccount {
  const workspace =
    account.accountMemory ??
    buildWorkspace(account.name, account.primaryOwnerName || DEMO_USER_NAME);
  const nextWorkspace: AccountMemoryWorkspaceData = {
    ...workspace,
    nextRecommendedAction:
      account.nextRecommendedAction || workspace.nextRecommendedAction,
    thread: [
      {
        id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        createdAt: nowIso(),
        ...entry,
      },
      ...workspace.thread,
    ],
  };
  return { ...account, accountMemory: nextWorkspace };
}

function appendArtifact(
  account: CrmAccount,
  artifact: AccountArtifact,
): CrmAccount {
  const workspace =
    account.accountMemory ??
    buildWorkspace(account.name, account.primaryOwnerName || DEMO_USER_NAME);
  const artifacts = [
    artifact,
    ...workspace.artifacts.filter((item) => item.id !== artifact.id),
  ];
  return {
    ...account,
    accountMemory: {
      ...workspace,
      artifacts,
    },
  };
}

function upsertAccount(account: CrmAccount): void {
  useDemoLifecycleStore.getState().upsertAccount(account);
  refreshCrmAccounts();
}

function addDemoDocument(document: Document): void {
  useDemoLifecycleStore.getState().addDocument(document);
  refreshDocuments();
}

function addDemoTask(task: Task): void {
  useDemoLifecycleStore.getState().addTask(task);
  refreshTasks();
}

function addDemoEvent(event: CalendarEvent): void {
  useDemoLifecycleStore.getState().addEvent(event);
  refreshEvents();
}

function addDemoFeedItem(item: FeedItem): void {
  useDemoLifecycleStore.getState().addReviewFeedItem(item);
  refreshReviewQueue();
}

function addDemoReviewParent(card: ParentVaultCard): void {
  useDemoLifecycleStore.getState().addReviewParentVault(card);
  refreshReviewQueue();
}

function addDemoVault(vault: Vault): void {
  useDemoLifecycleStore.getState().addVault(vault);
  refreshVaults();
}

function updateDemoVault(
  vaultId: string,
  updater: (vault: Vault) => Vault,
): void {
  useDemoLifecycleStore.getState().updateVault(vaultId, updater);
  refreshVaults();
}

function signatureLabel(state: DemoSignatureState): string {
  return state.replace(/_/g, " ");
}

function nextContractLifecycleState(
  signatureState: DemoSignatureState,
): DemoGeneratedContract["lifecycleState"] {
  if (signatureState === "signed") return "signed";
  if (
    signatureState === "sent_for_signature" ||
    signatureState === "partially_signed"
  ) {
    return "sent_for_signature";
  }
  if (signatureState === "ready_for_signature") return "ready_for_signature";
  return "internal_review";
}

function updateContractRecord(contract: DemoGeneratedContract): void {
  useDemoLifecycleStore.getState().upsertGeneratedContract(contract);
}

export function createDemoAccount(input: {
  name: string;
  segment: CrmAccount["segment"];
  ownerName: string;
  source: LeadSource;
}): CrmAccount {
  const timestamp = nowIso();
  const account: CrmAccount = {
    id: `acct_demo_${Date.now()}`,
    name: input.name,
    segment: input.segment,
    healthScore: 74,
    healthTrend: 0,
    dealCount: 1,
    totalValue: 125000,
    contacts: [],
    lastContact: timestamp,
    primaryOwnerName: input.ownerName,
    currentChamber: "discover",
    contractReadiness: "capturing",
    nextRecommendedAction:
      "Review intake packet and assign the first discovery follow-up.",
    latestSummary: `${titleizeSource(input.source)} intake captured for ${input.name}.`,
    workflowName: "Discovery Intake",
    pendingGateCount: 1,
    accountMemory: buildWorkspace(input.name, input.ownerName),
  };

  upsertAccount(
    appendThread(account, {
      channelType: "system",
      direction: "system",
      visibility: "system",
      title: "Discovery record created",
      body: `${titleizeSource(input.source)} created a new discovery record and initialized the account workspace.`,
      actorName: "System",
      workflowName: "Discovery Intake",
    }),
  );

  return account;
}

export function createDemoContact(input: {
  accountId: string;
  name: string;
  role: string;
  email: string;
  phone?: string;
  stakeholderRole: StakeholderRole;
}): CrmAccount | null {
  const account = findAccount(input.accountId);
  if (!account) return null;

  const contact: CrmContact = {
    id: `cnt_demo_${Date.now()}`,
    name: input.name,
    role: input.role,
    interactionCount: 0,
    lastInteraction: nowIso(),
    email: input.email,
    phone: input.phone,
  };

  const workspace =
    account.accountMemory ??
    buildWorkspace(account.name, account.primaryOwnerName || DEMO_USER_NAME);
  const nextAccount = appendThread(
    {
      ...account,
      contacts: [contact, ...account.contacts],
      lastContact: nowIso(),
      accountMemory: {
        ...workspace,
        stakeholders: [
          {
            id: `stk_demo_${Date.now()}`,
            contactId: contact.id,
            name: input.name,
            roleTitle: input.role,
            stakeholderRole: input.stakeholderRole,
            influence: "medium",
            decisionRole: "Needs confirmation",
            sentiment: "neutral",
            status: "confirmed",
            ownerName: account.primaryOwnerName || DEMO_USER_NAME,
            lastTouched: nowIso(),
            channelLabels: ["Email", "Text"],
            notes: "Manually added during demo intake review.",
          },
          ...workspace.stakeholders,
        ],
      },
    },
    {
      channelType: "note",
      direction: "internal",
      visibility: "internal",
      title: "Contact added manually",
      body: `${input.name} was added as ${input.role} and mapped into the stakeholder graph.`,
      actorName: DEMO_USER_NAME,
      targetLabel: input.email,
      workflowName: "Manual CRM Intake",
    },
  );

  upsertAccount(nextAccount);
  return nextAccount;
}

export function importDemoCrmBatch(input: {
  accountName: string;
  contactName: string;
  contactRole: string;
  source: LeadSource;
}): CrmAccount {
  const account = createDemoAccount({
    name: input.accountName,
    segment: "mid_market",
    ownerName: "Ana Chen",
    source: input.source,
  });

  createDemoContact({
    accountId: account.id,
    name: input.contactName,
    role: input.contactRole,
    email: `${slugify(input.contactName)}@${slugify(input.accountName)}.demo`,
    stakeholderRole: "champion",
  });

  importDemoDocument({
    title: `${input.accountName} CRM Import Packet`,
    fileName: `${slugify(input.accountName)}-crm-import.csv`,
    documentType: "brief",
    fileFormat: "txt",
    moduleSource: "crm",
    accountId: account.id,
    sourceLabel: "CRM CSV Import",
  });

  addDemoTask({
    id: `task_demo_import_${Date.now()}`,
    title: `Review imported discovery payload for ${input.accountName}`,
    description:
      "Validate dedupe matches, ownership, and stakeholder coverage before promoting to Build.",
    taskType: "review",
    moduleType: "crm",
    vaultSlug: null,
    vaultName: input.accountName,
    fieldCode: null,
    severity: "info",
    status: "open",
    assignedTo: DEMO_USER_ID,
    assignedToName: DEMO_USER_NAME,
    createdBy: "system",
    createdByName: "System",
    source: "crm_import",
    workflowName: "Discovery Intake",
    dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });

  return account;
}

export function importDemoDocument(input: {
  title: string;
  fileName: string;
  documentType: Document["documentType"];
  fileFormat: Document["fileFormat"];
  moduleSource: Document["moduleSource"];
  accountId?: string | null;
  sourceLabel:
    | "Local Upload"
    | "Google Drive Import"
    | "System Generated"
    | "CRM CSV Import";
}): Document {
  const documentId = `doc_demo_${Date.now()}`;
  const account = input.accountId ? findAccount(input.accountId) : null;
  const document: Document = {
    id: documentId,
    title: input.title,
    fileName: input.fileName,
    fileFormat: input.fileFormat,
    fileSizeBytes: 925_000,
    documentType: input.documentType,
    status: "draft",
    vaultSlug: account ? slugify(account.name) : null,
    vaultName: account?.name ?? null,
    moduleSource: input.moduleSource,
    uploadedBy: DEMO_USER_ID,
    uploadedByName: DEMO_USER_NAME,
    version: 1,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    relatedAccountId: account?.id ?? null,
    relatedAccountName: account?.name ?? null,
    sourceLabel: input.sourceLabel,
  };

  addDemoDocument(document);

  if (account) {
    const withArtifact = appendArtifact(
      appendThread(account, {
        channelType: "upload",
        direction: "inbound",
        visibility: "system",
        title: `${input.sourceLabel} attached`,
        body: `${input.title} was attached to the account memory workspace and linked to the current discovery story.`,
        actorName: DEMO_USER_NAME,
        workflowName: "Discovery Intake",
        linkedArtifactIds: [document.id],
      }),
      {
        id: document.id,
        label: document.title,
        type:
          input.documentType === "transcript"
            ? "transcript"
            : input.documentType === "brief"
              ? "brief"
              : "document",
        status: "Active",
        updatedAt: nowIso(),
      },
    );
    upsertAccount(withArtifact);
  }

  return document;
}

export function createDemoInboundContractIntake(input: {
  existingAccountId?: string | null;
  accountName: string;
  ownerName: string;
  contractTitle: string;
  contractType: string;
  fileName: string;
  source: "Local Upload" | "Google Drive Import" | "Email Intake";
  contactName?: string;
}): DemoGeneratedContract {
  const account =
    (input.existingAccountId && findAccount(input.existingAccountId)) ||
    createDemoAccount({
      name: input.accountName,
      segment: "mid_market",
      ownerName: input.ownerName,
      source: "contract_upload",
    });

  if (input.contactName) {
    createDemoContact({
      accountId: account.id,
      name: input.contactName,
      role: "Counterparty Contact",
      email: `${slugify(input.contactName)}@${slugify(account.name)}.demo`,
      stakeholderRole: "champion",
    });
  }

  const timestamp = nowIso();
  const contractId = `demo_contract_${Date.now()}`;
  const vaultId = `vault_demo_${Date.now()}`;
  const vaultSlug = `${slugify(account.name)}-${slugify(input.contractType)}-intake`;
  const documentId = `doc_demo_contract_${Date.now()}`;

  const contract: DemoGeneratedContract = {
    id: contractId,
    sourceType: "inbound",
    intakeSource: input.source,
    accountId: account.id,
    accountName: account.name,
    title: input.contractTitle,
    templateName: "Inbound Contract Intake",
    contractType: input.contractType,
    documentId,
    vaultId,
    vaultSlug,
    lifecycleState: "discovery_active",
    signatureState: "not_prepared",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  updateContractRecord(contract);

  addDemoVault({
    id: vaultId,
    workspace_id: "ws_demo",
    parent_vault_id: null,
    vault_level: 3,
    name: input.contractTitle,
    slug: vaultSlug,
    vault_type: "contract",
    module_type: "contracts",
    chamber: "discover",
    gate: "gate_pending",
    metadata: {
      entity: account.name,
      contract_type: input.contractType,
      demo_contract_id: contract.id,
      intake_source: input.source,
      signature_state: contract.signatureState,
    },
    health_score: 72,
    created_at: timestamp,
    updated_at: timestamp,
    archived_at: null,
  });

  addDemoDocument({
    id: documentId,
    title: input.contractTitle,
    fileName: input.fileName,
    fileFormat: input.fileName.endsWith(".docx") ? "docx" : "pdf",
    fileSizeBytes: 1_280_000,
    documentType: "contract",
    status: "draft",
    vaultSlug,
    vaultName: input.contractTitle,
    moduleSource: "contracts",
    uploadedBy: DEMO_USER_ID,
    uploadedByName: DEMO_USER_NAME,
    version: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
    relatedAccountId: account.id,
    relatedAccountName: account.name,
    sourceLabel: input.source,
    signatureState: contract.signatureState,
    lifecycleState: contract.lifecycleState,
  });

  const nextAccount = appendArtifact(
    appendThread(
      {
        ...account,
        currentChamber: "discover",
        contractReadiness: "capturing",
        latestSummary: `${input.source} created an inbound contract intake for ${input.contractTitle}.`,
        nextRecommendedAction:
          "Run triage, review the inbound contract, and decide whether to promote to Build.",
        pendingGateCount: 1,
      },
      {
        channelType: "upload",
        direction: "inbound",
        visibility: "system",
        title: "Inbound contract received",
        body: `${input.contractTitle} entered the system through ${input.source} and started the discovery-to-ship lifecycle.`,
        actorName: DEMO_USER_NAME,
        workflowName: "Inbound Contract Intake",
        linkedArtifactIds: [documentId],
      },
    ),
    {
      id: documentId,
      label: input.contractTitle,
      type: "document",
      status: "Triage",
      updatedAt: timestamp,
    },
  );
  upsertAccount(nextAccount);

  addDemoTask({
    id: `task_demo_triage_${Date.now()}`,
    title: `Triage inbound contract for ${account.name}`,
    description:
      "Review intake source, identify counterparties, and decide whether to promote the contract to Build.",
    taskType: "triage",
    moduleType: "contracts",
    vaultSlug,
    vaultName: input.contractTitle,
    fieldCode: null,
    severity: "warning",
    status: "open",
    assignedTo: DEMO_USER_ID,
    assignedToName: DEMO_USER_NAME,
    createdBy: "system",
    createdByName: "System",
    source: "contract_intake",
    workflowName: "Inbound Contract Intake",
    dueAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  addDemoEvent({
    id: `cal_demo_intake_${Date.now()}`,
    title: `${account.name} -- Intake review checkpoint`,
    date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    eventType: "review_checkpoint",
    source: "contracts",
    vaultSlug,
    vaultName: input.contractTitle,
    description:
      "Inbound contract intake waiting for triage and discovery review.",
    color: "bg-purple-500/20 text-purple-300",
    dotColor: "bg-purple-300",
    isAllDay: false,
  });

  addDemoFeedItem({
    id: `feed_demo_intake_${Date.now()}`,
    eventType: "activity.summary",
    title: "Inbound contract created",
    vaultName: input.contractTitle,
    entityName: account.name,
    builderName: input.ownerName,
    detail:
      "Inbound contract intake created a triage task, document artifact, and contract vault.",
    badge: "Inbound Intake",
    timestamp,
  });

  return contract;
}

export function promoteDemoAccountToBuild(
  accountId: string,
): CrmAccount | null {
  const account = findAccount(accountId);
  if (!account) return null;

  let nextAccount = appendThread(
    {
      ...account,
      currentChamber: "build",
      contractReadiness: "qualified",
      pendingGateCount: 0,
      nextRecommendedAction:
        "Open the contract generator and prepare the first draft packet.",
      latestSummary:
        "Discovery is complete enough to move into Build and stage the initial agreement.",
    },
    {
      channelType: "system",
      direction: "system",
      visibility: "system",
      title: "Promoted to Build",
      body: "Discovery review is complete. The account is now ready for build-phase follow-up and contract preparation.",
      actorName: DEMO_USER_NAME,
      workflowName: "Discovery to Build",
    },
  );

  nextAccount = {
    ...nextAccount,
    accountMemory: nextAccount.accountMemory
      ? {
          ...nextAccount.accountMemory,
          nextRecommendedAction:
            "Generate a first-pass agreement and create the review bundle.",
        }
      : nextAccount.accountMemory,
  };

  upsertAccount(nextAccount);

  addDemoTask({
    id: `task_demo_build_${Date.now()}`,
    title: `Prepare contract draft for ${account.name}`,
    description:
      "Qualification is complete enough to open the generator and prepare the draft packet.",
    taskType: "deal_task",
    moduleType: "crm",
    vaultSlug: null,
    vaultName: account.name,
    fieldCode: null,
    severity: "info",
    status: "open",
    assignedTo: DEMO_USER_ID,
    assignedToName: DEMO_USER_NAME,
    createdBy: "system",
    createdByName: "System",
    source: "discovery_to_build",
    workflowName: "Discovery to Build",
    dueAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });

  addDemoEvent({
    id: `cal_demo_build_${Date.now()}`,
    title: `${account.name} — Build kickoff`,
    date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    eventType: "contract_prep",
    source: "crm",
    vaultSlug: null,
    vaultName: account.name,
    description:
      "Discovery has promoted into Build. Prepare the initial agreement draft and review bundle.",
    color: "bg-emerald-500/20 text-emerald-300",
    dotColor: "bg-emerald-300",
    isAllDay: false,
  });

  return nextAccount;
}

export function createDemoGeneratedContract(input: {
  accountId: string;
  title: string;
  templateName: string;
  contractType: string;
}): DemoGeneratedContract | null {
  const account = findAccount(input.accountId);
  if (!account) return null;

  const contractId = `demo_contract_${Date.now()}`;
  const vaultSlug = `${slugify(account.name)}-${slugify(input.contractType)}-draft`;
  const vaultId = `vault_demo_${Date.now()}`;
  const documentId = `doc_demo_contract_${Date.now()}`;
  const timestamp = nowIso();

  const contract: DemoGeneratedContract = {
    id: contractId,
    sourceType: "generated",
    intakeSource: "Generator Export",
    accountId: account.id,
    accountName: account.name,
    title: input.title,
    templateName: input.templateName,
    contractType: input.contractType,
    documentId,
    vaultId,
    vaultSlug,
    lifecycleState: "internal_review",
    signatureState: "not_prepared",
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  updateContractRecord(contract);

  addDemoVault({
    id: vaultId,
    workspace_id: "ws_demo",
    parent_vault_id: null,
    vault_level: 3,
    name: input.title,
    slug: vaultSlug,
    vault_type: "contract",
    module_type: "contracts",
    chamber: "review",
    gate: "gate_review",
    metadata: {
      entity: account.name,
      contract_type: input.contractType,
      demo_contract_id: contract.id,
      signature_state: contract.signatureState,
    },
    health_score: 86,
    created_at: timestamp,
    updated_at: timestamp,
    archived_at: null,
  });

  const document: Document = {
    id: documentId,
    title: input.title,
    fileName: `${vaultSlug}.docx`,
    fileFormat: "docx",
    fileSizeBytes: 1_350_000,
    documentType: "contract",
    status: "draft",
    vaultSlug,
    vaultName: input.title,
    moduleSource: "contracts",
    uploadedBy: DEMO_USER_ID,
    uploadedByName: DEMO_USER_NAME,
    version: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
    relatedAccountId: account.id,
    relatedAccountName: account.name,
    sourceLabel: "System Generated",
    signatureState: contract.signatureState,
    lifecycleState: contract.lifecycleState,
  };
  addDemoDocument(document);

  const nextAccount = appendArtifact(
    appendThread(
      {
        ...account,
        currentChamber: "review",
        contractReadiness: "draft_ready",
        latestSummary: `${input.templateName} draft was generated and routed into internal review.`,
        nextRecommendedAction:
          "Review the generated draft, then prepare the signature packet.",
        pendingGateCount: 1,
      },
      {
        channelType: "system",
        direction: "system",
        visibility: "system",
        title: "Contract draft generated",
        body: `${input.title} was generated locally and propagated into Documents, Review Queue, Tasks, and Calendar.`,
        actorName: "Generator",
        workflowName: "Contract Generation",
        linkedArtifactIds: [document.id],
      },
    ),
    {
      id: document.id,
      label: input.title,
      type: "contract_draft",
      status: "Internal Review",
      updatedAt: timestamp,
    },
  );
  upsertAccount(nextAccount);

  addDemoTask({
    id: `task_demo_contract_${Date.now()}`,
    title: `Review generated draft for ${account.name}`,
    description:
      "Generated draft is ready for internal review and signature preparation.",
    taskType: "approval",
    moduleType: "contracts",
    vaultSlug,
    vaultName: input.title,
    fieldCode: null,
    severity: "info",
    status: "in_review",
    assignedTo: DEMO_USER_ID,
    assignedToName: DEMO_USER_NAME,
    createdBy: "system",
    createdByName: "System",
    source: "contract_generation",
    workflowName: "Contract Generation",
    dueAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  addDemoEvent({
    id: `cal_demo_contract_${Date.now()}`,
    title: `${account.name} — Draft review checkpoint`,
    date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    eventType: "review_checkpoint",
    source: "contracts",
    vaultSlug,
    vaultName: input.title,
    description:
      "Generated draft is staged for internal review and signature preparation.",
    color: "bg-purple-500/20 text-purple-300",
    dotColor: "bg-purple-300",
    isAllDay: false,
  });

  addDemoReviewParent({
    id: `pv_demo_${contract.id}`,
    name: account.name,
    typeBadge: input.contractType,
    vaultCount: 1,
    healthScore: 86,
    assignedBuilders: [account.primaryOwnerName || DEMO_USER_NAME],
    buildReadyPercent: 100,
    buildReadyCount: 1,
    buildReadyTotal: 1,
    patches: 0,
    rfis: 0,
    corrections: 0,
    anomalies: 0,
    children: [
      {
        id: `cv_demo_${contract.id}`,
        counterparty: input.title,
        builder: account.primaryOwnerName || DEMO_USER_NAME,
        healthScore: 86,
        gateStatus: "review",
        gateLabel: "Internal Review",
        itemCount: 1,
        category: input.contractType,
      },
    ],
  });

  addDemoFeedItem({
    id: `feed_demo_contract_${Date.now()}`,
    eventType: "activity.summary",
    title: "Generated draft staged",
    vaultName: input.title,
    entityName: account.name,
    builderName: account.primaryOwnerName || DEMO_USER_NAME,
    detail:
      "Draft packet was generated locally and added to the review lifecycle.",
    badge: "Contract Generation",
    timestamp,
  });

  return contract;
}

export function advanceDemoContractJourney(
  contractId: string,
  targetState:
    | "qualified_for_build"
    | "internal_review"
    | "ready_for_signature",
): DemoGeneratedContract | null {
  const contract =
    useDemoLifecycleStore.getState().generatedContracts[contractId];
  if (!contract) return null;

  const nextContract: DemoGeneratedContract = {
    ...contract,
    lifecycleState: targetState,
    updatedAt: nowIso(),
  };
  updateContractRecord(nextContract);

  const chamber =
    targetState === "qualified_for_build"
      ? "build"
      : targetState === "internal_review"
        ? "review"
        : "ship";
  const gate =
    targetState === "qualified_for_build"
      ? "gate_build"
      : targetState === "internal_review"
        ? "gate_review"
        : "gate_ship";
  const healthScore =
    targetState === "qualified_for_build"
      ? 79
      : targetState === "internal_review"
        ? 86
        : 92;

  updateDemoVault(contract.vaultId, (vault) => ({
    ...vault,
    chamber,
    gate,
    health_score: healthScore,
    updated_at: nowIso(),
    metadata: {
      ...vault.metadata,
      demo_contract_id: contract.id,
      signature_state: nextContract.signatureState,
      lifecycle_state: targetState,
    },
  }));

  useDemoLifecycleStore
    .getState()
    .updateDocument(contract.documentId, (document) => ({
      ...document,
      updatedAt: nowIso(),
      lifecycleState: targetState,
    }));
  refreshDocuments();

  const account = findAccount(contract.accountId);
  if (account) {
    const nextRecommendedAction =
      targetState === "qualified_for_build"
        ? "Confirm commercial terms and prepare the contract review bundle."
        : targetState === "internal_review"
          ? "Review extracted fields, patch issues, and decide on signature readiness."
          : "Prepare the signature packet and route to signers.";
    const latestSummary =
      targetState === "qualified_for_build"
        ? `${contract.title} moved from intake into Build.`
        : targetState === "internal_review"
          ? `${contract.title} moved into Review with a full draft packet.`
          : `${contract.title} is ready for signature packaging.`;
    const nextAccount = appendThread(
      {
        ...account,
        currentChamber: chamber,
        contractReadiness:
          targetState === "qualified_for_build" ? "qualified" : "draft_ready",
        latestSummary,
        nextRecommendedAction,
        pendingGateCount: targetState === "ready_for_signature" ? 0 : 1,
      },
      {
        channelType: "system",
        direction: "system",
        visibility: "system",
        title: "Contract lifecycle advanced",
        body: `${contract.title} is now ${targetState.replace(/_/g, " ")} in the local demo lifecycle.`,
        actorName: DEMO_USER_NAME,
        workflowName: "Inbound Contract Lifecycle",
        linkedArtifactIds: [contract.documentId],
      },
    );
    upsertAccount(nextAccount);
  }

  addDemoFeedItem({
    id: `feed_demo_lifecycle_${Date.now()}`,
    eventType: "activity.summary",
    title: "Lifecycle advanced",
    vaultName: contract.title,
    entityName: contract.accountName,
    builderName: DEMO_USER_NAME,
    detail: `${contract.title} moved to ${targetState.replace(/_/g, " ")}.`,
    badge: "Lifecycle",
    timestamp: nowIso(),
  });

  if (targetState === "internal_review") {
    addDemoReviewParent({
      id: `pv_demo_${contract.id}`,
      name: contract.accountName,
      typeBadge: contract.contractType,
      vaultCount: 1,
      healthScore: 86,
      assignedBuilders: [DEMO_USER_NAME],
      buildReadyPercent: 100,
      buildReadyCount: 1,
      buildReadyTotal: 1,
      patches: 0,
      rfis: 0,
      corrections: 0,
      anomalies: 0,
      children: [
        {
          id: `cv_demo_${contract.id}`,
          counterparty: contract.title,
          builder: DEMO_USER_NAME,
          healthScore: 86,
          gateStatus: "review",
          gateLabel: "Internal Review",
          itemCount: 1,
          category: contract.contractType,
        },
      ],
    });
  }

  return nextContract;
}

export function advanceDemoSignature(
  contractId: string,
  signatureState: DemoSignatureState,
): DemoGeneratedContract | null {
  const contract =
    useDemoLifecycleStore.getState().generatedContracts[contractId];
  if (!contract) return null;

  const nextContract: DemoGeneratedContract = {
    ...contract,
    signatureState,
    lifecycleState: nextContractLifecycleState(signatureState),
    updatedAt: nowIso(),
  };
  updateContractRecord(nextContract);

  updateDemoVault(contract.vaultId, (vault) => ({
    ...vault,
    chamber: signatureState === "signed" ? "ship" : vault.chamber,
    gate: signatureState === "signed" ? "gate_ship" : vault.gate,
    health_score: signatureState === "signed" ? 95 : vault.health_score,
    updated_at: nowIso(),
    metadata: {
      ...vault.metadata,
      signature_state: signatureState,
      lifecycle_state: nextContract.lifecycleState,
    },
  }));

  useDemoLifecycleStore
    .getState()
    .updateDocument(contract.documentId, (document) => ({
      ...document,
      status: signatureState === "signed" ? "final" : document.status,
      updatedAt: nowIso(),
      signatureState,
      lifecycleState: nextContract.lifecycleState,
      sourceLabel:
        signatureState === "signed" ? "System Generated" : document.sourceLabel,
    }));
  refreshDocuments();

  const account = findAccount(contract.accountId);
  if (account) {
    let nextAccount = appendThread(account, {
      channelType: "system",
      direction: "system",
      visibility: "system",
      title: "Signature lifecycle updated",
      body: `${contract.title} is now ${signatureLabel(signatureState)} in the local demo lifecycle.`,
      actorName: "Signature Stub",
      workflowName: "Signature Lifecycle",
      linkedArtifactIds: [contract.documentId],
    });

    if (signatureState === "signed") {
      nextAccount = {
        ...nextAccount,
        currentChamber: "ship",
        latestSummary: `${contract.title} was marked signed in the local demo lifecycle.`,
        nextRecommendedAction: "Trigger onboarding and activation work.",
      };
    } else if (signatureState === "sent_for_signature") {
      nextAccount = {
        ...nextAccount,
        latestSummary: `${contract.title} has been sent to the signature stub.`,
        nextRecommendedAction:
          "Monitor signer progress and prepare activation tasks.",
      };
    } else if (signatureState === "ready_for_signature") {
      nextAccount = {
        ...nextAccount,
        latestSummary: `${contract.title} is ready for signature packaging.`,
        nextRecommendedAction: "Prepare and send the signature packet.",
      };
    }

    upsertAccount(nextAccount);
  }

  addDemoFeedItem({
    id: `feed_demo_signature_${Date.now()}`,
    eventType: "activity.summary",
    title: "Signature status changed",
    vaultName: contract.title,
    entityName: contract.accountName,
    builderName: DEMO_USER_NAME,
    detail: `${contract.title} moved to ${signatureLabel(signatureState)}.`,
    badge: "Signature Stub",
    timestamp: nowIso(),
  });

  if (
    signatureState === "sent_for_signature" ||
    signatureState === "partially_signed"
  ) {
    addDemoEvent({
      id: `cal_demo_signature_${Date.now()}`,
      title: `${contract.accountName} — Signature follow-up`,
      date: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      eventType: "follow_up",
      source: "contracts",
      vaultSlug: contract.vaultSlug,
      vaultName: contract.title,
      description: `Follow up on ${signatureLabel(signatureState)} status for the signature packet.`,
      color: "bg-accent-secondary/20 text-accent-secondary",
      dotColor: "bg-accent-secondary",
      isAllDay: false,
    });
  }

  if (signatureState === "signed") {
    addDemoTask({
      id: `task_demo_signed_${Date.now()}`,
      title: `Activate signed agreement for ${contract.accountName}`,
      description:
        "Signed packet completed. Trigger onboarding and post-signature follow-up.",
      taskType: "onboarding",
      moduleType: "contracts",
      vaultSlug: contract.vaultSlug,
      vaultName: contract.title,
      fieldCode: null,
      severity: "info",
      status: "open",
      assignedTo: DEMO_USER_ID,
      assignedToName: DEMO_USER_NAME,
      createdBy: "system",
      createdByName: "System",
      source: "signature_stub",
      workflowName: "Signature Lifecycle",
      dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });

    addDemoDocument({
      id: `doc_demo_signed_${Date.now()}`,
      title: `${contract.title} — Signed Copy`,
      fileName: `${contract.vaultSlug}-signed.pdf`,
      fileFormat: "pdf",
      fileSizeBytes: 1_540_000,
      documentType: "contract",
      status: "final",
      vaultSlug: contract.vaultSlug,
      vaultName: contract.title,
      moduleSource: "contracts",
      uploadedBy: DEMO_USER_ID,
      uploadedByName: DEMO_USER_NAME,
      version: 2,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      relatedAccountId: contract.accountId,
      relatedAccountName: contract.accountName,
      sourceLabel: "System Generated",
      signatureState,
      lifecycleState: "signed",
    });
  }

  return nextContract;
}
