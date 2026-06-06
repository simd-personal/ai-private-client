import type { PropertyIntelligence } from "@/lib/property/types";

/** Strips admin-only enrichment detail for seller report AI prompts. */
export function buildPublicPropertyIntelligenceForPrompt(
  intelligence: PropertyIntelligence
): Record<string, unknown> {
  const rentCastForPrompt = intelligence.rentCastFacts
    ? {
        bedrooms: intelligence.rentCastFacts.bedrooms,
        bathrooms: intelligence.rentCastFacts.bathrooms,
        squareFeet: intelligence.rentCastFacts.squareFeet,
        lotSize: intelligence.rentCastFacts.lotSize,
        yearBuilt: intelligence.rentCastFacts.yearBuilt,
        propertyType: intelligence.rentCastFacts.propertyType,
        dataSource: "third_party_property_data",
      }
    : null;

  const propertyFacts = { ...intelligence.propertyFacts };
  delete propertyFacts.estimatedValue;
  for (const key of Object.keys(propertyFacts)) {
    if (key.endsWith("Source")) delete propertyFacts[key];
  }

  const googleForPrompt = intelligence.googleLocationContext
    ? {
        addressUsedForStrategy: intelligence.addressDiscrepancy
          ? intelligence.submittedAddress
          : intelligence.normalizedAddress,
        addressValidationApplied: true,
        addressMatchConfidence: intelligence.addressMatchConfidence,
        locationContext: intelligence.googleLocationContext.locationContext,
        nearbyPlaceCount:
          intelligence.googleLocationContext.nearbyPlaces.length,
      }
    : null;

  return {
    addressForStrategy: intelligence.submittedAddress,
    propertyFacts,
    sellerProvidedFacts: intelligence.sellerProvidedFacts,
    thirdPartyPropertyFacts: rentCastForPrompt,
    addressValidationContext: googleForPrompt,
    upgradeSignals: intelligence.upgradeSignals,
    prepFocusAreas: intelligence.prepFocusAreas,
    buyerObjectionRisks: intelligence.buyerObjectionRisks,
    verificationNotes: intelligence.publicVerificationNotes,
    enrichmentSources: [
      "seller_provided_facts",
      ...(intelligence.rentCastFacts ? ["third_party_property_data"] : []),
      ...(intelligence.googleLocationContext ? ["address_validation"] : []),
    ],
  };
}
