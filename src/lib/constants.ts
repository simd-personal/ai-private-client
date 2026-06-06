export const CALIFORNIA_LUXURY_MARKETS = [
  "Newport Beach",
  "Costa Mesa",
  "Laguna Beach",
  "Irvine",
  "Huntington Beach",
  "Manhattan Beach",
  "Palos Verdes",
  "Los Angeles",
] as const;

export const DESIRED_LOCATIONS = [
  ...CALIFORNIA_LUXURY_MARKETS,
  "Other California city",
] as const;

export const BUDGET_RANGES = [
  "under 1000000",
  "1000000 to 1500000",
  "1500000 to 2500000",
  "2500000 to 5000000",
  "5000000 to 10000000",
  "10000000 plus",
] as const;

export const PROPERTY_TYPES = [
  "single family",
  "condo",
  "townhome",
  "estate",
  "new construction",
  "investment property",
  "second home",
] as const;

export const LIFESTYLE_PRIORITIES = [
  "ocean access",
  "privacy",
  "walkability",
  "new construction",
  "views",
  "large lot",
  "gated community",
  "architecture",
  "commute",
  "investment upside",
] as const;

export const TIMELINES = [
  "now",
  "30 to 90 days",
  "3 to 6 months",
  "6 to 12 months",
  "just exploring",
] as const;

export const FINANCING_STATUSES = [
  "cash buyer",
  "pre approved",
  "talking to lender",
  "needs lender referral",
  "just exploring",
] as const;

export const PROPERTY_CONDITIONS = [
  "needs work",
  "average",
  "updated",
  "luxury renovated",
  "new construction",
] as const;

export const SELLING_TIMELINES = [
  "now",
  "30 to 90 days",
  "3 to 6 months",
  "6 to 12 months",
  "testing the market",
] as const;

export const SELLER_PRIORITIES = [
  "highest price",
  "privacy",
  "speed",
  "relocation",
  "off market sale",
  "market testing",
] as const;

export const SELLER_HOA_STATUSES = ["yes", "no", "unknown"] as const;

export const SELLER_POOL_STATUSES = ["yes", "no", "unknown"] as const;

export const SELLER_HOA_LABELS: Record<
  (typeof SELLER_HOA_STATUSES)[number],
  string
> = {
  yes: "HOA applies",
  no: "No HOA",
  unknown: "Not sure",
};

export const SELLER_POOL_LABELS: Record<
  (typeof SELLER_POOL_STATUSES)[number],
  string
> = {
  yes: "Pool",
  no: "No pool",
  unknown: "Not sure",
};

/** Reused for optional luxury amenity toggles on seller quiz. */
export const SELLER_LUXURY_AMENITY_STATUSES = SELLER_HOA_STATUSES;

export const SELLER_LUXURY_AMENITY_LABELS = SELLER_HOA_LABELS;

export const CONTACT_METHODS = ["email", "phone", "text"] as const;

export const LEAD_STATUSES = [
  "new",
  "contacted",
  "booked",
  "closed",
  "not qualified",
] as const;

export const LEAD_PIPELINE_STATUSES = [
  "new",
  "contacted",
  "appointment_scheduled",
  "listing_appointment",
  "buyer_consultation",
  "active_client",
  "under_contract",
  "closed",
  "lost",
] as const;

export type LeadPipelineStatus = (typeof LEAD_PIPELINE_STATUSES)[number];

export const LEAD_PIPELINE_STATUS_LABELS: Record<LeadPipelineStatus, string> = {
  new: "New",
  contacted: "Contacted",
  appointment_scheduled: "Appointment scheduled",
  listing_appointment: "Listing appointment",
  buyer_consultation: "Buyer consultation",
  active_client: "Active client",
  under_contract: "Under contract",
  closed: "Closed",
  lost: "Lost",
};

export const LEAD_COMMENT_TYPES = [
  "note",
  "call",
  "sms",
  "email",
  "meeting",
  "status_change",
  "system",
] as const;

export type LeadCommentType = (typeof LEAD_COMMENT_TYPES)[number];

/** Comment types an agent can manually create from the composer. */
export const LEAD_COMMENT_COMPOSER_TYPES = [
  "note",
  "call",
  "sms",
  "email",
  "meeting",
] as const;

/** Statuses considered "appointments" for the pipeline summary. */
export const APPOINTMENT_PIPELINE_STATUSES = [
  "appointment_scheduled",
  "listing_appointment",
  "buyer_consultation",
] as const;

/** Statuses considered part of the active pipeline (excludes lost/closed). */
export const ACTIVE_PIPELINE_STATUSES = [
  "appointment_scheduled",
  "listing_appointment",
  "buyer_consultation",
  "active_client",
  "under_contract",
] as const;

export const AI_DISCLAIMER =
  "This private brief is for planning and coordination purposes only. It is not legal, tax, lending, investment, appraisal, or valuation advice. Tax topics should be reviewed with a CPA, legal and entity topics with an attorney, lending topics with a lender or private banker, and real estate execution topics with a licensed agent.";

export const FOOTER_DISCLOSURE =
  "Private Client Property Desk is an AI-powered planning and coordination layer for complex real estate decisions. AI-generated guidance is for general informational purposes only and does not replace licensed professional advice.";

export const BUDGET_LABELS: Record<(typeof BUDGET_RANGES)[number], string> = {
  "under 1000000": "Under $1M",
  "1000000 to 1500000": "$1M – $1.5M",
  "1500000 to 2500000": "$1.5M – $2.5M",
  "2500000 to 5000000": "$2.5M – $5M",
  "5000000 to 10000000": "$5M – $10M",
  "10000000 plus": "$10M+",
};

export const TIMELINE_LABELS: Record<(typeof TIMELINES)[number], string> = {
  now: "Ready now",
  "30 to 90 days": "30–90 days",
  "3 to 6 months": "3–6 months",
  "6 to 12 months": "6–12 months",
  "just exploring": "Just exploring",
};

export const EQUITY_FILING_STATUSES = ["single", "married_or_joint"] as const;

export const EQUITY_NEXT_MOVE_GOALS = [
  "upsize",
  "downsize",
  "relocate within California",
  "buy second home",
  "sell and wait",
  "just exploring",
] as const;

export const EQUITY_TIMELINES = [
  "now",
  "30 to 90 days",
  "3 to 6 months",
  "6 to 12 months",
  "12 plus months",
  "just exploring",
] as const;

export const EQUITY_BIGGEST_CONCERNS = [
  "losing low mortgage rate",
  "capital gains taxes",
  "finding next home",
  "monthly payment",
  "timing sale and purchase",
  "privacy",
  "uncertain home value",
] as const;

export const EQUITY_FILING_LABELS: Record<
  (typeof EQUITY_FILING_STATUSES)[number],
  string
> = {
  single: "Single filer",
  married_or_joint: "Married / joint filer",
};

export const EQUITY_GOAL_LABELS: Record<
  (typeof EQUITY_NEXT_MOVE_GOALS)[number],
  string
> = {
  upsize: "Upsize",
  downsize: "Downsize",
  "relocate within California": "Relocate within California",
  "buy second home": "Buy a second home",
  "sell and wait": "Sell and wait",
  "just exploring": "Just exploring",
};

export const EQUITY_TIMELINE_LABELS: Record<
  (typeof EQUITY_TIMELINES)[number],
  string
> = {
  now: "Ready now",
  "30 to 90 days": "30–90 days",
  "3 to 6 months": "3–6 months",
  "6 to 12 months": "6–12 months",
  "12 plus months": "12+ months",
  "just exploring": "Just exploring",
};

export const EQUITY_CONCERN_LABELS: Record<
  (typeof EQUITY_BIGGEST_CONCERNS)[number],
  string
> = {
  "losing low mortgage rate": "Losing a low mortgage rate",
  "capital gains taxes": "Capital gains taxes",
  "finding next home": "Finding the next home",
  "monthly payment": "Monthly payment on the next home",
  "timing sale and purchase": "Timing the sale and purchase",
  privacy: "Privacy during the transition",
  "uncertain home value": "Uncertain home value",
};

export const EQUITY_DISCLAIMER =
  "This is an estimate based on the numbers you provided. Market strategy should be reviewed with a licensed agent, and tax topics with a CPA. This is not tax advice.";

export const WEALTH_DOWN_PAYMENT_TYPES = ["percent", "amount", "cash"] as const;

export const WEALTH_PROPERTY_USES = [
  "primary_residence",
  "second_home",
  "investment_property",
  "mixed_use",
  "not_sure",
] as const;

export const WEALTH_HOLD_PERIODS = [3, 5, 7, 10, 12] as const;

export const WEALTH_LIQUIDITY_SITUATIONS = [
  "business_growth",
  "recent_exit",
  "future_exit",
  "high_income_equity_comp",
  "reallocating_investments",
  "just_exploring",
] as const;

export const WEALTH_LEVERAGE_PREFERENCES = [
  "preserve_cash",
  "balanced_leverage",
  "aggressive_leverage",
  "prefer_cash",
  "not_sure",
] as const;

export const WEALTH_RISK_PROFILES = [
  "conservative",
  "balanced",
  "upside_oriented",
  "show_all",
] as const;

export const WEALTH_CARRY_COMFORT = [
  "under_10k",
  "10k_20k",
  "20k_40k",
  "40k_plus",
  "not_sure",
] as const;

export const WEALTH_TIMELINES = [
  "now",
  "30_to_90_days",
  "3_to_6_months",
  "6_to_12_months",
  "12_plus_months",
  "just_exploring",
] as const;

export const WEALTH_DISCLAIMER =
  "This forecast is a planning scenario based on the assumptions you provided. It is not financial, tax, legal, lending, or investment advice. Property strategy should be reviewed with a licensed agent; tax and financing details with a CPA, attorney, or lender.";

export const WEALTH_PROPERTY_USE_LABELS: Record<
  (typeof WEALTH_PROPERTY_USES)[number],
  string
> = {
  primary_residence: "Primary residence",
  second_home: "Second home",
  investment_property: "Investment property",
  mixed_use: "Mixed use",
  not_sure: "Not sure yet",
};

export const WEALTH_LIQUIDITY_LABELS: Record<
  (typeof WEALTH_LIQUIDITY_SITUATIONS)[number],
  string
> = {
  business_growth: "Business growth / reinvestment",
  recent_exit: "Recent liquidity event",
  future_exit: "Future liquidity event",
  high_income_equity_comp: "High income / equity comp",
  reallocating_investments: "Reallocating investments",
  just_exploring: "Just exploring",
};

export const WEALTH_LEVERAGE_LABELS: Record<
  (typeof WEALTH_LEVERAGE_PREFERENCES)[number],
  string
> = {
  preserve_cash: "Preserve cash",
  balanced_leverage: "Balanced leverage",
  aggressive_leverage: "Aggressive leverage",
  prefer_cash: "Prefer cash purchase",
  not_sure: "Not sure",
};

export const WEALTH_TIMELINE_LABELS: Record<
  (typeof WEALTH_TIMELINES)[number],
  string
> = {
  now: "Ready now",
  "30_to_90_days": "30–90 days",
  "3_to_6_months": "3–6 months",
  "6_to_12_months": "6–12 months",
  "12_plus_months": "12+ months",
  just_exploring: "Just exploring",
};

export const WEALTH_CARRY_LABELS: Record<
  (typeof WEALTH_CARRY_COMFORT)[number],
  string
> = {
  under_10k: "Under $10k / month",
  "10k_20k": "$10k–$20k / month",
  "20k_40k": "$20k–$40k / month",
  "40k_plus": "$40k+ / month",
  not_sure: "Not sure",
};
