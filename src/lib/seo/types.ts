export interface SeoLink {
  label: string;
  href: string;
  description?: string;
}

export interface SeoSectionItem {
  title: string;
  body: string;
}

export interface SeoFaqItem {
  question: string;
  answer: string;
}

export interface SeoBreadcrumb {
  label: string;
  href?: string;
}

export interface SeoCta {
  label: string;
  href: string;
  supportingText?: string;
}

export type SeoPageKind = "tools-index" | "tool" | "guide" | "area";

export interface SeoPageContent {
  kind: SeoPageKind;
  path: string;
  title: string;
  description: string;
  h1: string;
  intro: string;
  whoThisIsFor: string[];
  considerations: SeoSectionItem[];
  tradeoffs: SeoSectionItem[];
  faqs: SeoFaqItem[];
  cta: SeoCta;
  breadcrumbs: SeoBreadcrumb[];
  relatedLinks?: SeoLink[];
  /** Guide pages use Article schema */
  useArticleSchema?: boolean;
}

export interface ToolCardContent {
  title: string;
  description: string;
  href: string;
  seoHref: string;
  cta: string;
}

export interface ToolsIndexContent {
  kind: "tools-index";
  path: string;
  title: string;
  description: string;
  h1: string;
  intro: string;
  tools: ToolCardContent[];
  breadcrumbs: SeoBreadcrumb[];
  relatedLinks?: SeoLink[];
}
