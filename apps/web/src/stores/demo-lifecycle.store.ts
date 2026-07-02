import { create } from "zustand";
import type { Document } from "@/lib/mock-documents";
import type { Task } from "@/lib/mock-tasks";
import type { CalendarEvent } from "@/lib/mock-calendar";
import type { CrmAccount } from "@/lib/mock-crm";
import type { FeedItem, ParentVaultCard } from "@/lib/mock-review-queue";
import type { Vault } from "@/stores/vault.store";

export type DemoSignatureState =
  | "not_prepared"
  | "ready_for_signature"
  | "sent_for_signature"
  | "partially_signed"
  | "signed"
  | "declined"
  | "voided";

export interface DemoGeneratedContract {
  id: string;
  sourceType: "inbound" | "generated";
  intakeSource?: string | null;
  accountId: string;
  accountName: string;
  title: string;
  templateName: string;
  contractType: string;
  documentId: string;
  vaultId: string;
  vaultSlug: string;
  lifecycleState:
    | "intake_received"
    | "discovery_active"
    | "qualified_for_build"
    | "draft_generated"
    | "internal_review"
    | "ready_for_signature"
    | "sent_for_signature"
    | "signed";
  signatureState: DemoSignatureState;
  createdAt: string;
  updatedAt: string;
}

interface DemoLifecycleState {
  accountOverrides: Record<string, CrmAccount>;
  documents: Document[];
  tasks: Task[];
  events: CalendarEvent[];
  reviewParentVaults: ParentVaultCard[];
  reviewFeedItems: FeedItem[];
  vaults: Vault[];
  generatedContracts: Record<string, DemoGeneratedContract>;

  upsertAccount: (account: CrmAccount) => void;
  addDocument: (document: Document) => void;
  updateDocument: (
    documentId: string,
    updater: (document: Document) => Document,
  ) => void;
  addTask: (task: Task) => void;
  updateTask: (taskId: string, updater: (task: Task) => Task) => void;
  addEvent: (event: CalendarEvent) => void;
  addReviewParentVault: (card: ParentVaultCard) => void;
  addReviewFeedItem: (item: FeedItem) => void;
  addVault: (vault: Vault) => void;
  updateVault: (vaultId: string, updater: (vault: Vault) => Vault) => void;
  upsertGeneratedContract: (contract: DemoGeneratedContract) => void;
}

export const useDemoLifecycleStore = create<DemoLifecycleState>((set) => ({
  accountOverrides: {},
  documents: [],
  tasks: [],
  events: [],
  reviewParentVaults: [],
  reviewFeedItems: [],
  vaults: [],
  generatedContracts: {},

  upsertAccount: (account) =>
    set((state) => ({
      accountOverrides: {
        ...state.accountOverrides,
        [account.id]: account,
      },
    })),

  addDocument: (document) =>
    set((state) => ({
      documents: [
        document,
        ...state.documents.filter((item) => item.id !== document.id),
      ],
    })),

  updateDocument: (documentId, updater) =>
    set((state) => ({
      documents: state.documents.map((document) =>
        document.id === documentId ? updater(document) : document,
      ),
    })),

  addTask: (task) =>
    set((state) => ({
      tasks: [task, ...state.tasks.filter((item) => item.id !== task.id)],
    })),

  updateTask: (taskId, updater) =>
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === taskId ? updater(task) : task,
      ),
    })),

  addEvent: (event) =>
    set((state) => ({
      events: [event, ...state.events.filter((item) => item.id !== event.id)],
    })),

  addReviewParentVault: (card) =>
    set((state) => ({
      reviewParentVaults: [
        card,
        ...state.reviewParentVaults.filter((item) => item.id !== card.id),
      ],
    })),

  addReviewFeedItem: (item) =>
    set((state) => ({
      reviewFeedItems: [
        item,
        ...state.reviewFeedItems.filter((entry) => entry.id !== item.id),
      ],
    })),

  addVault: (vault) =>
    set((state) => ({
      vaults: [vault, ...state.vaults.filter((item) => item.id !== vault.id)],
    })),

  updateVault: (vaultId, updater) =>
    set((state) => ({
      vaults: state.vaults.map((vault) =>
        vault.id === vaultId ? updater(vault) : vault,
      ),
    })),

  upsertGeneratedContract: (contract) =>
    set((state) => ({
      generatedContracts: {
        ...state.generatedContracts,
        [contract.id]: contract,
      },
    })),
}));

function mergeById<T extends { id: string }>(base: T[], additions: T[]): T[] {
  const incoming = new Map(additions.map((item) => [item.id, item]));
  const mergedBase = base.map((item) => incoming.get(item.id) ?? item);
  const newItems = additions.filter(
    (item) => !base.some((entry) => entry.id === item.id),
  );
  return [...newItems, ...mergedBase];
}

export function mergeDemoAccounts(base: CrmAccount[]): CrmAccount[] {
  const overrides = Object.values(
    useDemoLifecycleStore.getState().accountOverrides,
  );
  return mergeById(base, overrides);
}

export function mergeDemoDocuments(base: Document[]): Document[] {
  return mergeById(base, useDemoLifecycleStore.getState().documents);
}

export function mergeDemoTasks(base: Task[]): Task[] {
  return mergeById(base, useDemoLifecycleStore.getState().tasks);
}

export function mergeDemoEvents(base: CalendarEvent[]): CalendarEvent[] {
  return mergeById(base, useDemoLifecycleStore.getState().events);
}

export function mergeDemoReviewParentVaults(
  base: ParentVaultCard[],
): ParentVaultCard[] {
  return mergeById(base, useDemoLifecycleStore.getState().reviewParentVaults);
}

export function mergeDemoReviewFeedItems(base: FeedItem[]): FeedItem[] {
  return mergeById(base, useDemoLifecycleStore.getState().reviewFeedItems);
}

export function mergeDemoVaults(base: Vault[]): Vault[] {
  return mergeById(base, useDemoLifecycleStore.getState().vaults);
}

export function getDemoGeneratedContracts(): DemoGeneratedContract[] {
  return Object.values(
    useDemoLifecycleStore.getState().generatedContracts,
  ).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function getDemoGeneratedContractById(
  contractId: string,
): DemoGeneratedContract | null {
  return (
    useDemoLifecycleStore.getState().generatedContracts[contractId] ?? null
  );
}
