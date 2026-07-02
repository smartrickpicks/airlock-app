/**
 * Mock clause library data for dev preview.
 * Represents a subset of the 188-clause unified library (v2).
 * Schema matches airlock-docs repo — specs/contract-generator/overview.md (via MCP)
 */

export type RiskLevel = "standard" | "elevated" | "critical" | "high";

export type ContractVertical =
  | "music_core"
  | "music_ancillary"
  | "film"
  | "tv"
  | "cross_entertainment";

export interface ContractTypeOption {
  id: string;
  label: string;
  vertical: ContractVertical;
}

export interface ClauseVariable {
  field: string;
  canonical_key: string;
  placeholder: string;
  default: string | null;
}

export interface ClauseTrigger {
  field: string;
  condition:
    | "equals"
    | "in"
    | "not_equals"
    | "exists"
    | "not_exists"
    | "contains"
    | "pattern"
    | "default";
  value?: string;
}

export interface Clause {
  clause_id: string;
  clause_type: string;
  version: number;
  contract_types: string[];
  section: string;
  risk_level: RiskLevel;
  body: string;
  variables: ClauseVariable[];
  triggers: ClauseTrigger[];
  generation_config: { priority: number; fallback: string };
}

export interface TemplateSection {
  id: string;
  title: string;
  order: number;
  type: "boilerplate" | "conditional";
}

export interface ContractTemplate {
  template_id: string;
  contract_type: string;
  display_name: string;
  sections: TemplateSection[];
  required_fields: string[];
}

/** Vertical labels for display */
export const VERTICAL_LABELS: Record<ContractVertical, string> = {
  music_core: "Music Core",
  music_ancillary: "Music Ancillary",
  film: "Film",
  tv: "TV",
  cross_entertainment: "Cross-Entertainment",
};

/** All 24 contract types across 5 verticals */
export const CONTRACT_TYPES: ContractTypeOption[] = [
  // Music Core
  {
    id: "distribution",
    label: "Distribution Agreement",
    vertical: "music_core",
  },
  { id: "license", label: "License Agreement", vertical: "music_core" },
  { id: "recording", label: "Recording Agreement", vertical: "music_core" },
  { id: "publishing", label: "Publishing Agreement", vertical: "music_core" },
  // Music Ancillary
  { id: "producer", label: "Producer Agreement", vertical: "music_ancillary" },
  { id: "sync_license", label: "Sync License", vertical: "music_ancillary" },
  {
    id: "master_use",
    label: "Master Use License",
    vertical: "music_ancillary",
  },
  {
    id: "management",
    label: "Management Agreement",
    vertical: "music_ancillary",
  },
  {
    id: "co_publishing",
    label: "Co-Publishing Agreement",
    vertical: "music_ancillary",
  },
  {
    id: "sample_clearance",
    label: "Sample Clearance",
    vertical: "music_ancillary",
  },
  {
    id: "merchandise",
    label: "Merchandise Agreement",
    vertical: "music_ancillary",
  },
  // Film
  { id: "film_distribution", label: "Film Distribution", vertical: "film" },
  { id: "talent_actor", label: "Talent (Actor)", vertical: "film" },
  { id: "director", label: "Director Agreement", vertical: "film" },
  { id: "screenplay_option", label: "Screenplay Option", vertical: "film" },
  { id: "co_production", label: "Co-Production Agreement", vertical: "film" },
  // TV
  { id: "tv_distribution", label: "TV Distribution", vertical: "tv" },
  { id: "tv_talent", label: "TV Talent", vertical: "tv" },
  { id: "tv_development", label: "TV Development Deal", vertical: "tv" },
  { id: "tv_licensing", label: "TV Licensing", vertical: "tv" },
  // Cross-Entertainment
  {
    id: "nda",
    label: "Non-Disclosure Agreement",
    vertical: "cross_entertainment",
  },
  {
    id: "work_for_hire",
    label: "Work for Hire",
    vertical: "cross_entertainment",
  },
  {
    id: "assignment",
    label: "Assignment Agreement",
    vertical: "cross_entertainment",
  },
  {
    id: "termination",
    label: "Termination Agreement",
    vertical: "cross_entertainment",
  },
];

/** Distribution Agreement template — 8 sections */
export const DISTRIBUTION_TEMPLATE: ContractTemplate = {
  template_id: "distribution-standard-v1",
  contract_type: "distribution",
  display_name: "Distribution Agreement",
  sections: [
    { id: "recitals", title: "RECITALS", order: 1, type: "boilerplate" },
    {
      id: "scope",
      title: "1. SCOPE OF AGREEMENT",
      order: 2,
      type: "conditional",
    },
    {
      id: "term",
      title: "2. TERM AND TERRITORY",
      order: 3,
      type: "conditional",
    },
    {
      id: "compensation",
      title: "3. COMPENSATION",
      order: 4,
      type: "conditional",
    },
    {
      id: "delivery",
      title: "4. DELIVERY AND ACCEPTANCE",
      order: 5,
      type: "conditional",
    },
    {
      id: "representations",
      title: "5. REPRESENTATIONS AND WARRANTIES",
      order: 6,
      type: "boilerplate",
    },
    {
      id: "termination",
      title: "6. TERMINATION",
      order: 7,
      type: "conditional",
    },
    {
      id: "general",
      title: "7. GENERAL PROVISIONS",
      order: 8,
      type: "boilerplate",
    },
  ],
  required_fields: [
    "OPP_CONTRACT_TYPE",
    "OPP_TERRITORY",
    "OPP_TERM_LENGTH",
    "OPP_EFFECTIVE_DATE",
  ],
};

/** Mock templates keyed by contract type — only Distribution for now */
export const MOCK_TEMPLATES: Record<string, ContractTemplate> = {
  distribution: DISTRIBUTION_TEMPLATE,
};

/** Representative clause library — 10 clauses for Distribution */
export const MOCK_CLAUSES: Clause[] = [
  {
    clause_id: "GEN-RECITALS-DIST-V1",
    clause_type: "PARTIES_IDENTIFICATION",
    version: 1,
    contract_types: ["distribution"],
    section: "recitals",
    risk_level: "standard",
    body: 'This Distribution Agreement (the "Agreement") is entered into as of {{OPP_EFFECTIVE_DATE}} by and between {{ACCT_LEGAL_ENTITY}} ("Label") and {{ACCT_COUNTERPARTY}} ("Distributor").\n\nWHEREAS, Label is the owner or controller of certain sound recordings and musical compositions; and\n\nWHEREAS, Distributor desires to distribute such recordings in the Territory on the terms set forth herein.',
    variables: [
      {
        field: "OPP_EFFECTIVE_DATE",
        canonical_key: "Effective_Date__c",
        placeholder: "{{OPP_EFFECTIVE_DATE}}",
        default: null,
      },
      {
        field: "ACCT_LEGAL_ENTITY",
        canonical_key: "Legal_Entity__c",
        placeholder: "{{ACCT_LEGAL_ENTITY}}",
        default: null,
      },
      {
        field: "ACCT_COUNTERPARTY",
        canonical_key: "Counterparty__c",
        placeholder: "{{ACCT_COUNTERPARTY}}",
        default: null,
      },
    ],
    triggers: [
      {
        field: "OPP_CONTRACT_TYPE",
        condition: "equals",
        value: "Distribution",
      },
    ],
    generation_config: { priority: 10, fallback: "[TO_BE_DEFINED]" },
  },
  {
    clause_id: "GEN-SCOPE-DIST-V1",
    clause_type: "SCOPE_OF_RIGHTS",
    version: 1,
    contract_types: ["distribution"],
    section: "scope",
    risk_level: "standard",
    body: "1.1 Label hereby grants to Distributor the {{OPP_EXCLUSIVITY}} right to distribute, market, and sell the Recordings in all formats, whether now known or hereafter devised, throughout the Territory.\n\n1.2 The rights granted herein include digital distribution, physical distribution, and {{OPP_SUBLICENSE_RIGHTS}} to sub-license to third-party platforms.",
    variables: [
      {
        field: "OPP_EXCLUSIVITY",
        canonical_key: "Exclusivity__c",
        placeholder: "{{OPP_EXCLUSIVITY}}",
        default: "non-exclusive",
      },
      {
        field: "OPP_SUBLICENSE_RIGHTS",
        canonical_key: "Sublicense_Rights__c",
        placeholder: "{{OPP_SUBLICENSE_RIGHTS}}",
        default: "the right",
      },
    ],
    triggers: [
      {
        field: "OPP_CONTRACT_TYPE",
        condition: "equals",
        value: "Distribution",
      },
    ],
    generation_config: { priority: 10, fallback: "[TO_BE_DEFINED]" },
  },
  {
    clause_id: "RISK-SCOPE-EXCLUSIVE-V1",
    clause_type: "SCOPE_OF_RIGHTS",
    version: 1,
    contract_types: ["distribution"],
    section: "scope",
    risk_level: "elevated",
    body: "1.1 Label hereby grants to Distributor the EXCLUSIVE right to distribute, market, sell, and exploit the Recordings in ALL formats throughout the Territory, including but not limited to digital, physical, streaming, broadcast, and any formats hereafter devised.\n\n1.2 During the Term, Label shall not engage any other distributor for the Territory without Distributor's prior written consent.",
    variables: [],
    triggers: [
      {
        field: "OPP_CONTRACT_TYPE",
        condition: "equals",
        value: "Distribution",
      },
      { field: "OPP_EXCLUSIVITY", condition: "equals", value: "Exclusive" },
    ],
    generation_config: { priority: 20, fallback: "[TO_BE_DEFINED]" },
  },
  {
    clause_id: "GEN-TERM-DIST-V1",
    clause_type: "TERM_DURATION",
    version: 1,
    contract_types: ["distribution"],
    section: "term",
    risk_level: "standard",
    body: '2.1 The initial term of this Agreement shall be {{OPP_TERM_LENGTH}} commencing on the Effective Date (the "Initial Term").\n\n2.2 The Territory covered by this Agreement shall be {{OPP_TERRITORY}}.\n\n2.3 This Agreement shall {{OPP_AUTO_RENEW}} at the end of the Initial Term.',
    variables: [
      {
        field: "OPP_TERM_LENGTH",
        canonical_key: "Term_Length__c",
        placeholder: "{{OPP_TERM_LENGTH}}",
        default: null,
      },
      {
        field: "OPP_TERRITORY",
        canonical_key: "Territory__c",
        placeholder: "{{OPP_TERRITORY}}",
        default: null,
      },
      {
        field: "OPP_AUTO_RENEW",
        canonical_key: "Auto_Renew__c",
        placeholder: "{{OPP_AUTO_RENEW}}",
        default: "not automatically renew",
      },
    ],
    triggers: [
      {
        field: "OPP_CONTRACT_TYPE",
        condition: "equals",
        value: "Distribution",
      },
    ],
    generation_config: { priority: 10, fallback: "[TO_BE_DEFINED]" },
  },
  {
    clause_id: "GEN-COMPENSATION-DIST-V1",
    clause_type: "ROYALTY_RATE",
    version: 1,
    contract_types: ["distribution"],
    section: "compensation",
    risk_level: "standard",
    body: "3.1 Distributor shall pay Label a royalty equal to {{OPP_ROYALTY_RATE}} of Net Receipts, payable on a {{OPP_PAYMENT_TERMS}} basis.\n\n3.2 Label shall pay to Distributor a distribution fee equal to {{OPP_DISTRIBUTION_FEE}} of Net Receipts.\n\n3.3 {{OPP_ADVANCE_CLAUSE}}",
    variables: [
      {
        field: "OPP_ROYALTY_RATE",
        canonical_key: "Royalty_Rate__c",
        placeholder: "{{OPP_ROYALTY_RATE}}",
        default: null,
      },
      {
        field: "OPP_PAYMENT_TERMS",
        canonical_key: "Payment_Terms__c",
        placeholder: "{{OPP_PAYMENT_TERMS}}",
        default: "quarterly",
      },
      {
        field: "OPP_DISTRIBUTION_FEE",
        canonical_key: "Distribution_Fee__c",
        placeholder: "{{OPP_DISTRIBUTION_FEE}}",
        default: null,
      },
      {
        field: "OPP_ADVANCE_CLAUSE",
        canonical_key: "Advance_Clause__c",
        placeholder: "{{OPP_ADVANCE_CLAUSE}}",
        default: "No advance shall be payable under this Agreement.",
      },
    ],
    triggers: [
      {
        field: "OPP_CONTRACT_TYPE",
        condition: "equals",
        value: "Distribution",
      },
    ],
    generation_config: { priority: 10, fallback: "[TO_BE_DEFINED]" },
  },
  {
    clause_id: "RISK-COMPENSATION-HIGH-ADVANCE-V1",
    clause_type: "ADVANCE_PAYMENT",
    version: 1,
    contract_types: ["distribution"],
    section: "compensation",
    risk_level: "critical",
    body: "3.3 Distributor shall pay Label a non-refundable, non-recoupable advance of {{OPP_ADVANCE_AMOUNT}} upon full execution of this Agreement. This advance shall not be offset against royalties or other amounts due hereunder.",
    variables: [
      {
        field: "OPP_ADVANCE_AMOUNT",
        canonical_key: "Advance_Amount__c",
        placeholder: "{{OPP_ADVANCE_AMOUNT}}",
        default: null,
      },
    ],
    triggers: [
      {
        field: "OPP_CONTRACT_TYPE",
        condition: "equals",
        value: "Distribution",
      },
      { field: "OPP_ADVANCE_AMOUNT", condition: "exists" },
    ],
    generation_config: { priority: 20, fallback: "[TO_BE_DEFINED]" },
  },
  {
    clause_id: "GEN-DELIVERY-DIST-V1",
    clause_type: "DELIVERY_REQUIREMENTS",
    version: 1,
    contract_types: ["distribution"],
    section: "delivery",
    risk_level: "standard",
    body: "4.1 Label shall deliver to Distributor master recordings in industry-standard formats (WAV 24-bit/96kHz minimum) together with all metadata, artwork, and credits.\n\n4.2 Distributor shall have {{OPP_ACCEPTANCE_PERIOD}} from receipt to accept or reject each delivery on reasonable technical grounds.",
    variables: [
      {
        field: "OPP_ACCEPTANCE_PERIOD",
        canonical_key: "Acceptance_Period__c",
        placeholder: "{{OPP_ACCEPTANCE_PERIOD}}",
        default: "fourteen (14) business days",
      },
    ],
    triggers: [
      {
        field: "OPP_CONTRACT_TYPE",
        condition: "equals",
        value: "Distribution",
      },
    ],
    generation_config: { priority: 10, fallback: "[TO_BE_DEFINED]" },
  },
  {
    clause_id: "BOILER-REPRESENTATIONS-V1",
    clause_type: "REPRESENTATIONS_WARRANTIES",
    version: 1,
    contract_types: ["distribution", "license", "recording", "publishing"],
    section: "representations",
    risk_level: "standard",
    body: "5.1 Each party represents and warrants that: (a) it has the full right, power, and authority to enter into this Agreement; (b) the execution of this Agreement does not violate any other agreement to which it is a party; and (c) it shall comply with all applicable laws and regulations.\n\n5.2 Label further represents that it owns or controls all rights in the Recordings necessary to grant the rights herein.",
    variables: [],
    triggers: [{ field: "OPP_CONTRACT_TYPE", condition: "default" }],
    generation_config: { priority: 1, fallback: "[TO_BE_DEFINED]" },
  },
  {
    clause_id: "GEN-TERMINATION-DIST-V1",
    clause_type: "TERMINATION_PROVISIONS",
    version: 1,
    contract_types: ["distribution"],
    section: "termination",
    risk_level: "elevated",
    body: "6.1 Either party may terminate this Agreement upon {{OPP_NOTICE_PERIOD}} written notice to the other party.\n\n6.2 Upon termination, Distributor shall have a sell-off period of {{OPP_SELLOFF_PERIOD}} to dispose of existing inventory.\n\n6.3 All accrued and unpaid royalties shall become due and payable within thirty (30) days of termination.",
    variables: [
      {
        field: "OPP_NOTICE_PERIOD",
        canonical_key: "Notice_Period__c",
        placeholder: "{{OPP_NOTICE_PERIOD}}",
        default: "ninety (90) days'",
      },
      {
        field: "OPP_SELLOFF_PERIOD",
        canonical_key: "Selloff_Period__c",
        placeholder: "{{OPP_SELLOFF_PERIOD}}",
        default: "six (6) months",
      },
    ],
    triggers: [
      {
        field: "OPP_CONTRACT_TYPE",
        condition: "equals",
        value: "Distribution",
      },
    ],
    generation_config: { priority: 10, fallback: "[TO_BE_DEFINED]" },
  },
  {
    clause_id: "BOILER-GENERAL-V1",
    clause_type: "GENERAL_PROVISIONS",
    version: 1,
    contract_types: ["distribution", "license", "recording", "publishing"],
    section: "general",
    risk_level: "standard",
    body: "7.1 Governing Law. This Agreement shall be governed by the laws of the State of {{OPP_GOVERNING_LAW}}.\n\n7.2 Entire Agreement. This Agreement constitutes the entire understanding between the parties and supersedes all prior agreements.\n\n7.3 Amendments. No modification of this Agreement shall be effective unless in writing and signed by both parties.\n\n7.4 Notices. All notices shall be in writing and delivered to the addresses set forth above.",
    variables: [
      {
        field: "OPP_GOVERNING_LAW",
        canonical_key: "Governing_Law__c",
        placeholder: "{{OPP_GOVERNING_LAW}}",
        default: "New York",
      },
    ],
    triggers: [{ field: "OPP_CONTRACT_TYPE", condition: "default" }],
    generation_config: { priority: 1, fallback: "[TO_BE_DEFINED]" },
  },
];

/** Get clauses for a given section and contract type */
export function getClausesForSection(
  section: string,
  contractType: string,
): Clause[] {
  return MOCK_CLAUSES.filter(
    (c) =>
      c.section === section &&
      (c.contract_types.includes(contractType) ||
        c.triggers.some((t) => t.condition === "default")),
  );
}

/** Get all unique variables across a template's clauses */
export function getTemplateVariables(contractType: string): ClauseVariable[] {
  const clauses = MOCK_CLAUSES.filter(
    (c) =>
      c.contract_types.includes(contractType) ||
      c.triggers.some((t) => t.condition === "default"),
  );
  const seen = new Set<string>();
  const vars: ClauseVariable[] = [];
  for (const clause of clauses) {
    for (const v of clause.variables) {
      if (!seen.has(v.field)) {
        seen.add(v.field);
        vars.push(v);
      }
    }
  }
  return vars;
}
