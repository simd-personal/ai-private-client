"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps, ReactNode } from "react";
import { trackSeoToolCtaClicked, trackToolCardClicked } from "@/lib/analytics";
import {
  destinationToolFromHref,
  markSeoCtaSession,
} from "@/lib/seo/tracking";

interface TrackedSeoLinkProps extends Omit<ComponentProps<typeof Link>, "href"> {
  href: string;
  ctaLabel: string;
  children: ReactNode;
}

export function TrackedSeoLink({
  href,
  ctaLabel,
  children,
  onClick,
  ...props
}: TrackedSeoLinkProps) {
  const pathname = usePathname();
  const destinationTool = destinationToolFromHref(href);

  const handleClick: ComponentProps<typeof Link>["onClick"] = (event) => {
    trackSeoToolCtaClicked({
      source_page: pathname,
      destination_tool: destinationTool,
      cta_label: ctaLabel,
    });
    markSeoCtaSession({
      source_page: pathname,
      destination_tool: destinationTool,
    });
    onClick?.(event);
  };

  return (
    <Link href={href} onClick={handleClick} {...props}>
      {children}
    </Link>
  );
}

interface TrackedToolCardLinkProps
  extends Omit<ComponentProps<typeof Link>, "href"> {
  href: string;
  ctaLabel: string;
  children: ReactNode;
}

export function TrackedToolCardLink({
  href,
  ctaLabel,
  children,
  onClick,
  ...props
}: TrackedToolCardLinkProps) {
  const pathname = usePathname();
  const destinationTool = destinationToolFromHref(href);

  const handleClick: ComponentProps<typeof Link>["onClick"] = (event) => {
    trackToolCardClicked({
      source_page: pathname,
      destination_tool: destinationTool,
      cta_label: ctaLabel,
    });
    onClick?.(event);
  };

  return (
    <Link href={href} onClick={handleClick} {...props}>
      {children}
    </Link>
  );
}
