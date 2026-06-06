import { buildSellerPropertyIntelligence } from "@/lib/property/buildSellerPropertyIntelligence";
import { getGoogleAddressContext } from "@/lib/property/googleMaps";
import { getRentCastPropertyFacts } from "@/lib/property/rentcast";
import type {
  GoogleAddressContext,
  PhotoPrepAnalysis,
  PropertyIntelligence,
  RentCastPropertyFacts,
} from "@/lib/property/types";
import { formatSellerAddress } from "@/lib/property/types";
import type { SellerQuizData } from "@/lib/schemas/quiz";

export interface SellerPropertyContext {
  rentCastFacts: RentCastPropertyFacts | null;
  googleLocationContext: GoogleAddressContext | null;
  propertyIntelligence: PropertyIntelligence;
}

export interface PrepareSellerPropertyContextOptions {
  photoPrepAnalysis?: PhotoPrepAnalysis | null;
  propertyAdminNotes?: string | null;
}

/**
 * Enriches seller quiz data with optional RentCast and Google Maps APIs,
 * then builds unified property intelligence for AI report generation.
 */
export async function prepareSellerPropertyContext(
  quizData: SellerQuizData,
  options: PrepareSellerPropertyContextOptions = {}
): Promise<SellerPropertyContext> {
  const address = formatSellerAddress(quizData.propertyAddress);

  const [rentCastFacts, googleLocationContext] = await Promise.all([
    getRentCastPropertyFacts(address),
    getGoogleAddressContext(address),
  ]);

  const propertyIntelligence = buildSellerPropertyIntelligence({
    sellerQuizData: quizData,
    rentCastFacts,
    googleLocationContext,
    photoPrepAnalysis: options.photoPrepAnalysis,
    adminNotes: options.propertyAdminNotes,
  });

  return {
    rentCastFacts,
    googleLocationContext,
    propertyIntelligence,
  };
}

/** Strips internal-only RentCast estimates before any client-facing payload. */
export function stripInternalRentCastEstimates(
  intelligence: PropertyIntelligence
): PropertyIntelligence {
  const rentCastFacts = intelligence.rentCastFacts
    ? { ...intelligence.rentCastFacts, estimatedValue: undefined }
    : null;

  const propertyFacts = { ...intelligence.propertyFacts };
  delete propertyFacts.estimatedValue;

  return {
    ...intelligence,
    rentCastFacts,
    propertyFacts,
  };
}
