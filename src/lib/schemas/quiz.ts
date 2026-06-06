import { z } from "zod";
import {
  BUDGET_RANGES,
  DESIRED_LOCATIONS,
  EQUITY_BIGGEST_CONCERNS,
  EQUITY_FILING_STATUSES,
  EQUITY_NEXT_MOVE_GOALS,
  EQUITY_TIMELINES,
  WEALTH_CARRY_COMFORT,
  WEALTH_DOWN_PAYMENT_TYPES,
  WEALTH_LEVERAGE_PREFERENCES,
  WEALTH_LIQUIDITY_SITUATIONS,
  WEALTH_PROPERTY_USES,
  WEALTH_RISK_PROFILES,
  WEALTH_TIMELINES,
  FINANCING_STATUSES,
  LIFESTYLE_PRIORITIES,
  PROPERTY_CONDITIONS,
  PROPERTY_TYPES,
  SELLER_HOA_STATUSES,
  SELLER_POOL_STATUSES,
  SELLER_PRIORITIES,
  SELLING_TIMELINES,
  TIMELINES,
} from "@/lib/constants";
import { contactSchema } from "@/lib/schemas/contact";
import {
  CURRENT_VALUE_SOURCES,
  VALUE_ESTIMATE_CHOICES,
} from "@/lib/property/equityPropertyTypes";

export const buyerQuizSchema = z.object({
  leadType: z.literal("buyer"),
  desiredLocations: z
    .array(z.enum(DESIRED_LOCATIONS))
    .min(1, "Select at least one location"),
  budgetRange: z.enum(BUDGET_RANGES),
  propertyType: z.enum(PROPERTY_TYPES),
  lifestylePriorities: z
    .array(z.enum(LIFESTYLE_PRIORITIES))
    .min(1, "Select at least one priority"),
  timeline: z.enum(TIMELINES),
  financingStatus: z.enum(FINANCING_STATUSES),
  freeText: z.string().optional(),
  contact: contactSchema,
  isCaliforniaBuyer: z.literal(true).optional(),
});

export const sellerAddressSchema = z.object({
  street: z.string().min(1, "Street address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(2, "State is required"),
  zip: z.string().min(5, "ZIP code is required"),
});

function optionalSellerNumber(
  constraints: { min?: number; max?: number; int?: boolean } = {}
) {
  let schema = constraints.int ? z.number().int() : z.number();
  if (constraints.min != null) schema = schema.min(constraints.min);
  if (constraints.max != null) schema = schema.max(constraints.max);
  return z.preprocess(
    (value) =>
      value === null || value === "" || value === undefined ? undefined : value,
    schema.optional()
  );
}

export const sellerQuizSchema = z.object({
  leadType: z.literal("seller"),
  propertyAddress: sellerAddressSchema,
  estimatedValueRange: z.enum(BUDGET_RANGES),
  propertyCondition: z.enum(PROPERTY_CONDITIONS),
  sellingTimeline: z.enum(SELLING_TIMELINES),
  sellerPriority: z.enum(SELLER_PRIORITIES),
  upgrades: z.string().optional(),
  freeText: z.string().optional(),
  contact: contactSchema,
  bedrooms: optionalSellerNumber({ min: 0, max: 20, int: true }),
  bathrooms: optionalSellerNumber({ min: 0, max: 20 }),
  squareFeet: optionalSellerNumber({ min: 1 }),
  lotSize: optionalSellerNumber({ min: 1 }),
  yearBuilt: optionalSellerNumber({
    min: 1800,
    max: new Date().getFullYear() + 2,
    int: true,
  }),
  propertyType: z.enum(PROPERTY_TYPES).optional(),
  hoaStatus: z.enum(SELLER_HOA_STATUSES).optional(),
  poolStatus: z.enum(SELLER_POOL_STATUSES).optional(),
  garageSpaces: optionalSellerNumber({ min: 0, max: 20, int: true }),
  notableFeatures: z.string().optional(),
  recentUpgrades: z.string().optional(),
  buyerObjectionConcerns: z.string().optional(),
  viewType: z.string().optional(),
  waterProximity: z.string().optional(),
  gatedOrPrivateAccess: z.enum(SELLER_HOA_STATUSES).optional(),
  poolSpa: z.enum(SELLER_POOL_STATUSES).optional(),
  guestHouse: z.enum(SELLER_HOA_STATUSES).optional(),
  elevator: z.enum(SELLER_HOA_STATUSES).optional(),
  outdoorKitchen: z.enum(SELLER_HOA_STATUSES).optional(),
  wineRoom: z.enum(SELLER_HOA_STATUSES).optional(),
  theater: z.enum(SELLER_HOA_STATUSES).optional(),
  gym: z.enum(SELLER_HOA_STATUSES).optional(),
  smartHome: z.enum(SELLER_HOA_STATUSES).optional(),
  architectDesigner: z.string().optional(),
  photoPrivacyPreference: z.string().optional(),
  showingPrivacyPreference: z.string().optional(),
  priorListingHistory: z.string().optional(),
});

function optionalEquityNumber(
  constraints: { min?: number; max?: number } = {}
) {
  let schema = z.number();
  if (constraints.min != null) schema = schema.min(constraints.min);
  if (constraints.max != null) schema = schema.max(constraints.max);
  return z.preprocess(
    (value) => (value === null || value === "" ? undefined : value),
    schema.optional()
  );
}

export const equityQuizBaseSchema = z.object({
  leadType: z.literal("equity"),
  propertyAddress: sellerAddressSchema,
  currentHomeCity: z.string().min(1).optional(),
  currentHomeState: z.string().min(2).default("California"),
  yearPurchased: z.preprocess(
    (value) =>
      typeof value === "number" && Number.isFinite(value)
        ? Math.trunc(value)
        : value,
    z
      .number()
      .int()
      .min(1950)
      .max(new Date().getFullYear(), "Enter a valid purchase year")
  ),
  originalPurchasePrice: z.number().positive("Enter a valid purchase price"),
  estimatedCurrentValue: optionalEquityNumber({ min: 1 }),
  currentValueSource: z.enum(CURRENT_VALUE_SOURCES).default("unknown"),
  valueEstimateChoice: z.enum(VALUE_ESTIMATE_CHOICES).optional(),
  mortgageBalance: z.number().min(0, "Mortgage balance cannot be negative"),
  estimatedInterestRate: optionalEquityNumber({ min: 0, max: 20 }),
  estimatedImprovements: optionalEquityNumber({ min: 0 }),
  filingStatus: z.enum(EQUITY_FILING_STATUSES),
  nextMoveGoal: z.enum(EQUITY_NEXT_MOVE_GOALS),
  desiredNextLocation: z.string().optional(),
  timeline: z.enum(EQUITY_TIMELINES),
  biggestConcern: z.enum(EQUITY_BIGGEST_CONCERNS),
  freeText: z.string().optional(),
  contact: contactSchema,
});

export function withEquityHomeCity<T extends z.infer<typeof equityQuizBaseSchema>>(
  data: T
): T & { currentHomeCity: string } {
  return {
    ...data,
    currentHomeCity: data.currentHomeCity ?? data.propertyAddress.city.trim(),
  };
}

export const equityQuizSchema = equityQuizBaseSchema.transform(withEquityHomeCity);

function optionalWealthNumber(
  constraints: { min?: number; max?: number } = {}
) {
  let schema = z.number();
  if (constraints.min != null) schema = schema.min(constraints.min);
  if (constraints.max != null) schema = schema.max(constraints.max);
  return z.preprocess(
    (value) => (value === null || value === "" ? undefined : value),
    schema.optional()
  );
}

export const wealthForecastQuizSchema = z
  .object({
    leadType: z.literal("wealth_forecast"),
    purchasePrice: z.number().positive("Enter a valid purchase price"),
    downPaymentType: z.enum(WEALTH_DOWN_PAYMENT_TYPES),
    downPaymentPercent: optionalWealthNumber({ min: 1, max: 100 }),
    downPaymentAmount: optionalWealthNumber({ min: 0 }),
    propertyUse: z.enum(WEALTH_PROPERTY_USES),
    targetLocations: z
      .array(z.string().min(1))
      .min(1, "Select at least one target location"),
    holdPeriodYears: z.union([
      z.literal(3),
      z.literal(5),
      z.literal(7),
      z.literal(10),
      z.literal(12),
    ]),
    interestRate: optionalWealthNumber({ min: 0, max: 20 }),
    propertyTaxRate: z.number().min(0).max(5).default(1.1),
    insuranceAnnual: optionalWealthNumber({ min: 0 }),
    hoaMonthly: optionalWealthNumber({ min: 0 }),
    maintenanceRate: z.number().min(0).max(5).default(1),
    liquiditySituation: z.enum(WEALTH_LIQUIDITY_SITUATIONS),
    leveragePreference: z.enum(WEALTH_LEVERAGE_PREFERENCES),
    riskProfile: z.enum(WEALTH_RISK_PROFILES),
    monthlyCarryComfort: z.enum(WEALTH_CARRY_COMFORT),
    timeline: z.enum(WEALTH_TIMELINES),
    freeText: z.string().optional(),
    contact: contactSchema,
  })
  .superRefine((data, ctx) => {
    if (data.downPaymentType === "percent" && data.downPaymentPercent == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter a down payment percentage",
        path: ["downPaymentPercent"],
      });
    }
    if (data.downPaymentType === "amount" && data.downPaymentAmount == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter a down payment amount",
        path: ["downPaymentAmount"],
      });
    }
    if (
      data.downPaymentType === "amount" &&
      data.downPaymentAmount != null &&
      data.downPaymentAmount > data.purchasePrice
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Down payment cannot exceed purchase price",
        path: ["downPaymentAmount"],
      });
    }
  });

export const leadSubmissionSchema = z.discriminatedUnion("leadType", [
  buyerQuizSchema,
  sellerQuizSchema,
  equityQuizSchema,
  wealthForecastQuizSchema,
]);

export type BuyerQuizData = z.infer<typeof buyerQuizSchema>;
export type SellerQuizData = z.infer<typeof sellerQuizSchema>;
export type EquityQuizData = z.infer<typeof equityQuizSchema>;
export type WealthQuizData = z.infer<typeof wealthForecastQuizSchema>;
export type LeadSubmission = z.infer<typeof leadSubmissionSchema>;

export function isCaliforniaProperty(state: string): boolean {
  const normalized = state.trim().toUpperCase();
  return normalized === "CA" || normalized === "CALIFORNIA";
}
