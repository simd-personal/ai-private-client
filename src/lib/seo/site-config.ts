export const SITE_NAME = "Private Client Property Desk";
export const SITE_TAGLINE = "Private Client Property Desk";

export function getSiteUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";
  return url.replace(/\/$/, "");
}

export const BROKERAGE = {
  agentName: "Your Advisory Team",
  agentDre: "",
  brokerageName: "Private Client Advisory Group",
  brokerageDre: "",
  areaServed: "California",
  licenseNote:
    "Private Client Property Desk supports private client real estate planning and advisor coordination.",
} as const;

export function buildOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: getSiteUrl(),
    description:
      "AI-powered planning and coordination for complex real estate decisions involving agents, wealth advisors, CPAs, attorneys, and lenders.",
    areaServed: {
      "@type": "State",
      name: "California",
    },
  };
}

/** @deprecated Use buildOrganizationSchema() for runtime URL resolution */
export const ORGANIZATION_SCHEMA = buildOrganizationSchema();

export function buildLocalBusinessSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: SITE_NAME,
    url: getSiteUrl(),
    areaServed: [
      { "@type": "City", name: "Irvine", containedInPlace: "California" },
      { "@type": "City", name: "Costa Mesa", containedInPlace: "California" },
      { "@type": "City", name: "Newport Beach", containedInPlace: "California" },
      { "@type": "City", name: "Laguna Beach", containedInPlace: "California" },
    ],
    employee: {
      "@type": "Organization",
      name: BROKERAGE.brokerageName,
      jobTitle: "Private Client Advisory Coordination",
    },
  };
}
