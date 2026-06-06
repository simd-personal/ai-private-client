import type { SeoPageContent, ToolsIndexContent } from "@/lib/seo/types";
import { formatPageTitle } from "@/lib/seo/metadata";

const sharedRelatedGuides = [
  {
    label: "Sell first or buy first in Orange County",
    href: "/guides/sell-first-or-buy-first-orange-county",
  },
  {
    label: "Orange County equity move-up planning",
    href: "/guides/orange-county-equity-move-up",
  },
];

export const toolsIndexPage: ToolsIndexContent = {
  kind: "tools-index",
  path: "/tools",
  title: formatPageTitle("California Real Estate Decision Tools"),
  description:
    "Explore Private Client Property Desk for California buyers, sellers, homeowners, and founders. private client brief, Seller Strategy, Equity Move Up, and Wealth Forecast planning.",
  h1: "California Real Estate Decision Tools",
  intro:
    "Private Client Property Desk helps California buyers, sellers, homeowners, and founders make smarter real estate decisions before they speak with an agent. Each private planning tool turns your goals, timing, and constraints into a structured scenario you can review with your advisory team.",
  tools: [
    {
      title: "Private Client Brief",
      description:
        "Build a California luxury home search strategy around budget, location, property type, timing, and lifestyle priorities.",
      href: "/buyer",
      seoHref: "/tools/home-match",
      cta: "Start private client brief",
    },
    {
      title: "Seller Strategy Plan",
      description:
        "Clarify pricing leverage, presentation, timeline, and whether private market testing should happen before public exposure.",
      href: "/seller",
      seoHref: "/tools/seller-strategy",
      cta: "Start Seller Strategy",
    },
    {
      title: "Equity Move Up Plan",
      description:
        "Estimate gross equity, review a net proceeds planning range, and map a sale-to-buy sequence for your next move.",
      href: "/equity",
      seoHref: "/tools/equity-move-up",
      cta: "Estimate My Equity Move",
    },
    {
      title: "Real Estate Wealth Forecast",
      description:
        "Model purchase price, leverage, monthly carry, hold period assumptions, and CPA or lender topics for a California purchase.",
      href: "/wealth-forecast",
      seoHref: "/tools/wealth-forecast",
      cta: "Build My Forecast",
    },
  ],
  breadcrumbs: [{ label: "Tools" }],
  relatedLinks: [
    { label: "Irvine planning", href: "/areas/irvine" },
    { label: "Newport Beach planning", href: "/areas/newport-beach" },
    { label: "Luxury home monthly carry guide", href: "/guides/luxury-home-monthly-carry" },
  ],
};

export const homeMatchToolPage: SeoPageContent = {
  kind: "tool",
  path: "/tools/home-match",
  title: formatPageTitle("California Luxury Private Client Briefning Tool"),
  description:
    "Plan a California luxury home search with budget, location, property type, timing, and financing context. Private private client brief planning for Orange County and coastal markets.",
  h1: "California Luxury Private Client Briefning",
  intro:
    "The Private Client Brief helps buyers pressure test what they want before touring homes. Instead of scrolling listings, you clarify locations, budget range, property type, timeline, and lifestyle tradeoffs — then receive a structured planning scenario to review with your advisory team.",
  whoThisIsFor: [
    "California buyers comparing coastal and Orange County luxury markets",
    "Move-up buyers narrowing communities before engaging an agent",
    "Relocating professionals who want clarity on budget, timing, and financing readiness",
    "Buyers who value privacy and want a planning-first approach",
  ],
  considerations: [
    {
      title: "Location fit vs. budget room",
      body: "The same budget can support different property types depending on city, HOA structure, and commute priorities. A planning-first approach helps compare communities before you commit to showings.",
    },
    {
      title: "Financing posture and timing",
      body: "Whether you are a cash buyer, pre-approved, or still talking with a lender, timing and offer readiness should align with your search window. The tool captures that context for a more useful scenario.",
    },
    {
      title: "Property type tradeoffs",
      body: "Single-family homes, townhomes, and condos each carry different maintenance, HOA, and resale considerations. Clarifying property type early reduces wasted tours.",
    },
  ],
  tradeoffs: [
    {
      title: "Broad search vs. focused strategy",
      body: "Searching an entire county often creates noise. A focused plan around two or three target areas usually produces better decisions and faster readiness.",
    },
    {
      title: "Newer construction vs. location premium",
      body: "Modern inventory may trade off against walkability, lot size, or school proximity. These are planning tradeoffs, not right-or-wrong answers.",
    },
    {
      title: "Speed vs. preparation",
      body: "A shorter timeline can work when financing and location priorities are clear. Rushing without pressure testing budget and HOA assumptions often leads to rework later.",
    },
  ],
  faqs: [
    {
      question: "Is this a property search or listing tool?",
      answer:
        "No. private client brief is a private planning tool. It helps you organize search criteria and receive a structured scenario — not live MLS inventory or guaranteed availability.",
    },
    {
      question: "Which California markets does this cover?",
      answer:
        "The tool supports California luxury markets including Orange County cities such as Irvine, Newport Beach, Laguna Beach, and Costa Mesa, along with other coastal and urban corridors Private Client Property Desk serves.",
    },
    {
      question: "Do I need to be pre-approved to use private client brief?",
      answer:
        "No. You can start while exploring or talking with a lender. Financing status is one input that helps shape the planning scenario and next steps with your advisory team.",
    },
  ],
  cta: {
    label: "Start My Private Client Brief",
    href: "/buyer",
    supportingText:
      "Answer a short private questionnaire and receive your California private client brief planning scenario.",
  },
  breadcrumbs: [
    { label: "Tools", href: "/tools" },
    { label: "private client brief" },
  ],
  relatedLinks: [
    { label: "Laguna Beach private client brief", href: "/areas/laguna-beach/home-match" },
    { label: "Costa Mesa area guide", href: "/areas/costa-mesa" },
    ...sharedRelatedGuides,
  ],
  useArticleSchema: false,
};

export const sellerStrategyToolPage: SeoPageContent = {
  kind: "tool",
  path: "/tools/seller-strategy",
  title: formatPageTitle("California Seller Strategy Planning Tool"),
  description:
    "Plan a California home sale with pricing leverage, prep, timeline, and private market testing considerations. Seller Strategy tool for Orange County homeowners.",
  h1: "California Seller Strategy Planning",
  intro:
    "The Seller Strategy Plan helps homeowners think through pricing leverage, presentation, and launch timing before going public. It is designed for sellers who want a controlled, planning-first path — especially when the decision to sell is still conditional on the right outcome.",
  whoThisIsFor: [
    "Orange County and coastal California homeowners considering a sale",
    "Sellers who want pricing feedback before broad market exposure",
    "Owners weighing prep investments against timeline pressure",
    "Homeowners comparing private market testing vs. a full public launch",
  ],
  considerations: [
    {
      title: "Pricing leverage and presentation",
      body: "Condition, upgrades, staging, and positioning all influence buyer perception. A seller strategy review helps identify which prep items may matter most for your property type and timeline.",
    },
    {
      title: "Timeline and motivation",
      body: "Some sellers need speed; others need maximum leverage. Clarifying your priority shapes whether early buyer feedback, private testing, or a longer prep window makes sense.",
    },
    {
      title: "Exposure control",
      body: "Not every seller wants neighbors or the market to know they are considering a move. Planning for controlled exposure is a legitimate strategy worth mapping early.",
    },
  ],
  tradeoffs: [
    {
      title: "Launch now vs. prep first",
      body: "Additional prep may strengthen positioning, but it also delays feedback. The right balance depends on your timeline and how competitive your submarket is for your price point.",
    },
    {
      title: "Public listing vs. private market testing",
      body: "Private testing can surface buyer response with less visibility. It is a planning option, not a guarantee of price or timing.",
    },
    {
      title: "Highest price goal vs. certainty",
      body: "Conditional sellers often want proof that the numbers work before committing. That usually means comparing pricing scenarios rather than assuming a single outcome.",
    },
  ],
  faqs: [
    {
      question: "Does this tool give me a home value?",
      answer:
        "No. It helps organize your seller goals and produces a planning scenario. Exact value depends on condition, buyer demand, and terms — topics to review with your advisory team and current market context.",
    },
    {
      question: "What is private market testing?",
      answer:
        "Private market testing is a controlled way to gauge buyer interest before a broad public launch. See our guide on private market testing for a deeper planning overview.",
    },
    {
      question: "Can I use this if I am only considering selling?",
      answer:
        "Yes. Many sellers start with a conditional timeline — for example, only moving if the net outcome meets expectations. The tool is built for that planning stage.",
    },
  ],
  cta: {
    label: "Start My Seller Strategy Plan",
    href: "/seller",
    supportingText:
      "Share your property context privately and receive a structured seller planning scenario.",
  },
  breadcrumbs: [
    { label: "Tools", href: "/tools" },
    { label: "Seller Strategy" },
  ],
  relatedLinks: [
    {
      label: "Private market testing before selling",
      href: "/guides/private-market-testing-before-selling",
    },
    { label: "Costa Mesa seller strategy", href: "/areas/costa-mesa/seller-strategy" },
    { label: "Costa Mesa area guide", href: "/areas/costa-mesa" },
  ],
};

export const equityMoveUpToolPage: SeoPageContent = {
  kind: "tool",
  path: "/tools/equity-move-up",
  title: formatPageTitle("Equity Move Up Planning Tool for California Homeowners"),
  description:
    "Estimate home equity, review a net proceeds planning range, and map sale-to-buy timing for a California move-up. Equity Move Up tool for Orange County homeowners.",
  h1: "Equity Move Up Planning for California Homeowners",
  intro:
    "The Equity Move Up Plan helps homeowners estimate gross equity, understand a net proceeds planning range after typical selling costs, and think through the sequence of selling and buying. It is especially useful when your next purchase depends on how much usable equity you may have.",
  whoThisIsFor: [
    "Long-term Orange County and California homeowners considering a move-up",
    "Owners comparing sale timing with a next purchase in a higher price tier",
    "Households weighing net proceeds against down payment needs for the next home",
    "Sellers who may also be buyers and need a coordinated sequence plan",
  ],
  considerations: [
    {
      title: "Gross equity vs. usable proceeds",
      body: "Estimated value minus mortgage balance is only the starting point. Commissions, closing costs, and timing gaps between sale and purchase all affect what you can actually deploy toward the next home.",
    },
    {
      title: "Sale and purchase sequence",
      body: "Selling first, buying first, or coordinating both requires different risk profiles. Bridge financing, rent-back, and contingency structures are planning topics worth mapping early.",
    },
    {
      title: "Ownership history and planning topics",
      body: "Years owned, improvements, and filing status can affect which CPA planning topics are relevant. The tool surfaces general planning areas — confirm details with a CPA.",
    },
  ],
  tradeoffs: [
    {
      title: "Move now vs. wait for more equity",
      body: "Waiting may increase equity in some scenarios, but it also delays lifestyle goals and can change rate and inventory conditions. This is a planning tradeoff, not a prediction.",
    },
    {
      title: "Maximize next home vs. preserve liquidity",
      body: "Deploying more equity into the next purchase reduces debt but may limit flexibility. Your comfort with monthly carry and reserves should guide the decision.",
    },
    {
      title: "Same-area move-up vs. coastal upgrade",
      body: "Moving within Orange County may be simpler to sequence than upgrading to Newport Beach or Laguna Beach. Budget and timing assumptions should reflect that difference.",
    },
  ],
  faqs: [
    {
      question: "Is the net proceeds number exact?",
      answer:
        "No. The tool provides a planning range based on your inputs and typical selling cost assumptions. Confirm tax, lending, and net proceeds details with a CPA and lender before acting.",
    },
    {
      question: "Can this help if I already know my home value?",
      answer:
        "Yes. You can enter your own estimated current value and mortgage balance to pressure test move-up scenarios rather than relying on a generic estimate.",
    },
    {
      question: "Does this replace a comparative market analysis?",
      answer:
        "No. It is a decision-planning tool. your advisory team can help you review market context and sequencing options alongside your equity scenario.",
    },
  ],
  cta: {
    label: "Estimate My Equity Move",
    href: "/equity",
    supportingText:
      "Enter your home and next-move details to receive a private equity planning scenario.",
  },
  breadcrumbs: [
    { label: "Tools", href: "/tools" },
    { label: "Equity Move Up" },
  ],
  relatedLinks: [
    { label: "Orange County equity move-up guide", href: "/guides/orange-county-equity-move-up" },
    {
      label: "California home equity and capital gains planning",
      href: "/guides/california-home-equity-and-capital-gains",
    },
    { label: "Irvine equity move-up", href: "/areas/irvine/equity-move-up" },
    {
      label: "Sell first or buy first in Orange County",
      href: "/guides/sell-first-or-buy-first-orange-county",
    },
  ],
};

export const wealthForecastToolPage: SeoPageContent = {
  kind: "tool",
  path: "/tools/wealth-forecast",
  title: formatPageTitle("Real Estate Wealth Forecast for California Purchases"),
  description:
    "Model purchase price, leverage, monthly carry, and hold period assumptions for a California luxury home. Wealth Forecast tool for founders and high-income buyers.",
  h1: "Real Estate Wealth Forecast for California Purchases",
  intro:
    "The Real Estate Wealth Forecast helps founders, executives, and high-income buyers pressure test a purchase scenario before committing capital. You model price, down payment, monthly carry, leverage posture, and hold period assumptions — then review planning topics with your advisory team, a lender, and a CPA.",
  whoThisIsFor: [
    "Founders and executives planning a California primary or second home purchase",
    "Buyers comparing leverage strategies after a liquidity event",
    "Households modeling monthly carry comfort for luxury coastal properties",
    "Investors who want scenario planning — not investment advice",
  ],
  considerations: [
    {
      title: "Purchase price and down payment structure",
      body: "Price and down payment drive loan amount, LTV, and cash preserved for other goals. The forecast helps compare balanced leverage against more conservative structures.",
    },
    {
      title: "Monthly carry comfort",
      body: "Principal, interest, taxes, insurance, HOA, and maintenance reserves combine into estimated monthly carry. Comparing that range to your stated comfort band is a core planning step.",
    },
    {
      title: "Hold period and scenario assumptions",
      body: "Conservative, base, and upside appreciation scenarios are planning assumptions — not predictions. They help you discuss structure and timing with advisors.",
    },
  ],
  tradeoffs: [
    {
      title: "Preserve cash vs. lower monthly carry",
      body: "A larger down payment reduces debt service but ties up liquidity. After a liquidity event, many buyers intentionally preserve cash for business or reserve goals.",
    },
    {
      title: "Primary residence vs. investment use",
      body: "Property use affects carry assumptions and which CPA planning topics may be relevant. Confirm tax treatment with a CPA before acting.",
    },
    {
      title: "Coastal premium vs. carry discipline",
      body: "Newport Beach and Laguna Beach purchases often carry higher price and ownership cost assumptions. Modeling carry early reduces surprise during underwriting.",
    },
  ],
  faqs: [
    {
      question: "Is this investment or financial advice?",
      answer:
        "No. The Wealth Forecast is a planning scenario tool. It does not provide investment, tax, or lending advice. Confirm assumptions with a CPA and lender.",
    },
    {
      question: "Can I model a recent liquidity event?",
      answer:
        "Yes. Liquidity situation is an input that helps shape leverage and carry discussions — especially for founders balancing a purchase with future venture capital needs.",
    },
    {
      question: "Does the forecast guarantee appreciation?",
      answer:
        "No. Appreciation paths are labeled planning assumptions. Actual outcomes depend on market conditions, property specifics, and hold period.",
    },
  ],
  cta: {
    label: "Build My Wealth Forecast",
    href: "/wealth-forecast",
    supportingText:
      "Model your California purchase scenario privately and review next steps with your advisory team.",
  },
  breadcrumbs: [
    { label: "Tools", href: "/tools" },
    { label: "Wealth Forecast" },
  ],
  relatedLinks: [
    {
      label: "Buying after a liquidity event",
      href: "/guides/buying-after-a-liquidity-event",
    },
    { label: "Luxury home monthly carry guide", href: "/guides/luxury-home-monthly-carry" },
    { label: "Newport Beach wealth forecast", href: "/areas/newport-beach/wealth-forecast" },
  ],
};

export const toolPages = {
  "home-match": homeMatchToolPage,
  "seller-strategy": sellerStrategyToolPage,
  "equity-move-up": equityMoveUpToolPage,
  "wealth-forecast": wealthForecastToolPage,
} as const;
