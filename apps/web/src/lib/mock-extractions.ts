/**
 * Mock extraction data for dev preview.
 * Simulates output from the 7-extractor pipeline + preflight engine.
 */

export type FieldStatus = "pass" | "review" | "fail" | "missing" | "suggested";
export type ConfidenceTier = "HIGH" | "MED" | "LOW";
export type ExtractorType =
  | "boolean"
  | "split"
  | "picklist"
  | "date"
  | "pattern"
  | "text"
  | "entity";

export interface ExtractionField {
  id: string;
  field_name: string;
  extracted_value: string;
  status: FieldStatus;
  confidence: number;
  confidence_tier: ConfidenceTier;
  tier: 1 | 2;
  section: string;
  extractor_type: ExtractorType;
  anchor_matched: string;
  evidence_context: string;
}

export interface VaultExtraction {
  vault_id: string;
  sections: {
    name: string;
    weight: number;
    sort_order: number;
    fields: ExtractionField[];
  }[];
}

function confidenceTier(c: number): ConfidenceTier {
  if (c >= 0.75) return "HIGH";
  if (c >= 0.4) return "MED";
  return "LOW";
}

const SONY_FIELDS: ExtractionField[] = [
  {
    id: "f_001",
    field_name: "Licensor Legal Name",
    extracted_value: "Sony Music Entertainment Inc.",
    status: "pass",
    confidence: 0.95,
    confidence_tier: confidenceTier(0.95),
    tier: 1,
    section: "Entity Resolution",
    extractor_type: "entity",
    anchor_matched: "LICENSOR:",
    evidence_context:
      'This Agreement is entered into by and between <mark>Sony Music Entertainment Inc.</mark> ("Licensor") and BigBooty Records LLC ("Licensee").',
  },
  {
    id: "f_002",
    field_name: "Licensee Legal Name",
    extracted_value: "BigBooty Records LLC",
    status: "pass",
    confidence: 0.93,
    confidence_tier: confidenceTier(0.93),
    tier: 1,
    section: "Entity Resolution",
    extractor_type: "entity",
    anchor_matched: "LICENSEE:",
    evidence_context:
      'Sony Music Entertainment Inc. ("Licensor") and <mark>BigBooty Records LLC</mark> ("Licensee"), collectively the "Parties".',
  },
  {
    id: "f_003",
    field_name: "Licensor Address",
    extracted_value: "25 Madison Avenue, New York, NY 10010",
    status: "pass",
    confidence: 0.78,
    confidence_tier: confidenceTier(0.78),
    tier: 2,
    section: "Entity Resolution",
    extractor_type: "text",
    anchor_matched: "principal place of business",
    evidence_context:
      "with its <mark>principal place of business at 25 Madison Avenue, New York, NY 10010</mark>.",
  },
  {
    id: "f_004",
    field_name: "Contract Type",
    extracted_value: "Distribution",
    status: "pass",
    confidence: 0.98,
    confidence_tier: confidenceTier(0.98),
    tier: 1,
    section: "Opportunities",
    extractor_type: "picklist",
    anchor_matched: "DISTRIBUTION AGREEMENT",
    evidence_context:
      'This <mark>DISTRIBUTION AGREEMENT</mark> (the "Agreement") is effective as of the date set forth below.',
  },
  {
    id: "f_005",
    field_name: "Territory",
    extracted_value: "Worldwide",
    status: "pass",
    confidence: 0.91,
    confidence_tier: confidenceTier(0.91),
    tier: 1,
    section: "Opportunities",
    extractor_type: "picklist",
    anchor_matched: "Territory",
    evidence_context:
      'The territory covered by this Agreement shall be <mark>Worldwide</mark> (the "Territory").',
  },
  {
    id: "f_006",
    field_name: "Exclusivity",
    extracted_value: "Exclusive",
    status: "review",
    confidence: 0.62,
    confidence_tier: confidenceTier(0.62),
    tier: 1,
    section: "Opportunities",
    extractor_type: "boolean",
    anchor_matched: "exclusive",
    evidence_context:
      "Licensor hereby grants Licensee an <mark>exclusive</mark> right to distribute... subject to carve-outs in Exhibit B.",
  },
  {
    id: "f_007",
    field_name: "Sub-licensing Permitted",
    extracted_value: "No",
    status: "pass",
    confidence: 0.85,
    confidence_tier: confidenceTier(0.85),
    tier: 2,
    section: "Opportunities",
    extractor_type: "boolean",
    anchor_matched: "sub-licens",
    evidence_context:
      "Licensee shall <mark>not sub-license</mark> any rights granted hereunder without prior written consent.",
  },
  {
    id: "f_008",
    field_name: "Effective Date",
    extracted_value: "2026-01-15",
    status: "pass",
    confidence: 0.97,
    confidence_tier: confidenceTier(0.97),
    tier: 1,
    section: "Schedule",
    extractor_type: "date",
    anchor_matched: "Effective Date",
    evidence_context:
      'This Agreement shall commence on the <mark>Effective Date of January 15, 2026</mark> (the "Effective Date").',
  },
  {
    id: "f_009",
    field_name: "Term Duration",
    extracted_value: "3 years",
    status: "pass",
    confidence: 0.88,
    confidence_tier: confidenceTier(0.88),
    tier: 1,
    section: "Schedule",
    extractor_type: "pattern",
    anchor_matched: "term of",
    evidence_context:
      "The initial <mark>term of this Agreement shall be three (3) years</mark> from the Effective Date.",
  },
  {
    id: "f_010",
    field_name: "Auto-Renewal",
    extracted_value: "Yes — 1-year periods",
    status: "review",
    confidence: 0.55,
    confidence_tier: confidenceTier(0.55),
    tier: 2,
    section: "Schedule",
    extractor_type: "boolean",
    anchor_matched: "auto-renew",
    evidence_context:
      "This Agreement shall <mark>automatically renew for successive one (1) year periods</mark> unless either party provides 90 days written notice.",
  },
  {
    id: "f_011",
    field_name: "Distribution Fee",
    extracted_value: "15%",
    status: "pass",
    confidence: 0.94,
    confidence_tier: confidenceTier(0.94),
    tier: 1,
    section: "Financials",
    extractor_type: "pattern",
    anchor_matched: "distribution fee",
    evidence_context:
      "Licensee shall receive a <mark>distribution fee of fifteen percent (15%)</mark> of Net Receipts.",
  },
  {
    id: "f_012",
    field_name: "Minimum Guarantee",
    extracted_value: "$500,000",
    status: "pass",
    confidence: 0.89,
    confidence_tier: confidenceTier(0.89),
    tier: 1,
    section: "Financials",
    extractor_type: "pattern",
    anchor_matched: "minimum guarantee",
    evidence_context:
      "Licensee shall pay a non-refundable <mark>minimum guarantee of Five Hundred Thousand Dollars ($500,000)</mark> upon execution.",
  },
  {
    id: "f_013",
    field_name: "Payment Terms",
    extracted_value: "Net 60",
    status: "review",
    confidence: 0.48,
    confidence_tier: confidenceTier(0.48),
    tier: 1,
    section: "Financials",
    extractor_type: "text",
    anchor_matched: "payment",
    evidence_context:
      "Royalty statements and <mark>payments shall be rendered within sixty (60) days</mark> following the end of each accounting period.",
  },
  {
    id: "f_014",
    field_name: "Audit Rights",
    extracted_value: "Yes — annual",
    status: "pass",
    confidence: 0.82,
    confidence_tier: confidenceTier(0.82),
    tier: 2,
    section: "Financials",
    extractor_type: "boolean",
    anchor_matched: "audit",
    evidence_context:
      "Licensor shall have the right to <mark>audit Licensee's books once per calendar year</mark> upon 30 days' notice.",
  },
  {
    id: "f_015",
    field_name: "Governing Law",
    extracted_value: "New York",
    status: "pass",
    confidence: 0.96,
    confidence_tier: confidenceTier(0.96),
    tier: 1,
    section: "Addons",
    extractor_type: "picklist",
    anchor_matched: "governed by the laws",
    evidence_context:
      "This Agreement shall be <mark>governed by the laws of the State of New York</mark> without regard to conflicts of law.",
  },
  {
    id: "f_016",
    field_name: "Dispute Resolution",
    extracted_value: "Arbitration — AAA",
    status: "suggested",
    confidence: 0.35,
    confidence_tier: confidenceTier(0.35),
    tier: 2,
    section: "Addons",
    extractor_type: "text",
    anchor_matched: "dispute",
    evidence_context:
      "Any <mark>dispute arising under this Agreement shall be resolved by binding arbitration</mark> administered by the American Arbitration Association.",
  },
  {
    id: "f_017",
    field_name: "Force Majeure",
    extracted_value: "--",
    status: "missing",
    confidence: 0,
    confidence_tier: confidenceTier(0),
    tier: 2,
    section: "Addons",
    extractor_type: "text",
    anchor_matched: "",
    evidence_context: "",
  },
];

const SECTIONS = [
  { name: "Entity Resolution", weight: 0.2, sort_order: 1 },
  { name: "Opportunities", weight: 0.25, sort_order: 2 },
  { name: "Schedule", weight: 0.15, sort_order: 3 },
  { name: "Financials", weight: 0.25, sort_order: 4 },
  { name: "Addons", weight: 0.15, sort_order: 5 },
];

function buildExtraction(
  vaultId: string,
  fields: ExtractionField[],
): VaultExtraction {
  return {
    vault_id: vaultId,
    sections: SECTIONS.map((s) => ({
      ...s,
      fields: fields.filter((f) => f.section === s.name),
    })),
  };
}

export const MOCK_EXTRACTIONS: Record<string, VaultExtraction> = {
  vault_004: buildExtraction("vault_004", SONY_FIELDS),
  vault_006: buildExtraction("vault_006", SONY_FIELDS),
};
