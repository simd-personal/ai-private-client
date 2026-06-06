"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Shield } from "lucide-react";
import { TenantLogo } from "@/components/branding/tenant-logo";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";
import { useCurrentTenant } from "@/lib/tenants/current-tenant";
import { tenantPathFromPathname } from "@/lib/tenants/tenant-paths";

export function HeroSection() {
  const pathname = usePathname();
  const tenant = useCurrentTenant();
  const backgroundLogoSrc = tenant.logoUrl?.trim() || null;
  const regionLabel =
    tenant.supportedStates.length === 1 &&
    tenant.supportedStates[0]?.toUpperCase() === "CA"
      ? "California"
      : tenant.supportedStates.join(", ");
  return (
    <section className="relative min-h-[90vh] overflow-hidden bg-navy text-white">
      <div className="absolute inset-0">
        {backgroundLogoSrc ? (
          backgroundLogoSrc.startsWith("/") ? (
            <Image
              src={backgroundLogoSrc}
              alt=""
              fill
              className="object-cover opacity-20 blur-sm scale-110"
              priority
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- external tenant logo URL may be unknown at build time
            <img
              src={backgroundLogoSrc}
              alt=""
              className="h-full w-full object-cover opacity-20 blur-sm scale-110"
            />
          )
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-b from-navy/80 via-navy/90 to-navy" />
      </div>

      <div className="relative mx-auto flex max-w-6xl flex-col items-center px-6 pt-24 pb-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <TenantLogo tenant={tenant} width={160} height={100} className="mx-auto" />
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-4 flex items-center gap-2 text-xs tracking-[0.25em] text-champagne uppercase"
        >
          <Shield className="h-3 w-3" />
          Licensed {regionLabel} Private Client Planning
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="font-serif text-4xl leading-tight font-light tracking-tight sm:text-5xl md:text-6xl"
        >
          AI Private Client
          <br />
          <span className="text-champagne">Strategy Room</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="mt-6 max-w-xl text-lg text-gray-300"
        >
          Planning and coordination for complex real estate decisions — where
          agents, wealth advisors, CPAs, attorneys, and lenders align before
          execution.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="mt-10 flex w-full max-w-md flex-col gap-4 sm:flex-row sm:justify-center"
        >
          <Link
            href={tenantPathFromPathname(pathname, "/buyer")}
            onClick={() => trackEvent("cta_start_buyer", { location: "hero" })}
          >
            <Button variant="champagne" size="lg" className="w-full sm:w-auto">
              Start Private Client Brief
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link
            href={tenantPathFromPathname(pathname, "/seller")}
            onClick={() => trackEvent("cta_start_seller", { location: "hero" })}
          >
            <Button
              variant="secondary"
              size="lg"
              className="w-full border-white/20 bg-white/10 text-white hover:bg-white/20 sm:w-auto"
            >
              I Am Thinking About Selling
            </Button>
          </Link>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-8 text-sm text-gray-400"
        >
          Private · Personalized · {regionLabel} luxury markets only
        </motion.p>
      </div>
    </section>
  );
}
