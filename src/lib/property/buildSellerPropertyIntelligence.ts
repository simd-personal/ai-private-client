import { GENERIC_ADDRESS_VERIFICATION_PROMPT } from "@/lib/property/addressNormalization";
import { buildRentCastMismatches, GENERIC_RENTCAST_MISMATCH_PROMPT } from "@/lib/property/rentCastMismatches";
import type {
  GoogleAddressContext,
  PhotoPrepAnalysis,
  PropertyIntelligence,
  RentCastMismatch,
  RentCastPropertyFacts,
  SellerProvidedPropertyFacts,
} from "@/lib/property/types";
import { formatSellerAddress } from "@/lib/property/types";
import {
  isPremiumSellerValue,
} from "@/lib/seller/seller-tier";
import type { SellerQuizData } from "@/lib/schemas/quiz";

export interface BuildSellerPropertyIntelligenceInput {
  sellerQuizData: SellerQuizData;
  rentCastFacts?: RentCastPropertyFacts | null;
  googleLocationContext?: GoogleAddressContext | null;
  photoPrepAnalysis?: PhotoPrepAnalysis | null;
  adminNotes?: string | null;
}

function extractSellerProvidedFacts(
  data: SellerQuizData
): SellerProvidedPropertyFacts {
  return {
    bedrooms: data.bedrooms,
    bathrooms: data.bathrooms,
    squareFeet: data.squareFeet,
    lotSize: data.lotSize,
    yearBuilt: data.yearBuilt,
    propertyType: data.propertyType,
    hoaStatus: data.hoaStatus,
    poolStatus: data.poolStatus,
    garageSpaces: data.garageSpaces,
    notableFeatures: data.notableFeatures?.trim() || undefined,
    recentUpgrades:
      data.recentUpgrades?.trim() || data.upgrades?.trim() || undefined,
    buyerObjectionConcerns: data.buyerObjectionConcerns?.trim() || undefined,
    viewType: data.viewType?.trim() || undefined,
    waterProximity: data.waterProximity?.trim() || undefined,
    gatedOrPrivateAccess: data.gatedOrPrivateAccess,
    poolSpa: data.poolSpa ?? data.poolStatus,
    guestHouse: data.guestHouse,
    elevator: data.elevator,
    outdoorKitchen: data.outdoorKitchen,
    wineRoom: data.wineRoom,
    theater: data.theater,
    gym: data.gym,
    smartHome: data.smartHome,
    architectDesigner: data.architectDesigner?.trim() || undefined,
    photoPrivacyPreference: data.photoPrivacyPreference?.trim() || undefined,
    showingPrivacyPreference:
      data.showingPrivacyPreference?.trim() || undefined,
    priorListingHistory: data.priorListingHistory?.trim() || undefined,
  };
}

function pickFact(
  seller?: string | number,
  rentcast?: string | number,
  preferSeller = true
): { value?: string | number; source?: string } {
  if (preferSeller && seller != null && seller !== "") {
    return { value: seller, source: "seller" };
  }
  if (rentcast != null && rentcast !== "") {
    return { value: rentcast, source: "rentcast" };
  }
  if (!preferSeller && seller != null && seller !== "") {
    return { value: seller, source: "seller" };
  }
  return {};
}

function buildPropertyFacts(
  seller: SellerProvidedPropertyFacts,
  rentCast: RentCastPropertyFacts | null
): Record<string, string | number> {
  const facts: Record<string, string | number> = {};
  const rc = rentCast ?? undefined;

  const entries: Array<[string, ReturnType<typeof pickFact>]> = [
    ["bedrooms", pickFact(seller.bedrooms, rc?.bedrooms)],
    ["bathrooms", pickFact(seller.bathrooms, rc?.bathrooms)],
    ["squareFeet", pickFact(seller.squareFeet, rc?.squareFeet)],
    ["lotSize", pickFact(seller.lotSize, rc?.lotSize)],
    ["yearBuilt", pickFact(seller.yearBuilt, rc?.yearBuilt)],
    ["propertyType", pickFact(seller.propertyType, rc?.propertyType)],
    ["hoaStatus", pickFact(seller.hoaStatus, undefined)],
    ["poolStatus", pickFact(seller.poolStatus, undefined)],
    ["garageSpaces", pickFact(seller.garageSpaces, undefined)],
  ];

  for (const [key, picked] of entries) {
    if (picked.value != null) {
      facts[key] = picked.value;
      if (picked.source) facts[`${key}Source`] = picked.source;
    }
  }

  if (rc?.lastSaleDate) facts.lastSaleDate = rc.lastSaleDate;
  if (rc?.lastSalePrice != null) facts.lastSalePrice = rc.lastSalePrice;
  if (rc?.assessedValue != null) facts.assessedValue = rc.assessedValue;
  if (rc?.rentEstimate != null) facts.rentEstimate = rc.rentEstimate;

  return facts;
}

function buildUpgradeSignals(
  seller: SellerProvidedPropertyFacts,
  data: SellerQuizData
): string[] {
  const signals: string[] = [];
  if (seller.recentUpgrades) signals.push(seller.recentUpgrades);
  if (data.upgrades?.trim() && data.upgrades !== seller.recentUpgrades) {
    signals.push(data.upgrades.trim());
  }
  if (seller.notableFeatures) signals.push(`Notable: ${seller.notableFeatures}`);
  if (
    data.propertyCondition === "luxury renovated" ||
    data.propertyCondition === "updated" ||
    data.propertyCondition === "new construction"
  ) {
    signals.push(`Condition reported as ${data.propertyCondition}`);
  }
  return [...new Set(signals)];
}

function buildPrepFocusAreas(
  seller: SellerProvidedPropertyFacts,
  data: SellerQuizData,
  photoPrep?: PhotoPrepAnalysis | null
): string[] {
  const areas: string[] = [];

  if (data.propertyCondition === "needs work") {
    areas.push("Address visible wear or dated finishes before photography");
  }
  if (seller.poolStatus === "yes") {
    areas.push("Pool presentation and safety signage for showings");
  }
  if (seller.hoaStatus === "yes") {
    areas.push("HOA docs, fee clarity, and rule summaries for buyer packets");
  }
  if (seller.garageSpaces != null && seller.garageSpaces > 0) {
    areas.push("Garage organization and storage presentation");
  }
  if (photoPrep?.focusAreas?.length) {
    areas.push(...photoPrep.focusAreas);
  }

  return [...new Set(areas)];
}

function buildBuyerObjectionRisks(
  seller: SellerProvidedPropertyFacts,
  data: SellerQuizData
): string[] {
  const risks: string[] = [];

  if (seller.buyerObjectionConcerns) {
    risks.push(seller.buyerObjectionConcerns);
  }
  if (data.freeText?.trim()) {
    risks.push(`Seller noted: ${data.freeText.trim()}`);
  }
  if (seller.hoaStatus === "yes") {
    risks.push("HOA fees and restrictions may affect buyer pool");
  }
  if (data.propertyCondition === "needs work") {
    risks.push("Condition may invite price negotiation or inspection credits");
  }
  if (data.sellerPriority === "highest price") {
    risks.push("Price-sensitive buyers may compare to newer inventory");
  }

  return [...new Set(risks)];
}

function premiumMissingPrompt(topic: string): string {
  return `The first review should verify ${topic} with the seller before shaping pricing, presentation, and showing protocol.`;
}

function standardMissingPrompt(topic: string): string {
  return `The first review should verify ${topic} with the seller as part of the property narrative and prep plan.`;
}

function hasLuxuryField(
  seller: SellerProvidedPropertyFacts,
  key: keyof SellerProvidedPropertyFacts
): boolean {
  const value = seller[key];
  return value != null && value !== "" && value !== "unknown";
}

function buildMissingDataQuestions(
  seller: SellerProvidedPropertyFacts,
  propertyFacts: Record<string, string | number>,
  data: SellerQuizData
): string[] {
  const missing: string[] = [];
  const isPremium = isPremiumSellerValue(data.estimatedValueRange);
  const prompt = isPremium ? premiumMissingPrompt : standardMissingPrompt;

  const checks: Array<[string, string]> = [
    ["bedrooms", "bedroom count"],
    ["bathrooms", "bathroom count"],
    ["squareFeet", "living area square footage"],
    ["lotSize", "lot size"],
    ["yearBuilt", "year built"],
    ["propertyType", "property type"],
    ["hoaStatus", "HOA status"],
    ["poolStatus", "pool and spa details"],
    ["garageSpaces", "garage capacity"],
  ];

  for (const [key, label] of checks) {
    if (key === "garageSpaces") {
      if (propertyFacts.garageSpaces == null && seller.garageSpaces == null) {
        missing.push(prompt(label));
      }
      continue;
    }
    if (propertyFacts[key] == null && !(key === "poolStatus" && seller.poolSpa)) {
      missing.push(prompt(label));
    }
  }

  if (!seller.recentUpgrades && !seller.notableFeatures) {
    missing.push(
      prompt("recent upgrades and the feature inventory buyers will compare first")
    );
  }

  if (isPremium) {
    const luxuryChecks: Array<[keyof SellerProvidedPropertyFacts, string]> = [
      ["viewType", "view type and orientation"],
      ["waterProximity", "water proximity and coastal context"],
      ["gatedOrPrivateAccess", "gated or private access"],
      ["poolSpa", "pool and spa configuration"],
      ["guestHouse", "guest house or secondary dwelling"],
      ["elevator", "elevator access"],
      ["outdoorKitchen", "outdoor kitchen and exterior entertaining"],
      ["wineRoom", "wine room or cellar"],
      ["theater", "theater or media room"],
      ["gym", "gym or wellness space"],
      ["smartHome", "smart home systems"],
      ["architectDesigner", "architect or designer involvement"],
      ["photoPrivacyPreference", "photo distribution restrictions"],
      ["showingPrivacyPreference", "showing privacy requirements"],
      ["priorListingHistory", "prior listing or marketing history"],
    ];

    for (const [key, label] of luxuryChecks) {
      if (!hasLuxuryField(seller, key)) {
        missing.push(prompt(label));
      }
    }
  }

  return [...new Set(missing)];
}

function buildDataSources(
  seller: SellerProvidedPropertyFacts,
  rentCast: RentCastPropertyFacts | null,
  google: GoogleAddressContext | null,
  adminNotes?: string | null
): string[] {
  const sources = new Set<string>(["seller_quiz"]);
  if (Object.values(seller).some((v) => v != null && v !== "")) {
    sources.add("seller_provided_details");
  }
  if (rentCast) sources.add("rentcast");
  if (google) sources.add("google_maps_api");
  if (adminNotes?.trim()) sources.add("admin_notes");
  return [...sources];
}

function buildPublicVerificationNotes(
  missingDataQuestions: string[],
  addressDiscrepancy: boolean,
  rentCastMismatches: RentCastMismatch[]
): string[] {
  const notes = [...missingDataQuestions];
  if (addressDiscrepancy) {
    notes.push(GENERIC_ADDRESS_VERIFICATION_PROMPT);
  }
  if (rentCastMismatches.length > 0) {
    notes.push(GENERIC_RENTCAST_MISMATCH_PROMPT);
  }
  return [...new Set(notes)];
}

function appendAdminEnrichmentNotes(
  missing: string[],
  google: GoogleAddressContext | null,
  mismatches: RentCastMismatch[]
): string[] {
  const admin = [...missing];
  if (google?.addressDiscrepancy) {
    admin.push(
      `Address validation mismatch: submitted "${google.submittedAddress}" vs Google normalized "${google.normalizedAddress}"`
    );
  }
  for (const mismatch of mismatches) {
    admin.push(
      `RentCast mismatch (${mismatch.label}): seller provided ${mismatch.sellerValue} vs RentCast ${mismatch.rentCastValue}`
    );
  }
  return [...new Set(admin)];
}

/**
 * Merges seller quiz answers with optional API enrichment into a single
 * property intelligence object for report generation and admin review.
 */
export function buildSellerPropertyIntelligence(
  input: BuildSellerPropertyIntelligenceInput
): PropertyIntelligence {
  const { sellerQuizData, rentCastFacts, googleLocationContext, photoPrepAnalysis } =
    input;
  const sellerProvidedFacts = extractSellerProvidedFacts(sellerQuizData);
  const rentCast = rentCastFacts ?? null;
  const google = googleLocationContext ?? null;
  const propertyFacts = buildPropertyFacts(sellerProvidedFacts, rentCast);
  const submittedAddress =
    google?.submittedAddress ??
    formatSellerAddress(sellerQuizData.propertyAddress);
  const normalizedAddress =
    google?.normalizedAddress ?? submittedAddress;
  const addressMatchConfidence = google?.addressMatchConfidence ?? "high";
  const addressDiscrepancy = google?.addressDiscrepancy ?? false;
  const rentCastMismatches = buildRentCastMismatches(sellerProvidedFacts, rentCast);

  const upgradeSignals = buildUpgradeSignals(sellerProvidedFacts, sellerQuizData);
  const prepFocusAreas = buildPrepFocusAreas(
    sellerProvidedFacts,
    sellerQuizData,
    photoPrepAnalysis
  );
  const buyerObjectionRisks = buildBuyerObjectionRisks(
    sellerProvidedFacts,
    sellerQuizData
  );
  const baseMissingDataQuestions = buildMissingDataQuestions(
    sellerProvidedFacts,
    propertyFacts,
    sellerQuizData
  );
  const missingDataQuestions = appendAdminEnrichmentNotes(
    baseMissingDataQuestions,
    google,
    rentCastMismatches
  );
  const publicVerificationNotes = buildPublicVerificationNotes(
    baseMissingDataQuestions,
    addressDiscrepancy,
    rentCastMismatches
  );

  if (input.adminNotes?.trim()) {
    buyerObjectionRisks.push(
      `Admin note for strategy: ${input.adminNotes.trim()}`
    );
  }

  return {
    normalizedAddress,
    submittedAddress,
    addressMatchConfidence,
    addressDiscrepancy,
    propertyFacts,
    sellerProvidedFacts,
    rentCastFacts: rentCast,
    rentCastMismatches,
    googleLocationContext: google,
    upgradeSignals,
    prepFocusAreas,
    buyerObjectionRisks,
    missingDataQuestions,
    publicVerificationNotes,
    dataSources: buildDataSources(
      sellerProvidedFacts,
      rentCast,
      google,
      input.adminNotes
    ),
  };
}
