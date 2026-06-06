"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Home, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";

const paths = [
  {
    type: "buyer",
    title: "Luxury Buyer Path",
    description:
      "Discover the California neighborhoods, property types, and timing that align with your lifestyle and budget.",
    icon: Home,
    href: "/buyer",
    cta: "Start Buyer Quiz",
  },
  {
    type: "seller",
    title: "Luxury Seller Path",
    description:
      "Get a tailored selling strategy focused on positioning, preparation, and your priority outcomes.",
    icon: TrendingUp,
    href: "/seller",
    cta: "Start Seller Quiz",
  },
] as const;

export function PathCards() {
  return (
    <section className="bg-beige/40 px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <h2 className="font-serif text-3xl text-navy text-center mb-4">
          Choose Your Path
        </h2>
        <p className="text-center text-gray-600 mb-12 max-w-xl mx-auto">
          Whether you are buying or selling, your personalized plan takes just a few minutes.
        </p>
        <div className="grid gap-8 md:grid-cols-2">
          {paths.map((path, i) => (
            <motion.div
              key={path.type}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
            >
              <Card className="h-full transition-shadow hover:shadow-lg">
                <CardContent className="flex h-full flex-col p-8">
                  <path.icon className="mb-4 h-8 w-8 text-champagne" />
                  <CardTitle className="text-2xl mb-2">{path.title}</CardTitle>
                  <CardDescription className="text-base flex-1 mb-6">
                    {path.description}
                  </CardDescription>
                  <Link
                    href={path.href}
                    onClick={() =>
                      trackEvent(`path_card_${path.type}`, { location: "path_cards" })
                    }
                  >
                    <Button className="w-full">{path.cta}</Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
