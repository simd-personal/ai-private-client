import type { SeoPageContent } from "@/lib/seo/types";
import { formatPageTitle } from "@/lib/seo/metadata";

export const sellFirstOrBuyFirstGuide: SeoPageContent = {
  kind: "guide",
  path: "/guides/sell-first-or-buy-first-orange-county",
  title: formatPageTitle("Sell First or Buy First in Orange County"),
  description:
    "Compare sell-first, buy-first, rent-back, bridge financing, and contingent structures for Orange County move-up homeowners. Planning guide — not lending or legal advice.",
  h1: "Sell First or Buy First in Orange County?",
  intro:
    "Orange County move-up buyers often face the same sequencing question: should you sell your current home before buying the next one, or buy first and sell after? There is no universal answer. The right structure depends on liquidity, timeline, risk tolerance, and whether you can carry two housing payments temporarily.",
  whoThisIsFor: [
    "Orange County homeowners upgrading within or beyond their current city",
    "Buyers who need net proceeds from a sale to fund the next down payment",
    "Households comparing timing risk vs. finding the right next property",
    "Owners who want to understand planning options before calling a lender",
  ],
  considerations: [
    {
      title: "Sell first",
      body: "Selling first can clarify net proceeds and reduce overlap risk, but it may create a gap if your next home is not ready. Temporary housing and moving twice are common planning tradeoffs.",
    },
    {
      title: "Buy first",
      body: "Buying first may help you secure a specific property, but it often requires stronger liquidity or bridge financing. Monthly carry on two properties is a pressure test worth modeling early.",
    },
    {
      title: "Rent-back and short-term flexibility",
      body: "A rent-back arrangement can give the buyer time to find the next home while the seller remains in place temporarily. Terms are negotiable and should be reviewed with licensed professionals.",
    },
    {
      title: "Bridge financing",
      body: "Bridge loans are one way to access equity before a sale closes. Qualification, cost, and timeline vary by lender. Confirm structure and carry with a lender — this guide does not provide lending advice.",
    },
    {
      title: "Contingent offers",
      body: "A sale contingency protects the buyer but may weaken offer strength in competitive submarkets. The tradeoff between certainty and competitiveness should be mapped before you write offers.",
    },
  ],
  tradeoffs: [
    {
      title: "Certainty vs. speed",
      body: "Structures that reduce risk often add time or cost. Move-up plans should align with how much uncertainty your household can absorb.",
    },
    {
      title: "Leverage vs. liquidity",
      body: "Using more debt or bridge products may preserve cash but increases carry. Pressure test monthly obligations before choosing a sequence.",
    },
    {
      title: "Local inventory timing",
      body: "In Newport Beach, Laguna Beach, and Irvine, desirable inventory can move quickly. Sequence planning should reflect how hard it will be to replace your current housing if you sell first.",
    },
  ],
  faqs: [
    {
      question: "What is the safest sequence for most move-up buyers?",
      answer:
        "There is no single safest path. Many households start by estimating net proceeds and modeling carry under both sequences, then confirm lending options with a lender and review the plan with your advisory team.",
    },
    {
      question: "Can I stay in my home after selling?",
      answer:
        "Sometimes, through a rent-back negotiated as part of the sale. Availability and terms depend on the buyer and contract. This is a planning topic to discuss before listing.",
    },
    {
      question: "Does Private Client Property Desk provide bridge loan advice?",
      answer:
        "No. Private Client Property Desk provides licensed California real estate guidance and decision planning. Lending structure should be confirmed with a qualified lender.",
    },
  ],
  cta: {
    label: "Plan My Equity Move Up",
    href: "/equity",
    supportingText:
      "Use the Equity Move Up Plan to estimate proceeds and map sale-to-buy sequencing options.",
  },
  breadcrumbs: [{ label: "Planning Guides", href: "/tools" }, { label: "Sell First or Buy First" }],
  relatedLinks: [
    { label: "Orange County equity move-up guide", href: "/guides/orange-county-equity-move-up" },
    { label: "Equity Move Up tool", href: "/tools/equity-move-up" },
    { label: "Irvine equity move-up", href: "/areas/irvine/equity-move-up" },
  ],
  useArticleSchema: true,
};

export const buyingAfterLiquidityEventGuide: SeoPageContent = {
  kind: "guide",
  path: "/guides/buying-after-a-liquidity-event",
  title: formatPageTitle("Buying California Real Estate After a Liquidity Event"),
  description:
    "How founders and executives can plan a California luxury home purchase after a liquidity event. Purchase price, carry, leverage, lender review, and CPA topics — planning only.",
  h1: "Buying After a Liquidity Event",
  intro:
    "A liquidity event — such as a company sale, IPO window, or major distribution — changes how you think about down payment, reserves, and monthly carry. A California luxury purchase should be modeled as a scenario, not a default reaction to new liquidity.",
  whoThisIsFor: [
    "Founders and executives with recent or expected liquidity",
    "Buyers comparing primary residence vs. second home use",
    "Households balancing a coastal purchase with future venture or business capital needs",
    "High-income buyers who want lender and CPA coordination before touring",
  ],
  considerations: [
    {
      title: "Purchase price vs. reserves",
      body: "Liquidity does not mean every dollar should move into real estate. Many buyers intentionally preserve cash for taxes, future investments, or operating runway after a transaction.",
    },
    {
      title: "Leverage posture",
      body: "Conservative, balanced, and higher-leverage structures each change monthly carry and cash preserved. Pressure test assumptions with a lender before committing to a price band.",
    },
    {
      title: "Monthly carry comfort",
      body: "Luxury coastal carry includes P&I, property tax, insurance, HOA, and maintenance reserves. Compare estimated carry to a comfort band — not just to what a lender may qualify you for.",
    },
    {
      title: "CPA and lender coordination",
      body: "Property use, hold period, and income timing after a liquidity event can affect planning topics. Confirm with a CPA and lender; this guide does not provide tax or lending advice.",
    },
  ],
  tradeoffs: [
    {
      title: "Buy now vs. stage the purchase",
      body: "Market timing is uncertain. Some buyers prefer modeling scenarios first, then acting when carry, structure, and location priorities align.",
    },
    {
      title: "Newport / Laguna premium vs. flexibility",
      body: "Coastal Orange County purchases often require higher carry assumptions. Modeling early helps avoid stretching beyond your stated comfort zone.",
    },
    {
      title: "All-cash vs. financing",
      body: "Cash may simplify closing but reduces optionality. Financing may preserve liquidity but adds carry. This is a personal balance sheet decision to confirm with advisors.",
    },
  ],
  faqs: [
    {
      question: "Should I buy immediately after a liquidity event?",
      answer:
        "Not necessarily. Many buyers benefit from a structured forecast that separates purchase goals from reserve requirements, then reviews the scenario with your advisory team, a lender, and a CPA.",
    },
    {
      question: "Does Private Client Property Desk provide investment advice?",
      answer:
        "No. Private Client Property Desk provides California real estate decision planning and licensed guidance. Investment and tax decisions belong with your financial and tax advisors.",
    },
    {
      question: "Can I model different down payment levels?",
      answer:
        "Yes. The Real Estate Wealth Forecast tool lets you compare leverage, carry, and hold period assumptions as planning scenarios.",
    },
  ],
  cta: {
    label: "Build My Wealth Forecast",
    href: "/wealth-forecast",
    supportingText:
      "Model purchase price, leverage, and monthly carry for your California scenario.",
  },
  breadcrumbs: [{ label: "Planning Guides", href: "/tools" }, { label: "Buying After a Liquidity Event" }],
  relatedLinks: [
    { label: "Wealth Forecast tool", href: "/tools/wealth-forecast" },
    { label: "Luxury home monthly carry", href: "/guides/luxury-home-monthly-carry" },
    { label: "Newport Beach wealth forecast", href: "/areas/newport-beach/wealth-forecast" },
  ],
  useArticleSchema: true,
};

export const orangeCountyEquityMoveUpGuide: SeoPageContent = {
  kind: "guide",
  path: "/guides/orange-county-equity-move-up",
  title: formatPageTitle("Orange County Equity Move-Up Planning Guide"),
  description:
    "Estimate home equity, net proceeds planning range, sale timing, and next purchase strategy for Orange County move-up sellers. Planning guide for California homeowners.",
  h1: "Orange County Equity Move-Up Planning",
  intro:
    "Long-term Orange County homeowners often have meaningful equity — but usable proceeds depend on selling costs, timing, and how the next purchase is structured. Move-up planning starts with an honest equity scenario, not a headline value estimate.",
  whoThisIsFor: [
    "Irvine, Costa Mesa, and coastal Orange County homeowners considering a larger home",
    "Owners comparing same-city move-up vs. Newport or Laguna upgrade paths",
    "Households that need net proceeds clarity before shopping seriously",
    "Seller-buyers coordinating two transactions",
  ],
  considerations: [
    {
      title: "Estimate gross equity",
      body: "Start with your estimated current value minus mortgage balance. This is a planning starting point — not a guaranteed sale price or appraisal outcome.",
    },
    {
      title: "Net proceeds planning range",
      body: "Commissions, transfer costs, prep, and timing gaps reduce deployable equity. A planning range helps you compare down payment options for the next home.",
    },
    {
      title: "Next purchase strategy",
      body: "Your target city, property type, and timeline should align with how much flexibility you need between sale and purchase.",
    },
  ],
  tradeoffs: [
    {
      title: "Stay in Orange County vs. move coastal",
      body: "Coastal upgrades may require more equity and higher carry. Pressure test both paths before assuming a single budget.",
    },
    {
      title: "Renovate vs. relocate",
      body: "Some households compare improving the current home against selling. Equity planning makes that tradeoff clearer.",
    },
    {
      title: "Rate and timing context",
      body: "Mortgage rate environment affects carry on the next purchase. Sequencing and lender review matter even when equity is strong.",
    },
  ],
  faqs: [
    {
      question: "How accurate is an online equity estimate?",
      answer:
        "Online estimates are rough starting points. The Equity Move Up tool organizes your inputs into a planning scenario you can review with your advisory team before making decisions.",
    },
    {
      question: "Do I need to know my exact mortgage payoff?",
      answer:
        "A current balance estimate is enough to start. Confirm payoff and closing figures with your lender as you get closer to a transaction.",
    },
    {
      question: "Can this help if I am moving from Irvine to Newport Beach?",
      answer:
        "Yes. Many move-up plans cross submarkets within Orange County. See the Irvine equity move-up area page for a localized starting point.",
    },
  ],
  cta: {
    label: "Estimate My Equity Move",
    href: "/equity",
    supportingText:
      "Run a private equity scenario with your home details and next-move goals.",
  },
  breadcrumbs: [{ label: "Planning Guides", href: "/tools" }, { label: "Orange County Equity Move-Up" }],
  relatedLinks: [
    { label: "Equity Move Up tool", href: "/tools/equity-move-up" },
    { label: "Sell first or buy first", href: "/guides/sell-first-or-buy-first-orange-county" },
    { label: "Irvine area guide", href: "/areas/irvine" },
  ],
  useArticleSchema: true,
};

export const californiaHomeEquityCapitalGainsGuide: SeoPageContent = {
  kind: "guide",
  path: "/guides/california-home-equity-and-capital-gains",
  title: formatPageTitle("California Home Equity and Capital Gains Planning Topics"),
  description:
    "General planning overview of home equity and primary residence capital gains exclusion topics for California sellers. Not tax advice — confirm with a CPA.",
  h1: "California Home Equity and Capital Gains Planning Topics",
  intro:
    "Home equity and potential capital gains are common concerns for California sellers — especially long-term owners in appreciating markets. This guide outlines general planning topics so you know what to discuss with a CPA. It is not tax advice.",
  whoThisIsFor: [
    "California homeowners who have owned for many years",
    "Sellers comparing net proceeds after potential tax planning topics",
    "Move-up and downsizing households preparing for advisor conversations",
    "Owners who want context before using the Equity Move Up tool",
  ],
  considerations: [
    {
      title: "Gross equity vs. taxable gain",
      body: "Equity reflects value minus debt. Taxable gain is a separate calculation that may consider basis, improvements, and holding period. Confirm with a CPA.",
    },
    {
      title: "Primary residence exclusion (planning topic)",
      body: "Federal rules may allow an exclusion of gain on a primary residence for qualifying sellers, subject to IRS limits and eligibility tests. Eligibility depends on your facts — review with a CPA.",
    },
    {
      title: "Improvements and basis documentation",
      body: "Documented capital improvements may affect basis discussions. Keep records of major upgrades for your CPA review.",
    },
    {
      title: "Timing of sale and next purchase",
      body: "Tax planning is one input in sale timing — not the only one. Lifestyle, liquidity, and next-home goals matter too.",
    },
  ],
  tradeoffs: [
    {
      title: "Selling now vs. waiting",
      body: "Waiting may change equity and tax context, but also delays your next move. Model scenarios rather than assuming one outcome.",
    },
    {
      title: "Partial exclusion questions",
      body: "Non-primary use, rental periods, or mixed use can complicate exclusion eligibility. These are CPA conversations, not online checklist items.",
    },
    {
      title: "California-specific context",
      body: "State tax treatment may differ from federal planning topics. A California CPA should review your complete picture.",
    },
  ],
  faqs: [
    {
      question: "Does Private Client Property Desk provide tax advice?",
      answer:
        "No. Private Client Property Desk provides licensed California real estate guidance and decision planning. Tax questions should go to a qualified CPA.",
    },
    {
      question: "Will the Equity Move Up tool calculate my tax bill?",
      answer:
        "No. It may surface general planning estimates and topics based on your inputs. Confirm all tax figures with a CPA.",
    },
    {
      question: "What is the primary residence exclusion?",
      answer:
        "It is a federal tax planning topic that may allow qualifying homeowners to exclude a portion of capital gain on a primary residence sale, subject to IRS rules and limits. Confirm eligibility with a CPA.",
    },
  ],
  cta: {
    label: "Plan My Equity Scenario",
    href: "/equity",
    supportingText:
      "Organize your equity and next-move inputs into a private planning scenario.",
  },
  breadcrumbs: [{ label: "Planning Guides", href: "/tools" }, { label: "Equity and Capital Gains Topics" }],
  relatedLinks: [
    { label: "Orange County equity move-up", href: "/guides/orange-county-equity-move-up" },
    { label: "Equity Move Up tool", href: "/tools/equity-move-up" },
  ],
  useArticleSchema: true,
};

export const luxuryHomeMonthlyCarryGuide: SeoPageContent = {
  kind: "guide",
  path: "/guides/luxury-home-monthly-carry",
  title: formatPageTitle("Luxury Home Monthly Carry Planning Guide"),
  description:
    "Understand principal and interest, property tax, insurance, HOA, maintenance, and reserve assumptions for California luxury home carry. Planning guide for buyers and founders.",
  h1: "Luxury Home Monthly Carry: What to Plan For",
  intro:
    "Monthly carry is more than the mortgage payment. For California luxury homes — especially in coastal Orange County — buyers should pressure test principal and interest, property taxes, insurance, HOA dues, maintenance, and reserves as a single planning picture.",
  whoThisIsFor: [
    "Buyers modeling Newport Beach, Laguna Beach, or Irvine luxury purchases",
    "Founders comparing carry against post-liquidity reserve goals",
    "Move-up buyers stepping into a higher price tier",
    "Households deciding between financing structures",
  ],
  considerations: [
    {
      title: "Principal and interest",
      body: "P&I depends on loan amount, rate, and term. Rates used in planning tools are assumptions — confirm current pricing with a lender.",
    },
    {
      title: "Property taxes",
      body: "California property tax treatment varies by purchase price, assessed value rules, and local levies. Use planning assumptions and confirm with a tax professional.",
    },
    {
      title: "Insurance and HOA",
      body: "Coastal properties may carry higher insurance assumptions. HOA dues and special assessments can materially affect carry in master-planned communities.",
    },
    {
      title: "Maintenance and reserves",
      body: "Luxury homes often need higher maintenance reserves — landscaping, pool, exterior, and systems. Budgeting reserves reduces surprise after closing.",
    },
  ],
  tradeoffs: [
    {
      title: "Qualification vs. comfort",
      body: "A lender may qualify you above the carry level you actually want to live with. Plan to a comfort band, not just a maximum approval.",
    },
    {
      title: "Fixed vs. variable assumptions",
      body: "Taxes, insurance, and HOA can change over time. Scenario planning helps you discuss buffer with advisors.",
    },
    {
      title: "All-in carry vs. cash preserved",
      body: "Lower carry often means more cash down. Wealth Forecast modeling helps compare those structures side by side.",
    },
  ],
  faqs: [
    {
      question: "What carry should I target for a $4M–$5M coastal home?",
      answer:
        "There is no universal target. Use the Wealth Forecast tool with your price, down payment, and cost assumptions, then confirm lending and reserve needs with a lender.",
    },
    {
      question: "Are planning tool rates guaranteed?",
      answer:
        "No. Rates in forecasting tools are planning assumptions. Confirm live terms with a lender before making offers.",
    },
    {
      question: "Does monthly carry include maintenance?",
      answer:
        "A complete planning view should include maintenance reserves. The Wealth Forecast tool incorporates maintenance rate assumptions you can adjust.",
    },
  ],
  cta: {
    label: "Model My Monthly Carry",
    href: "/wealth-forecast",
    supportingText:
      "Build a private Wealth Forecast with purchase price, leverage, and carry assumptions.",
  },
  breadcrumbs: [{ label: "Planning Guides", href: "/tools" }, { label: "Luxury Home Monthly Carry" }],
  relatedLinks: [
    { label: "Wealth Forecast tool", href: "/tools/wealth-forecast" },
    { label: "Buying after a liquidity event", href: "/guides/buying-after-a-liquidity-event" },
    { label: "Newport Beach wealth forecast", href: "/areas/newport-beach/wealth-forecast" },
  ],
  useArticleSchema: true,
};

export const privateMarketTestingGuide: SeoPageContent = {
  kind: "guide",
  path: "/guides/private-market-testing-before-selling",
  title: formatPageTitle("Private Market Testing Before Selling in California"),
  description:
    "Learn how private market testing, controlled exposure, prep, buyer feedback, and launch timing fit into a California seller strategy. Planning guide for homeowners.",
  h1: "Private Market Testing Before Selling",
  intro:
    "Not every seller wants immediate public exposure. Private market testing is a planning approach that seeks buyer feedback and pricing signal with more control over who knows the home is available — often before a full MLS launch.",
  whoThisIsFor: [
    "California homeowners considering a sale but not ready for public marketing",
    "Sellers who will only move if pricing meets expectations",
    "Owners in privacy-sensitive neighborhoods or buildings",
    "Homeowners comparing prep timelines with market feedback needs",
  ],
  considerations: [
    {
      title: "Controlled exposure",
      body: "Private testing limits visibility while you gather response. This can reduce neighbor and market chatter, but it also limits the buyer pool compared to a broad launch.",
    },
    {
      title: "Prep and presentation",
      body: "Even private outreach benefits from clear presentation. Minor prep, photography, and pricing narrative still shape buyer perception.",
    },
    {
      title: "Buyer feedback loop",
      body: "Early feedback helps calibrate price and condition expectations before committing to a public timeline. Feedback is signal — not a guaranteed sale price.",
    },
    {
      title: "Launch timing",
      body: "Some sellers use private testing to decide whether to list now, prep further, or wait. Your motivation and timeline should drive the decision.",
    },
  ],
  tradeoffs: [
    {
      title: "Privacy vs. maximum exposure",
      body: "More exposure can increase buyer competition in some markets, but it is not always worth the visibility cost for every seller.",
    },
    {
      title: "Price testing vs. anchoring",
      body: "Testing too high may yield silence; testing too low may anchor expectations. your advisory team can help you interpret feedback in local context.",
    },
    {
      title: "Conditional motivation",
      body: "If you are only selling at a target number, private testing may be a better first step than a public listing with frequent price changes.",
    },
  ],
  faqs: [
    {
      question: "Is private market testing the same as an off-market listing?",
      answer:
        "Terms vary by strategy and exposure level. The core idea is controlled buyer outreach before or instead of immediate broad marketing. Review options with your advisory team.",
    },
    {
      question: "Will private testing guarantee my target price?",
      answer:
        "No. It provides planning feedback. Final price depends on buyer demand, terms, and condition at the time of sale.",
    },
    {
      question: "How does this connect to Private Client Property Desk's Seller Strategy tool?",
      answer:
        "The Seller Strategy Plan captures your timeline, condition, and motivation — including whether private testing may fit — and produces a structured scenario to review with your advisory team.",
    },
  ],
  cta: {
    label: "Start My Seller Strategy Plan",
    href: "/seller",
    supportingText:
      "Share your property context and receive a private seller planning scenario.",
  },
  breadcrumbs: [{ label: "Planning Guides", href: "/tools" }, { label: "Private Market Testing" }],
  relatedLinks: [
    { label: "Seller Strategy tool", href: "/tools/seller-strategy" },
    { label: "Costa Mesa seller strategy", href: "/areas/costa-mesa/seller-strategy" },
    { label: "Costa Mesa area guide", href: "/areas/costa-mesa" },
  ],
  useArticleSchema: true,
};

export const guidePages = {
  "sell-first-or-buy-first-orange-county": sellFirstOrBuyFirstGuide,
  "buying-after-a-liquidity-event": buyingAfterLiquidityEventGuide,
  "orange-county-equity-move-up": orangeCountyEquityMoveUpGuide,
  "california-home-equity-and-capital-gains": californiaHomeEquityCapitalGainsGuide,
  "luxury-home-monthly-carry": luxuryHomeMonthlyCarryGuide,
  "private-market-testing-before-selling": privateMarketTestingGuide,
} as const;

export const allGuidePages: SeoPageContent[] = Object.values(guidePages);
