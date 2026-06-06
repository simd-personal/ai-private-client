import type { SeoPageContent } from "@/lib/seo/types";
import { formatPageTitle } from "@/lib/seo/metadata";

export const irvineAreaPage: SeoPageContent = {
  kind: "area",
  path: "/areas/irvine",
  title: formatPageTitle("Irvine California Real Estate Planning Guide"),
  description:
    "Plan Irvine luxury home buying and equity move-up decisions with Private Client Property Desk. Communities, timing, and move-up planning for Orange County homeowners.",
  h1: "Irvine Real Estate Decision Planning",
  intro:
    "Irvine attracts buyers and long-term owners who value master-planned communities, strong schools, and Orange County convenience. Whether you are searching for a townhome near the Spectrum or estimating equity for a coastal move-up, planning before showings saves time and reduces costly tradeoff mistakes.",
  whoThisIsFor: [
    "Irvine buyers comparing townhomes, condos, and single-family options",
    "Long-term Irvine owners planning a move-up within Orange County",
    "Professionals relocating to Irvine with a defined budget and timeline",
    "Households weighing Irvine communities against coastal alternatives",
  ],
  considerations: [
    {
      title: "Community and HOA structure",
      body: "Irvine inventory spans multiple villages with different HOA profiles, Mello-Roos contexts, and walkability. Location and monthly cost assumptions should be compared early.",
    },
    {
      title: "Move-up equity scenarios",
      body: "Many Irvine owners have held through multiple appreciation cycles. Estimating gross equity and a net proceeds planning range helps before targeting Newport Beach or other coastal markets.",
    },
    {
      title: "Buyer timing and financing readiness",
      body: "Competitive submarkets reward buyers who know property type, budget band, and financing posture before touring.",
    },
  ],
  tradeoffs: [
    {
      title: "Irvine stay vs. coastal upgrade",
      body: "Staying in Irvine may offer more space per dollar; coastal upgrades trade carry and price for lifestyle. Neither path is inherently better — planning clarifies fit.",
    },
    {
      title: "Newer village vs. established location",
      body: "Newer construction may reduce near-term maintenance but can carry different fee structures. Compare total ownership cost, not just list price.",
    },
  ],
  faqs: [
    {
      question: "Which Private Client Property Desk tools fit Irvine buyers?",
      answer:
        "Start with the Private Client Brief for search strategy. If you already own in Irvine and are considering a move-up, use the Equity Move Up Plan.",
    },
    {
      question: "Does Private Client Property Desk serve all Irvine villages?",
      answer:
        "Private Client Property Desk supports California luxury real estate inquiries across Irvine and broader Orange County markets. Share your target communities in the planning tool.",
    },
  ],
  cta: {
    label: "Start Irvine Private Client Briefning",
    href: "/buyer",
    supportingText: "Build a private Irvine-focused private client brief scenario.",
  },
  breadcrumbs: [{ label: "Areas" }, { label: "Irvine" }],
  relatedLinks: [
    { label: "Irvine equity move-up", href: "/areas/irvine/equity-move-up" },
    { label: "private client brief tool", href: "/tools/home-match" },
    { label: "Orange County equity guide", href: "/guides/orange-county-equity-move-up" },
  ],
};

export const costaMesaAreaPage: SeoPageContent = {
  kind: "area",
  path: "/areas/costa-mesa",
  title: formatPageTitle("Costa Mesa California Real Estate Planning Guide"),
  description:
    "Plan Costa Mesa home buying and seller strategy with Private Client Property Desk. Pricing leverage, prep, and buyer search planning for Orange County homeowners.",
  h1: "Costa Mesa Real Estate Decision Planning",
  intro:
    "Costa Mesa combines central Orange County access with diverse housing stock — from established neighborhoods to newer infill. Buyers and sellers benefit from planning around condition, pricing leverage, and whether private market testing makes sense before public exposure.",
  whoThisIsFor: [
    "Costa Mesa homeowners considering a conditional sale",
    "Buyers targeting Costa Mesa for central OC location",
    "Owners comparing prep investment against timeline goals",
    "Seller-buyers coordinating Costa Mesa sale with a next purchase",
  ],
  considerations: [
    {
      title: "Seller pricing and presentation",
      body: "Updated homes in Costa Mesa may support stronger positioning, but buyer expectations vary by pocket and price tier. Seller strategy planning clarifies prep and launch options.",
    },
    {
      title: "Buyer search focus",
      body: "Costa Mesa buyers should define property type and commute priorities early — the city spans distinct neighborhoods with different feel and price bands.",
    },
    {
      title: "Private testing vs. public launch",
      body: "Sellers who need pricing signal without full visibility may explore private market testing as a first step.",
    },
  ],
  tradeoffs: [
    {
      title: "Costa Mesa vs. coastal premium",
      body: "Costa Mesa may offer relative value compared to Newport or Laguna, but lifestyle priorities differ. Compare carry and commute alongside price.",
    },
    {
      title: "Prep spend vs. speed",
      body: "Additional upgrades may help positioning but delay feedback. Align prep with your selling motivation.",
    },
  ],
  faqs: [
    {
      question: "Which tool should Costa Mesa sellers use first?",
      answer:
        "Start with the Seller Strategy Plan. For localized context, see the Costa Mesa seller strategy area page.",
    },
    {
      question: "Can buyers use private client brief for Costa Mesa?",
      answer:
        "Yes. Include Costa Mesa in your desired locations when starting the Private Client Brief.",
    },
  ],
  cta: {
    label: "Start Costa Mesa Seller Strategy",
    href: "/seller",
    supportingText: "Plan pricing leverage and launch timing for your Costa Mesa home.",
  },
  breadcrumbs: [{ label: "Areas" }, { label: "Costa Mesa" }],
  relatedLinks: [
    { label: "Costa Mesa seller strategy", href: "/areas/costa-mesa/seller-strategy" },
    { label: "Private market testing guide", href: "/guides/private-market-testing-before-selling" },
    { label: "private client brief tool", href: "/tools/home-match" },
  ],
};

export const newportBeachAreaPage: SeoPageContent = {
  kind: "area",
  path: "/areas/newport-beach",
  title: formatPageTitle("Newport Beach California Real Estate Planning Guide"),
  description:
    "Plan Newport Beach luxury home buying and wealth forecast scenarios with Private Client Property Desk. Coastal carry, leverage, and search planning for California buyers.",
  h1: "Newport Beach Real Estate Decision Planning",
  intro:
    "Newport Beach purchases often involve higher price assumptions, coastal carry, and nuanced property types — from bayfront to inland luxury neighborhoods. Planning before touring helps buyers and founders pressure test budget, leverage, and monthly carry with realistic assumptions.",
  whoThisIsFor: [
    "Luxury buyers targeting Newport Beach coastal or bay-adjacent markets",
    "Founders modeling a primary residence after liquidity",
    "Move-up buyers arriving from Irvine or Costa Mesa",
    "Households comparing Newport Beach vs. Laguna Beach lifestyle and carry",
  ],
  considerations: [
    {
      title: "Purchase price and carry assumptions",
      body: "Coastal carry includes property tax, insurance, HOA, and maintenance reserves that may exceed inland norms. Model scenarios before setting a search ceiling.",
    },
    {
      title: "Property type and location tradeoffs",
      body: "Water proximity, lot size, and renovation needs vary widely. Clarifying must-haves reduces wasted tours in a limited inventory environment.",
    },
    {
      title: "Wealth and lending coordination",
      body: "Higher price tiers often require early lender review — especially with complex income or recent liquidity events.",
    },
  ],
  tradeoffs: [
    {
      title: "Bayfront premium vs. inland Newport",
      body: "Water-adjacent properties carry different price and maintenance assumptions. Define which tradeoffs you are willing to make.",
    },
    {
      title: "Newport vs. Laguna Beach",
      body: "Both are coastal Orange County luxury markets with different community feel and inventory patterns. Compare scenarios in both if undecided.",
    },
  ],
  faqs: [
    {
      question: "Which Private Client Property Desk tools fit Newport Beach buyers?",
      answer:
        "Use private client brief for search planning and Wealth Forecast for purchase price, leverage, and carry modeling.",
    },
    {
      question: "Can I model a founder liquidity purchase in Newport Beach?",
      answer:
        "Yes. The Wealth Forecast tool supports liquidity context, leverage posture, and monthly carry comfort bands.",
    },
  ],
  cta: {
    label: "Build Newport Beach Wealth Forecast",
    href: "/wealth-forecast",
    supportingText: "Model price, leverage, and carry for a Newport Beach scenario.",
  },
  breadcrumbs: [{ label: "Areas" }, { label: "Newport Beach" }],
  relatedLinks: [
    { label: "Newport Beach wealth forecast", href: "/areas/newport-beach/wealth-forecast" },
    { label: "private client brief tool", href: "/tools/home-match" },
    { label: "Luxury home monthly carry", href: "/guides/luxury-home-monthly-carry" },
  ],
};

export const lagunaBeachAreaPage: SeoPageContent = {
  kind: "area",
  path: "/areas/laguna-beach",
  title: formatPageTitle("Laguna Beach California Real Estate Planning Guide"),
  description:
    "Plan Laguna Beach luxury home buying and wealth forecast scenarios with Private Client Property Desk. Coastal search strategy and carry planning for California buyers.",
  h1: "Laguna Beach Real Estate Decision Planning",
  intro:
    "Laguna Beach offers a distinct coastal lifestyle with varied micro-markets — from village proximity to hillside ocean-view properties. Buyers should plan around property type, privacy, parking, and carry assumptions before engaging seriously.",
  whoThisIsFor: [
    "Luxury buyers seeking a Laguna Beach primary or second home",
    "Coastal move-up buyers from inland Orange County",
    "Buyers comparing Laguna Beach vs. Newport Beach scenarios",
    "Households modeling carry for a higher-price coastal purchase",
  ],
  considerations: [
    {
      title: "Micro-market fit",
      body: "Laguna spans multiple pockets with different walkability, view premium, and HOA contexts. A focused plan beats a generic coastal search.",
    },
    {
      title: "Monthly carry and reserves",
      body: "Hillside and coastal properties may carry higher insurance and maintenance reserve assumptions. Model carry as a planning range.",
    },
    {
      title: "Search timeline",
      body: "Inventory can be limited at certain price points. Clarity on financing and property type improves readiness when the right property appears.",
    },
  ],
  tradeoffs: [
    {
      title: "Village walkability vs. view premium",
      body: "Walkable village proximity and ocean-view homes solve different lifestyle goals — often at different price and carry levels.",
    },
    {
      title: "Character homes vs. turnkey modern",
      body: "Older Laguna inventory may need renovation budgeting. Turnkey modern product may trade off against location or lot.",
    },
  ],
  faqs: [
    {
      question: "Should I start with private client brief or Wealth Forecast in Laguna Beach?",
      answer:
        "If you are still defining search priorities, start with private client brief. If you have a price band and need carry modeling, use Wealth Forecast.",
    },
    {
      question: "Does Private Client Property Desk guarantee Laguna Beach availability?",
      answer:
        "No. Planning tools help you organize criteria and scenarios. Availability depends on live market conditions at the time of your search.",
    },
  ],
  cta: {
    label: "Start Laguna Beach private client brief",
    href: "/buyer",
    supportingText: "Build a private Laguna Beach-focused private client brief scenario.",
  },
  breadcrumbs: [{ label: "Areas" }, { label: "Laguna Beach" }],
  relatedLinks: [
    { label: "Laguna Beach private client brief", href: "/areas/laguna-beach/home-match" },
    { label: "Wealth Forecast tool", href: "/tools/wealth-forecast" },
    { label: "Newport Beach area guide", href: "/areas/newport-beach" },
  ],
};

export const irvineEquityMoveUpPage: SeoPageContent = {
  kind: "area",
  path: "/areas/irvine/equity-move-up",
  title: formatPageTitle("Irvine Equity Move-Up Planning"),
  description:
    "Plan an equity move-up from Irvine with gross equity estimates, net proceeds planning range, and sale-to-buy sequencing. Orange County homeowner planning guide.",
  h1: "Irvine Equity Move-Up Planning",
  intro:
    "Irvine homeowners often accumulate strong equity after years in master-planned communities. Before targeting a coastal upgrade or larger Irvine home, pressure test gross equity, selling costs, and the sequence between sale and purchase.",
  whoThisIsFor: [
    "Irvine owners considering Newport Beach, Laguna Beach, or larger Irvine homes",
    "Households unsure how much equity is usable after selling costs",
    "Seller-buyers comparing sell-first vs. buy-first structures",
  ],
  considerations: [
    {
      title: "Years owned and improvement history",
      body: "Longer ownership and documented improvements may affect both equity and CPA planning topics. Organize your inputs before advisor conversations.",
    },
    {
      title: "Target next market",
      body: "Moving from Irvine to coastal Orange County often changes down payment needs and monthly carry assumptions materially.",
    },
    {
      title: "Timeline pressure",
      body: "School calendars, job relocations, and rate environment can push timing. Sequence planning reduces last-minute compromises.",
    },
  ],
  tradeoffs: [
    {
      title: "Same-city move-up vs. coastal leap",
      body: "A larger Irvine home may be simpler to sequence than a Newport upgrade. Compare net proceeds requirements for each path.",
    },
    {
      title: "Rate environment on the next loan",
      body: "Equity may be strong while carry on the next purchase still needs lender review. Do not skip carry modeling.",
    },
  ],
  faqs: [
    {
      question: "How do I start an Irvine equity scenario?",
      answer:
        "Use the Equity Move Up Plan with your Irvine home details, mortgage balance, and next-move goal.",
    },
  ],
  cta: {
    label: "Estimate My Irvine Equity Move",
    href: "/equity",
    supportingText: "Run a private equity scenario for your Irvine home.",
  },
  breadcrumbs: [
    { label: "Areas", href: "/areas/irvine" },
    { label: "Irvine", href: "/areas/irvine" },
    { label: "Equity Move-Up" },
  ],
  relatedLinks: [
    { label: "Irvine area guide", href: "/areas/irvine" },
    { label: "Sell first or buy first guide", href: "/guides/sell-first-or-buy-first-orange-county" },
  ],
};

export const costaMesaSellerStrategyPage: SeoPageContent = {
  kind: "area",
  path: "/areas/costa-mesa/seller-strategy",
  title: formatPageTitle("Costa Mesa Seller Strategy Planning"),
  description:
    "Plan a Costa Mesa home sale with pricing leverage, prep, private market testing, and launch timing. Seller strategy planning for Orange County homeowners.",
  h1: "Costa Mesa Seller Strategy Planning",
  intro:
    "Costa Mesa sellers often balance conditional motivation — selling only if the numbers work — with desire for privacy during early planning. Seller strategy planning helps organize condition, timeline, and whether private market testing fits before broad exposure.",
  whoThisIsFor: [
    "Costa Mesa homeowners with updated or partially updated properties",
    "Sellers comparing prep investment against pricing leverage",
    "Owners who prefer pricing feedback before public listing",
  ],
  considerations: [
    {
      title: "Condition and upgrade narrative",
      body: "Kitchen, flooring, and landscaping upgrades shape buyer perception. Identify which improvements belong in your positioning story.",
    },
    {
      title: "Estimated value range planning",
      body: "Use a planning range — not a single guaranteed number — when deciding whether to proceed.",
    },
    {
      title: "Launch timing",
      body: "Seasonality, personal timeline, and buyer pool depth interact. Map a timeline that matches your motivation.",
    },
  ],
  tradeoffs: [
    {
      title: "Private testing first vs. immediate listing",
      body: "Private testing may fit conditional sellers; public launch may fit owners with firm timeline and clear pricing.",
    },
    {
      title: "Prep budget vs. net outcome",
      body: "Not every upgrade returns dollar-for-dollar. Prioritize prep that supports your pricing narrative.",
    },
  ],
  faqs: [
    {
      question: "Where do I start for a Costa Mesa sale?",
      answer:
        "Start the Seller Strategy Plan with your address context, condition, timeline, and seller priority.",
    },
  ],
  cta: {
    label: "Start Costa Mesa Seller Plan",
    href: "/seller",
    supportingText: "Receive a private seller planning scenario for your Costa Mesa home.",
  },
  breadcrumbs: [
    { label: "Areas", href: "/areas/costa-mesa" },
    { label: "Costa Mesa", href: "/areas/costa-mesa" },
    { label: "Seller Strategy" },
  ],
  relatedLinks: [
    { label: "Costa Mesa area guide", href: "/areas/costa-mesa" },
    { label: "Private market testing guide", href: "/guides/private-market-testing-before-selling" },
  ],
};

export const newportWealthForecastPage: SeoPageContent = {
  kind: "area",
  path: "/areas/newport-beach/wealth-forecast",
  title: formatPageTitle("Newport Beach Real Estate Wealth Forecast Planning"),
  description:
    "Model Newport Beach purchase price, leverage, monthly carry, and hold period assumptions with Private Client Property Desk Wealth Forecast. Planning for founders and luxury buyers.",
  h1: "Newport Beach Wealth Forecast Planning",
  intro:
    "Newport Beach scenarios often sit at higher price and carry levels than inland Orange County purchases. Founders and luxury buyers should model down payment, leverage, monthly carry comfort, and reserve needs before touring at this price tier.",
  whoThisIsFor: [
    "Buyers modeling a $3M+ Newport Beach primary residence",
    "Founders balancing coastal purchase with preserved liquidity",
    "Move-up buyers pressure testing carry after an Irvine or Costa Mesa sale",
  ],
  considerations: [
    {
      title: "Coastal carry stack",
      body: "Include P&I, taxes, insurance, HOA, and maintenance reserves in one planning view — not just list price.",
    },
    {
      title: "Leverage after liquidity",
      body: "Recent liquidity may support larger down payments, but preserving cash for other goals remains a common priority.",
    },
    {
      title: "Advisor coordination",
      body: "Confirm lending structure with a lender and property-use topics with a CPA before acting on a forecast scenario.",
    },
  ],
  tradeoffs: [
    {
      title: "Bayfront vs. inland Newport price bands",
      body: "Different micro-markets require different carry assumptions. Model the band you are actually targeting.",
    },
    {
      title: "Hold period assumptions",
      body: "Appreciation scenarios are planning tools, not promises. Discuss hold period goals with advisors.",
    },
  ],
  faqs: [
    {
      question: "Can I model multiple Newport price points?",
      answer:
        "Run separate Wealth Forecast scenarios or adjust purchase price inputs to compare carry bands.",
    },
  ],
  cta: {
    label: "Build Newport Beach Forecast",
    href: "/wealth-forecast",
    supportingText: "Model price, leverage, and carry for a Newport Beach purchase.",
  },
  breadcrumbs: [
    { label: "Areas", href: "/areas/newport-beach" },
    { label: "Newport Beach", href: "/areas/newport-beach" },
    { label: "Wealth Forecast" },
  ],
  relatedLinks: [
    { label: "Newport Beach area guide", href: "/areas/newport-beach" },
    { label: "Buying after a liquidity event", href: "/guides/buying-after-a-liquidity-event" },
  ],
};

export const lagunaHomeMatchPage: SeoPageContent = {
  kind: "area",
  path: "/areas/laguna-beach/home-match",
  title: formatPageTitle("Laguna Beach Luxury Private Client Briefning"),
  description:
    "Plan a Laguna Beach luxury home search with budget, property type, timing, and lifestyle priorities. Private private client brief planning for coastal Orange County buyers.",
  h1: "Laguna Beach Private Client Briefning",
  intro:
    "Laguna Beach buyers benefit from a focused search plan — village walkability, ocean view, architectural style, and parking constraints all shape the right fit. private client brief planning organizes those priorities before you tour.",
  whoThisIsFor: [
    "Luxury buyers targeting Laguna Beach as a primary or second home",
    "Buyers comparing Laguna village vs. hillside inventory",
    "Relocating professionals with a defined budget and timeline",
  ],
  considerations: [
    {
      title: "Property type clarity",
      body: "Condos, townhomes, and single-family homes in Laguna carry different HOA, parking, and renovation contexts.",
    },
    {
      title: "Budget band realism",
      body: "Coastal Laguna inventory may require wider budget planning ranges by micro-market. Pressure test budget against property type goals.",
    },
    {
      title: "Financing readiness",
      body: "Luxury Laguna purchases often need early lender conversations — especially with complex income documentation.",
    },
  ],
  tradeoffs: [
    {
      title: "Walkability vs. view",
      body: "Village proximity and view homes solve different goals at different price points.",
    },
    {
      title: "Turnkey vs. renovation project",
      body: "Character homes may need reserve budgeting. Turnkey product may trade off location or outdoor space.",
    },
  ],
  faqs: [
    {
      question: "How is this different from browsing listings?",
      answer:
        "private client brief produces a private planning scenario based on your criteria — not live inventory guarantees.",
    },
  ],
  cta: {
    label: "Start Laguna Beach private client brief",
    href: "/buyer",
    supportingText: "Build a private Laguna Beach private client brief scenario.",
  },
  breadcrumbs: [
    { label: "Areas", href: "/areas/laguna-beach" },
    { label: "Laguna Beach", href: "/areas/laguna-beach" },
    { label: "private client brief" },
  ],
  relatedLinks: [
    { label: "Laguna Beach area guide", href: "/areas/laguna-beach" },
    { label: "private client brief tool", href: "/tools/home-match" },
  ],
};

export const areaPages = {
  irvine: irvineAreaPage,
  "costa-mesa": costaMesaAreaPage,
  "newport-beach": newportBeachAreaPage,
  "laguna-beach": lagunaBeachAreaPage,
} as const;

export const areaSubPages = {
  "irvine/equity-move-up": irvineEquityMoveUpPage,
  "costa-mesa/seller-strategy": costaMesaSellerStrategyPage,
  "newport-beach/wealth-forecast": newportWealthForecastPage,
  "laguna-beach/home-match": lagunaHomeMatchPage,
} as const;

export const allAreaPages: SeoPageContent[] = [
  ...Object.values(areaPages),
  ...Object.values(areaSubPages),
];
