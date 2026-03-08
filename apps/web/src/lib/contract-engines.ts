"use client";

import { apiFetch } from "@/lib/api";
import type {
  ConfidenceTier,
  ExtractorType,
  FieldStatus,
  VaultExtraction,
} from "@/lib/mock-extractions";

export interface EnginePreflightResponse {
  doc_mode: string;
  gate_color: string;
  gate_reasons: string[];
  health_score: {
    raw_score: number;
    calibrated_score: number;
    band: string;
    section_scores?: Record<string, number>;
    gate_penalty?: number;
  };
  contract_classification?: {
    normalized_contract_type?: string;
    expected_schedule_types?: string[];
  };
  metrics: {
    replacement_char_ratio?: number;
    control_char_ratio?: number;
    mojibake_ratio?: number;
  };
}

export interface EngineExtractionCheck {
  code: string;
  status: FieldStatus;
  confidence: number;
  value: string | number | boolean | null;
  reason: string;
  field_key: string;
  evidence_context?: string;
  _evidence_hit_terms?: string[];
}

export interface EngineExtractionResponse {
  results: Record<string, EngineExtractionCheck>;
}

export interface EngineGenerationResponse {
  text: string;
  contract_type: string;
  seed: number;
  form_values: Record<string, unknown>;
  metadata?: Record<string, unknown> | null;
  variation_details?: Record<string, unknown> | null;
}

export interface ContractEngineInput {
  fullText: string;
  pagesData: Array<{
    page: number;
    text: string;
    char_count: number;
    image_coverage_ratio: number;
  }>;
  targetCodes: string[];
}

const DEFAULT_CONTRACT_TEXT = `Distribution Agreement
Legal Name: Sony Music Entertainment Inc.
This Distribution Agreement is entered into as of January 15, 2026 by and between Sony Music Entertainment Inc., a company organized under the laws of New York ("Label"), and BigBooty Records LLC ("Distributor").
The Effective Date is January 15, 2026.
The Territory shall be Worldwide.
This Agreement is exclusive.
The initial term of this Agreement shall be three (3) years.
Distributor shall receive a distribution fee of fifteen percent (15%) of Net Receipts.`;

const TARGET_CODES = [
  "ACCT_LEGAL_NAME",
  "ACCT_STATE_OF_FORMATION",
  "OPP_EFFECTIVE_DATE",
  "OPP_EXCLUSIVITY",
  "OPP_INITIAL_TERM_LENGTH",
  "OPP_TERRITORIES",
  "OPP_JV_DISTRIBUTION_FEE",
] as const;

/** Optional overrides for known codes — prettier field names. */
const FIELD_CONFIG: Record<
  string,
  {
    fieldName: string;
    section?: string;
    extractorType?: ExtractorType;
  }
> = {
  ACCT_LEGAL_NAME: { fieldName: "Licensor Legal Name" },
  ACCT_STATE_OF_FORMATION: { fieldName: "State of Formation" },
  ACCT_TYPE_OF_COMPANY: { fieldName: "Company Type" },
  ACCT_ACCOUNT_TYPE: { fieldName: "Account Type" },
  ACCT_ARTIST_NAME_PKA_OR_DBA: { fieldName: "Artist / DBA Name" },
  OPP_EFFECTIVE_DATE: { fieldName: "Effective Date", section: "Schedule" },
  OPP_EXCLUSIVITY: { fieldName: "Exclusivity" },
  OPP_INITIAL_TERM_LENGTH: { fieldName: "Term Duration", section: "Schedule" },
  OPP_RENEWAL_TERM_LENGTH: { fieldName: "Renewal Term", section: "Schedule" },
  OPP_TERRITORIES: { fieldName: "Territory" },
  OPP_CONTRACT_TYPE: { fieldName: "Contract Type" },
  OPP_FREQUENCY: { fieldName: "Payment Frequency" },
  OPP_JV_DISTRIBUTION_FEE: {
    fieldName: "Distribution Fee",
    section: "Financials",
  },
  FIN_ADVANCE_AMOUNT: { fieldName: "Advance Amount" },
  FIN_ROYALTY_RATE: { fieldName: "Royalty Rate" },
  SCH_DELIVERY_DATE: { fieldName: "Delivery Date" },
  SCH_FIRST_ACCOUNTING: { fieldName: "First Accounting Period" },
};

/** Map code prefix → section name. */
const PREFIX_TO_SECTION: Record<string, string> = {
  ACCT: "Entity Resolution",
  OPP: "Opportunities",
  FIN: "Financials",
  SCH: "Schedule",
  ADDON: "Addons",
};

const SECTION_META = [
  { name: "Entity Resolution", weight: 0.2, sort_order: 1 },
  { name: "Opportunities", weight: 0.25, sort_order: 2 },
  { name: "Schedule", weight: 0.15, sort_order: 3 },
  { name: "Financials", weight: 0.25, sort_order: 4 },
  { name: "Addons", weight: 0.15, sort_order: 5 },
];

/** Derive a human-readable field name from a code like OPP_BACK_CATALOG_TYPE → "Back Catalog Type". */
function codeToFieldName(code: string): string {
  // Strip known prefixes
  const stripped = code.replace(/^(ACCT|OPP|FIN|SCH|ADDON)_/, "");
  return stripped
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/** Derive section from code prefix, with FIELD_CONFIG override. */
function codeToSection(code: string): string {
  const override = FIELD_CONFIG[code]?.section;
  if (override) return override;
  const prefix = code.split("_")[0];
  return PREFIX_TO_SECTION[prefix] ?? "Opportunities";
}

function toConfidenceTier(confidence: number): ConfidenceTier {
  if (confidence >= 0.75) return "HIGH";
  if (confidence >= 0.4) return "MED";
  return "LOW";
}

export function getContractEngineInput(
  vaultId: string,
): ContractEngineInput | null {
  if (!vaultId.startsWith("vault_")) {
    return null;
  }

  return {
    fullText: DEFAULT_CONTRACT_TEXT,
    pagesData: [
      {
        page: 1,
        text: DEFAULT_CONTRACT_TEXT,
        char_count: DEFAULT_CONTRACT_TEXT.length,
        image_coverage_ratio: 0.05,
      },
    ],
    targetCodes: [...TARGET_CODES],
  };
}

function mockPreflightResponse(
  _input: ContractEngineInput,
): EnginePreflightResponse {
  return {
    doc_mode: "digital",
    gate_color: "green",
    gate_reasons: ["Text extraction succeeded", "Contract structure detected"],
    health_score: {
      raw_score: 0.82,
      calibrated_score: 0.82,
      band: "good",
      section_scores: {
        "Entity Resolution": 0.9,
        Schedule: 0.8,
        Financials: 0.75,
      },
      gate_penalty: 0,
    },
    contract_classification: {
      normalized_contract_type: "distribution",
      expected_schedule_types: ["royalty", "advance"],
    },
    metrics: {
      replacement_char_ratio: 0.001,
      control_char_ratio: 0.0,
      mojibake_ratio: 0.0,
    },
  };
}

function mockExtractionResponse(
  input: ContractEngineInput,
): EngineExtractionResponse {
  const text = input.fullText;
  const dateMatch = text.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}/i,
  );
  const percentMatch = text.match(/(\d+(?:\.\d+)?)\s*%/);
  return {
    results: {
      ACCT_LEGAL_NAME: {
        code: "ACCT_LEGAL_NAME",
        status: "pass",
        confidence: 0.88,
        value: "See document",
        reason: "Entity name detected in opening clause",
        field_key: "legal_name",
        evidence_context: text.slice(0, 120),
      },
      OPP_EFFECTIVE_DATE: {
        code: "OPP_EFFECTIVE_DATE",
        status: dateMatch ? "pass" : "review",
        confidence: dateMatch ? 0.91 : 0.45,
        value: dateMatch ? dateMatch[0] : null,
        reason: dateMatch
          ? "Date found in document header"
          : "No clear effective date found",
        field_key: "effective_date",
      },
      OPP_EXCLUSIVITY: {
        code: "OPP_EXCLUSIVITY",
        status: "pass",
        confidence: 0.79,
        value: text.toLowerCase().includes("exclusive")
          ? "Exclusive"
          : "Non-exclusive",
        reason: "Exclusivity term found in agreement scope",
        field_key: "exclusivity",
      },
      OPP_TERRITORIES: {
        code: "OPP_TERRITORIES",
        status: "pass",
        confidence: 0.85,
        value: text.toLowerCase().includes("worldwide")
          ? "Worldwide"
          : "United States",
        reason: "Territory clause detected",
        field_key: "territory",
      },
      OPP_JV_DISTRIBUTION_FEE: {
        code: "OPP_JV_DISTRIBUTION_FEE",
        status: percentMatch ? "pass" : "review",
        confidence: percentMatch ? 0.83 : 0.35,
        value: percentMatch ? `${percentMatch[1]}%` : null,
        reason: percentMatch
          ? "Percentage rate found"
          : "No distribution fee percentage found",
        field_key: "distribution_fee",
      },
    },
  };
}

export async function runPreflightEngine(
  input: ContractEngineInput,
): Promise<EnginePreflightResponse> {
  try {
    return await apiFetch<EnginePreflightResponse>(
      "/api/v1/engines/preflight/run",
      {
        method: "POST",
        body: JSON.stringify({ pages_data: input.pagesData }),
      },
    );
  } catch (err) {
    console.warn("[engines] Preflight API failed, using mock fallback:", err);
    return mockPreflightResponse(input);
  }
}

export async function runExtractionEngine(
  input: ContractEngineInput,
): Promise<EngineExtractionResponse> {
  try {
    return await apiFetch<EngineExtractionResponse>(
      "/api/v1/engines/extraction/run",
      {
        method: "POST",
        body: JSON.stringify({
          full_text: input.fullText,
          target_codes: input.targetCodes,
          call_site: "web_demo",
        }),
      },
    );
  } catch (err) {
    console.warn("[engines] Extraction API failed, using mock fallback:", err);
    return mockExtractionResponse(input);
  }
}

export async function runGenerationEngine(body: {
  contractType: string;
  formValues: Record<string, unknown>;
  includeMetadata?: boolean;
  useFakeData?: boolean;
  seed?: number;
}): Promise<EngineGenerationResponse> {
  return apiFetch<EngineGenerationResponse>("/api/v1/engines/generation/run", {
    method: "POST",
    body: JSON.stringify({
      contract_type: body.contractType,
      form_values: body.formValues,
      include_metadata: body.includeMetadata ?? false,
      use_fake_data: body.useFakeData ?? false,
      seed: body.seed ?? 42,
    }),
  });
}

export function transformExtractionResults(
  vaultId: string,
  results: Record<string, EngineExtractionCheck>,
): VaultExtraction {
  const VALID_EXTRACTOR_TYPES = new Set<ExtractorType>([
    "boolean",
    "split",
    "picklist",
    "date",
    "pattern",
    "text",
    "entity",
  ]);

  const fields = Object.entries(results).map(([code, check], index) => {
    const config = FIELD_CONFIG[code];
    const confidence = Number(check.confidence ?? 0);
    const rawType =
      (check as unknown as Record<string, unknown>).extraction_type ??
      config?.extractorType ??
      "text";
    const extractorType: ExtractorType = VALID_EXTRACTOR_TYPES.has(
      rawType as ExtractorType,
    )
      ? (rawType as ExtractorType)
      : "text";

    return {
      id: `engine_${code}_${index}`,
      field_name: config?.fieldName ?? codeToFieldName(code),
      extracted_value:
        check.value === null || typeof check.value === "undefined"
          ? "--"
          : String(check.value),
      status: check.status ?? "review",
      confidence,
      confidence_tier: toConfidenceTier(confidence),
      tier: (confidence >= 0.75 ? 1 : 2) as 1 | 2,
      section: codeToSection(code),
      extractor_type: extractorType,
      anchor_matched: check._evidence_hit_terms?.[0] ?? check.field_key ?? code,
      evidence_context: check.evidence_context ?? check.reason ?? "",
    };
  });

  // Build sections — use SECTION_META for known sections, add dynamic ones for any extras
  const knownSectionNames = new Set(SECTION_META.map((s) => s.name));
  const dynamicSections: typeof SECTION_META = [];
  for (const field of fields) {
    if (!knownSectionNames.has(field.section)) {
      knownSectionNames.add(field.section);
      dynamicSections.push({
        name: field.section,
        weight: 0.1,
        sort_order: SECTION_META.length + dynamicSections.length + 1,
      });
    }
  }

  const allSections = [...SECTION_META, ...dynamicSections];

  return {
    vault_id: vaultId,
    sections: allSections
      .map((section) => ({
        ...section,
        fields: fields.filter((field) => field.section === section.name),
      }))
      .filter((section) => section.fields.length > 0),
  };
}
