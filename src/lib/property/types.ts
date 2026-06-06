import type { SellerQuizData } from "@/lib/schemas/quiz";

export interface SellerAddressParts {
  street: string;
  city: string;
  state: string;
  zip: string;
}

export interface RentCastPropertyFacts {
  bedrooms?: number;
  bathrooms?: number;
  squareFeet?: number;
  lotSize?: number;
  yearBuilt?: number;
  propertyType?: string;
  lastSaleDate?: string;
  lastSalePrice?: number;
  assessedValue?: number;
  estimatedValue?: number;
  rentEstimate?: number;
  dataSource: "rentcast";
}

export interface GoogleNearbyPlace {
  name: string;
  category: string;
}

export type AddressMatchConfidence = "high" | "low";

export interface GoogleAddressContext {
  normalizedAddress: string;
  submittedAddress: string;
  addressMatchConfidence: AddressMatchConfidence;
  addressDiscrepancy: boolean;
  lat: number;
  lng: number;
  nearbyPlaces: GoogleNearbyPlace[];
  locationContext: string;
  dataSource: "google_maps_api";
}

export interface RentCastMismatch {
  field: "bedrooms" | "bathrooms" | "squareFeet" | "yearBuilt";
  label: string;
  sellerValue: string;
  rentCastValue: string;
}

export interface PhotoPrepAnalysis {
  focusAreas?: string[];
  summary?: string;
}

export interface SellerProvidedPropertyFacts {
  bedrooms?: number;
  bathrooms?: number;
  squareFeet?: number;
  lotSize?: number;
  yearBuilt?: number;
  propertyType?: string;
  hoaStatus?: string;
  poolStatus?: string;
  garageSpaces?: number;
  notableFeatures?: string;
  recentUpgrades?: string;
  buyerObjectionConcerns?: string;
  viewType?: string;
  waterProximity?: string;
  gatedOrPrivateAccess?: string;
  poolSpa?: string;
  guestHouse?: string;
  elevator?: string;
  outdoorKitchen?: string;
  wineRoom?: string;
  theater?: string;
  gym?: string;
  smartHome?: string;
  architectDesigner?: string;
  photoPrivacyPreference?: string;
  showingPrivacyPreference?: string;
  priorListingHistory?: string;
}

export interface PropertyIntelligence {
  normalizedAddress: string;
  submittedAddress: string;
  addressMatchConfidence: AddressMatchConfidence;
  addressDiscrepancy: boolean;
  propertyFacts: Record<string, string | number>;
  sellerProvidedFacts: SellerProvidedPropertyFacts;
  rentCastFacts: RentCastPropertyFacts | null;
  rentCastMismatches: RentCastMismatch[];
  googleLocationContext: GoogleAddressContext | null;
  upgradeSignals: string[];
  prepFocusAreas: string[];
  buyerObjectionRisks: string[];
  /** Admin-only: detailed verification prompts. */
  missingDataQuestions: string[];
  /** Public AI prompt: softened verification language. */
  publicVerificationNotes: string[];
  dataSources: string[];
}

export type SellerQuizDataWithIntelligence = SellerQuizData & {
  propertyIntelligence?: PropertyIntelligence;
  propertyAdminNotes?: string;
};

export function formatSellerAddress(
  address: SellerAddressParts
): string {
  return `${address.street.trim()}, ${address.city.trim()}, ${address.state.trim()} ${address.zip.trim()}`;
}
