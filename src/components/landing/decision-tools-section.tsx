"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, BarChart3, Home, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trackToolCardClicked } from "@/lib/analytics";
import { usePathname } from "next/navigation";
import { tenantPathFromPathname } from "@/lib/tenants/tenant-paths";

const tools = [
  {
    id: "home-match",
    title: "Private Client Property Brief",
    description:
      "Build a buyer planning brief based on budget, location, timing, and coordination needs.",
    icon: Home,
    href: "/buyer",
    cta: "Start Private Client Brief",
    enabled: true,
  },
  {
    id: "equity-move",
    title: "Equity Move Up Plan",
    description:
      "Estimate how much equity you may have built, what a sale could look like after costs, and what your next move could unlock.",
    icon: TrendingUp,
    href: "/equity",
    cta: "Estimate My Equity Move",
    enabled: true,
  },
  {
    id: "wealth-forecast",
    title: "Real Estate Wealth Forecast",
    description:
      "Model appreciation, leverage, ownership costs, and planning topics for a California purchase.",
    icon: BarChart3,
    href: "/wealth-forecast",
    cta: "Build My Forecast",
    enabled: true,
  },
] as const;

const destinationToolById: Record<(typeof tools)[number]["id"], string> = {
  "home-match": "home_match",
  "equity-move": "equity_move_up",
  "wealth-forecast": "wealth_forecast",
};

export function DecisionToolsSection() {
  const pathname = usePathname();

  return (
    <section className="bg-beige/40 px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-4 text-center font-serif text-3xl text-navy">
          Choose Your Private Planning Tool
        </h2>
        <p className="mx-auto mb-12 max-w-2xl text-center text-gray-600">
          Three California-focused planning paths. Start with the tool that matches
          where you are in your ownership journey.
        </p>
        <div className="grid gap-8 md:grid-cols-3">
          {tools.map((tool, i) => (
            <motion.div
              key={tool.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <Card
                className={`h-full transition-shadow ${tool.enabled ? "hover:shadow-lg" : "opacity-90"}`}
              >
                <CardContent className="flex h-full flex-col p-8">
                  <tool.icon className="mb-4 h-8 w-8 text-champagne" />
                  <CardTitle className="mb-2 text-2xl">{tool.title}</CardTitle>
                  <CardDescription className="mb-6 flex-1 text-base">
                    {tool.description}
                  </CardDescription>
                  {tool.enabled ? (
                    <Link
                      href={tenantPathFromPathname(pathname, tool.href)}
                      onClick={() =>
                        trackToolCardClicked({
                          source_page: pathname,
                          destination_tool: destinationToolById[tool.id],
                          cta_label: tool.cta,
                        })
                      }
                    >
                      <Button className="w-full gap-2">
                        {tool.cta}
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  ) : (
                    <Button className="w-full" variant="secondary" disabled>
                      {tool.cta}
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
