"use client";

import { motion } from "framer-motion";
import { Award, MapPin, Users } from "lucide-react";
import { useCurrentTenant } from "@/lib/tenants/current-tenant";

export function TrustSection() {
  const tenant = useCurrentTenant();

  const reasons = [
    {
      icon: Award,
      title: "Advisor-Ready Planning",
      description:
        "Structured briefs designed for CPA, attorney, lender, and wealth advisor review — not generic lead forms.",
    },
    {
      icon: MapPin,
      title: "Complex Decision Support",
      description:
        "Sequencing, privacy, and multi-market scenarios for sell, buy, hold, and coordinate decisions.",
    },
    {
      icon: Users,
      title: "Private Client Experience",
      description:
        "Executive-level language, discreet coordination, and a strategy room built for high-net-worth planning.",
    },
  ];

  return (
    <section className="bg-navy px-6 py-20 text-white">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-4 text-center font-serif text-3xl">
          Why {tenant.brandName}
        </h2>
        <p className="mx-auto mb-12 max-w-xl text-center text-gray-400">
          An AI-powered planning layer where real estate agents, wealth advisors,
          CPAs, attorneys, and lenders coordinate before execution.
        </p>
        <div className="grid gap-8 md:grid-cols-3">
          {reasons.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="rounded-2xl border border-white/10 bg-white/5 p-8"
            >
              <item.icon className="mb-4 h-6 w-6 text-champagne" />
              <h3 className="mb-2 font-serif text-xl">{item.title}</h3>
              <p className="text-sm leading-relaxed text-gray-400">
                {item.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
