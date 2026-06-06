"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { useCurrentTenant } from "@/lib/tenants/current-tenant";
import { tenantPathFromPathname } from "@/lib/tenants/tenant-paths";
import { cn } from "@/lib/utils";

type LeadType = "buyer" | "seller" | "equity" | "wealth_forecast";
type LoadingState = "preparing" | "complete" | "error";

const CONTENT: Record<
  LeadType,
  { title: string; steps: string[]; completeTitle: string }
> = {
  buyer: {
    title: "Preparing your private client brief",
    steps: [
      "Reviewing your location preferences",
      "Comparing budget, property type, and timing",
      "Identifying key tradeoffs",
      "Preparing your private review",
    ],
    completeTitle: "Your private plan is ready",
  },
  seller: {
    title: "Preparing your private seller strategy",
    steps: [
      "Reviewing your property details",
      "Evaluating timing and presentation factors",
      "Mapping private market considerations",
      "Preparing your strategy report",
    ],
    completeTitle: "Your private plan is ready",
  },
  equity: {
    title: "Preparing your equity move up plan",
    steps: [
      "Calculating your estimated equity",
      "Reviewing sale scenario ranges",
      "Mapping timing and next move options",
      "Preparing your private review",
    ],
    completeTitle: "Your private plan is ready",
  },
  wealth_forecast: {
    title: "Preparing your real estate wealth forecast",
    steps: [
      "Modeling purchase and down payment assumptions",
      "Calculating carry and leverage scenarios",
      "Comparing conservative, base, and upside paths",
      "Preparing your private forecast",
    ],
    completeTitle: "Your private forecast is ready",
  },
};

const TRUST_COPY =
  "Your responses are used to prepare a private planning report. Internal lead notes are kept separate from your public result.";

const STEP_INTERVAL_MS = 1400;

interface ReportGenerationLoadingProps {
  leadType: LeadType;
  state: LoadingState;
  onTryAgain?: () => void;
  mode?: "intake" | "full";
}

const INTAKE_MESSAGE = "Creating your private brief workspace...";

function StepIndicator({
  label,
  status,
}: {
  label: string;
  status: "pending" | "active" | "complete";
}) {
  return (
    <li className="flex items-start gap-4">
      <div
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors duration-500 ${
          status === "complete"
            ? "border-champagne bg-champagne text-navy"
            : status === "active"
              ? "border-champagne bg-navy text-champagne shadow-md shadow-navy/20"
              : "border-gray-200 bg-white text-transparent"
        }`}
        aria-hidden
      >
        {status === "complete" ? (
          <Check className="h-4 w-4" strokeWidth={2.5} />
        ) : status === "active" ? (
          <span className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-champagne"
                animate={{ opacity: [0.35, 1, 0.35] }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </span>
        ) : null}
      </div>
      <p
        className={`pt-1 text-sm leading-snug transition-colors duration-300 ${
          status === "active"
            ? "font-medium text-navy"
            : status === "complete"
              ? "text-gray-600"
              : "text-gray-400"
        }`}
      >
        {label}
      </p>
    </li>
  );
}

export function ReportGenerationLoading({
  leadType,
  state,
  onTryAgain,
  mode = "full",
}: ReportGenerationLoadingProps) {
  const pathname = usePathname();
  const tenant = useCurrentTenant();
  const { title, steps, completeTitle } = CONTENT[leadType];
  const intakeSteps = [INTAKE_MESSAGE];
  const displaySteps = mode === "intake" ? intakeSteps : steps;
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  useEffect(() => {
    if (state !== "preparing" || mode === "intake") return;

    const interval = setInterval(() => {
      setActiveStepIndex((prev) =>
        prev >= displaySteps.length - 1 ? prev : prev + 1
      );
    }, STEP_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [state, displaySteps.length, mode]);

  const activeStepLabel =
    state === "complete"
      ? completeTitle
      : state === "error"
        ? "Submission could not be completed"
        : mode === "intake"
          ? INTAKE_MESSAGE
          : displaySteps[activeStepIndex] ?? displaySteps[0];

  const displayTitle =
    mode === "intake"
      ? INTAKE_MESSAGE
      : state === "complete"
        ? completeTitle
        : state === "error"
          ? title
          : title;

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-beige/30 via-white to-white">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="rounded-2xl border border-beige bg-white p-8 shadow-xl shadow-navy/5"
        >
          <p className="mb-2 text-xs tracking-[0.2em] text-champagne uppercase">
            {tenant.brandName}
          </p>

          <h1 className="font-serif text-2xl leading-tight text-navy sm:text-[1.65rem]">
            {displayTitle}
          </h1>

          <div
            className="sr-only"
            aria-live="polite"
            aria-atomic="true"
          >
            {activeStepLabel}
          </div>

          <AnimatePresence mode="wait">
            {state === "error" ? (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8 rounded-xl border border-red-100 bg-red-50/80 p-6"
              >
                <p className="font-medium text-navy">
                  We could not generate your plan yet.
                </p>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  Please try again, or contact {tenant.agentName} directly.
                </p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  {onTryAgain && (
                    <Button
                      type="button"
                      onClick={onTryAgain}
                      className="flex-1"
                    >
                      Try Again
                    </Button>
                  )}
                  <Link
                    href={tenantPathFromPathname(pathname, "/")}
                    className={cn(
                      buttonVariants({ variant: "secondary", size: "default" }),
                      "flex-1 text-center"
                    )}
                  >
                    Contact {tenant.brandName}
                  </Link>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="steps"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-8"
              >
                <ul className="space-y-5" aria-label="Report preparation steps">
                  {displaySteps.map((step, index) => {
                    const stepStatus: "pending" | "active" | "complete" =
                      state === "complete"
                        ? "complete"
                        : mode === "intake"
                          ? "active"
                          : index < activeStepIndex
                            ? "complete"
                            : index === activeStepIndex
                              ? "active"
                              : "pending";

                    return (
                      <StepIndicator
                        key={step}
                        label={step}
                        status={stepStatus}
                      />
                    );
                  })}
                </ul>

                {state === "preparing" && mode !== "intake" && (
                  <motion.div
                    className="mt-8 h-1 overflow-hidden rounded-full bg-beige"
                    aria-hidden
                  >
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-champagne to-champagne-light"
                      initial={{ width: "8%" }}
                      animate={{
                        width: `${Math.min(92, 12 + ((activeStepIndex + 1) / displaySteps.length) * 80)}%`,
                      }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                    />
                  </motion.div>
                )}

                {state === "complete" && (
                  <motion.p
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-8 text-center text-sm font-medium text-champagne"
                  >
                    Opening your private report…
                  </motion.p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {state !== "error" && (
            <p className="mt-8 border-t border-beige pt-6 text-xs leading-relaxed text-gray-500">
              {TRUST_COPY}
            </p>
          )}
        </motion.div>
      </div>
    </div>
  );
}
