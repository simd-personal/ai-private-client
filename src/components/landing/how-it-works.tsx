"use client";

import { motion } from "framer-motion";
import { ClipboardList, Sparkles, UserCheck } from "lucide-react";
import { useCurrentTenant } from "@/lib/tenants/current-tenant";

export function HowItWorks() {
  const tenant = useCurrentTenant();

  const steps = [
    {
      icon: ClipboardList,
      title: "Complete the Private Client Brief",
      description:
        "Share objective, markets, timeline, financing context, privacy needs, and advisor involvement.",
    },
    {
      icon: Sparkles,
      title: "Receive Your Strategy Room",
      description:
        "Get scenario comparisons, advisor coordination maps, and items to verify — in client-safe language.",
    },
    {
      icon: UserCheck,
      title: "Coordinate With Your Team",
      description: `${tenant.agentName} helps align licensed agent, CPA, attorney, lender, and wealth advisor review.`,
    },
  ];

  return (
    <section className="bg-white px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-12 text-center font-serif text-3xl text-navy">
          How It Works
        </h2>
        <div className="grid gap-10 md:grid-cols-3">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center"
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-champagne/20">
                <step.icon className="h-6 w-6 text-navy" />
              </div>
              <p className="mb-1 text-xs tracking-widest text-champagne uppercase">
                Step {i + 1}
              </p>
              <h3 className="mb-2 font-serif text-xl text-navy">{step.title}</h3>
              <p className="text-sm leading-relaxed text-gray-600">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
