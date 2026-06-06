"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface QuestionCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}

export function QuestionCard({
  title,
  subtitle,
  children,
  className,
}: QuestionCardProps) {
  return (
    <motion.div
      key={title}
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.35 }}
      className={cn("w-full", className)}
    >
      <h2 className="font-serif text-2xl md:text-3xl text-navy mb-2">{title}</h2>
      {subtitle && (
        <p className="text-gray-500 mb-8 text-sm md:text-base">{subtitle}</p>
      )}
      {children}
    </motion.div>
  );
}
