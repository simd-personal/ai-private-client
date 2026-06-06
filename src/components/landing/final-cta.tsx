"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";
import { tenantPathFromPathname } from "@/lib/tenants/tenant-paths";

export function FinalCta() {
  const pathname = usePathname();
  return (
    <section className="px-6 py-24 bg-gradient-to-b from-white to-beige/50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mx-auto max-w-3xl text-center"
      >
        <h2 className="font-serif text-3xl md:text-4xl text-navy mb-4">
          Ready for Your Private Client Brief?
        </h2>
        <p className="text-gray-600 mb-8">
          Complete the intake in under five minutes. Your private strategy room
          awaits.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href={tenantPathFromPathname(pathname, "/buyer")}
            onClick={() => trackEvent("cta_final_buyer")}
          >
            <Button variant="default" size="lg">
              Start Private Client Brief
            </Button>
          </Link>
          <Link
            href={tenantPathFromPathname(pathname, "/seller")}
            onClick={() => trackEvent("cta_final_seller")}
          >
            <Button variant="secondary" size="lg">
              Explore Selling
            </Button>
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
