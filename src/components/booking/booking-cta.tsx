"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackBookingClicked } from "@/lib/analytics";
import { useCurrentTenant } from "@/lib/tenants/current-tenant";
import { tenantPathFromPathname } from "@/lib/tenants/tenant-paths";

interface BookingCtaProps {
  location: string;
  size?: "default" | "sm" | "lg";
  className?: string;
  variant?: "default" | "secondary" | "champagne";
  fullWidth?: boolean;
}

export function BookingCta({
  location,
  size = "lg",
  className,
  variant = "champagne",
  fullWidth,
}: BookingCtaProps) {
  const pathname = usePathname();
  const tenant = useCurrentTenant();
  const bookingUrl = tenant.bookingUrl?.trim() || null;

  const handleClick = () => {
    trackBookingClicked({ location });
  };

  const buttonClass = fullWidth ? `w-full ${className ?? ""}` : className;

  if (bookingUrl) {
    return (
      <a
        href={bookingUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className={fullWidth ? "block w-full" : undefined}
      >
        <Button variant={variant} size={size} className={buttonClass}>
          <Calendar className="h-4 w-4" />
          Book a Private Consultation
        </Button>
      </a>
    );
  }

  return (
    <Link
      href={tenantPathFromPathname(pathname, "/thank-you")}
      onClick={handleClick}
      className={fullWidth ? "block w-full" : undefined}
    >
      <Button variant={variant} size={size} className={buttonClass}>
        <Calendar className="h-4 w-4" />
        Book a Private Consultation
      </Button>
    </Link>
  );
}
