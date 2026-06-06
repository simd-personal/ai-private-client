import type { DataRoomItem, DocumentSummary } from "@/lib/schemas/decision-layer";

const CAUTION =
  "This is an AI-generated document summary for advisor review only. It is not legal, tax, lending, investment, appraisal, or valuation advice.";

function guessDocumentType(
  fileName: string | null,
  mimeType: string | null,
  category: string
): string {
  const lower = (fileName ?? "").toLowerCase();
  if (lower.includes("trust") || category.includes("Legal")) return "Trust / entity document";
  if (lower.includes("mortgage") || category.includes("Lending"))
    return "Mortgage / lending document";
  if (lower.includes("tax") || category.includes("Tax")) return "Tax-related document";
  if (lower.includes("insurance") || category.includes("Insurance"))
    return "Insurance document";
  if (mimeType?.startsWith("image/")) return "Image document";
  if (mimeType === "application/pdf") return "PDF document";
  if (mimeType?.includes("spreadsheet") || lower.endsWith(".xlsx"))
    return "Spreadsheet document";
  if (mimeType?.includes("word") || lower.endsWith(".docx"))
    return "Word document";
  return "Planning document";
}

function planningTopicsForCategory(category: string): string[] {
  if (category.includes("Tax")) {
    return ["Tax planning topic to verify with CPA", "Basis and reporting context"];
  }
  if (category.includes("Legal")) {
    return ["Entity / ownership topic for attorney review", "Title or trust structure topic"];
  }
  if (category.includes("Lending")) {
    return ["Financing topic for lender/private banker review", "Liquidity planning topic"];
  }
  if (category.includes("Property")) {
    return ["Property facts to verify with licensed agent", "Transaction timing topic"];
  }
  return ["Private client planning topic for advisor review"];
}

export interface GenerateDocumentSummaryInput {
  item: Pick<
    DataRoomItem,
    | "item_name"
    | "category"
    | "description"
    | "advisor_owner"
    | "file_name"
    | "file_mime_type"
    | "requested_from"
  >;
  leadContext?: {
    objective?: string;
    clientName?: string;
  };
}

export function generateDocumentSummary(
  input: GenerateDocumentSummaryInput
): DocumentSummary {
  const { item } = input;
  const fileName = item.file_name ?? "uploaded document";
  const docType = guessDocumentType(
    item.file_name,
    item.file_mime_type,
    item.category
  );
  const advisor = item.advisor_owner ?? "Advisor";

  const extractedFacts = [
    `Document uploaded: ${fileName}`,
    `Data room category: ${item.category}`,
    item.description
      ? `Checklist context: ${item.description}`
      : "Checklist context available in data room item.",
    "Automated text extraction is not yet enabled — advisor review is recommended.",
  ];

  const planningTopics = planningTopicsForCategory(item.category);

  const advisorReview = [
    `${advisor} review recommended`,
    item.requested_from
      ? `Requested from: ${item.requested_from}`
      : "Confirm document source and completeness",
    "Verify document matches the planning topic before relying on any details",
  ];

  const missingItems = [
    "Full document text has not been extracted automatically",
    "Confirm document date, parties, and scope with the appropriate advisor",
    "Confirm whether additional related documents are needed",
  ];

  if (input.leadContext?.objective) {
    extractedFacts.push(
      `Lead planning objective for context: ${input.leadContext.objective}`
    );
  }

  return {
    summaryTitle: `${item.item_name} — document summary for review`,
    documentTypeGuess: docType,
    extractedFactsForReview: extractedFacts,
    possiblePlanningTopics: planningTopics,
    advisorReviewNeeded: advisorReview,
    missingOrUnclearItems: missingItems,
    cautionNote: CAUTION,
  };
}
