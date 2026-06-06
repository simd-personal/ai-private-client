"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { BookingCta } from "@/components/booking/booking-cta";
import { Button } from "@/components/ui/button";
import { useCurrentTenant } from "@/lib/tenants/current-tenant";

export default function ThankYouPage() {
  const tenant = useCurrentTenant();
  const hasBookingUrl = Boolean(process.env.NEXT_PUBLIC_BOOKING_URL);

  return (
    <div className="min-h-screen bg-gradient-to-b from-navy to-navy-light px-6 py-20 text-white">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-lg text-center"
      >
        <CheckCircle className="mx-auto mb-6 h-16 w-16 text-champagne" />
        <h1 className="mb-4 font-serif text-3xl md:text-4xl">
          Thank You
        </h1>
        <p className="mb-8 leading-relaxed text-gray-300">
          Your private decision brief has been created. {tenant.agentName} will
          review your responses and coordinate the next advisor conversation at
          your convenience.
        </p>

        <div className="mb-4">
          <BookingCta location="thank_you" fullWidth />
        </div>

        {!hasBookingUrl && (
          <p className="mb-8 text-xs text-gray-500">
            Scheduling integration coming soon — your advisory team will follow up
            directly.
          </p>
        )}

        <Link href="/">
          <Button
            variant="secondary"
            className="border-white/20 bg-white/10 text-white hover:bg-white/20"
          >
            Return Home
          </Button>
        </Link>
      </motion.div>
    </div>
  );
}
