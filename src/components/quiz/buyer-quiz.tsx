"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { HoneypotField } from "@/components/quiz/honeypot-field";
import { ReportGenerationLoading } from "@/components/quiz/report-generation-loading";
import { OutOfStateMessage } from "@/components/quiz/out-of-state-message";
import { OptionButton } from "@/components/quiz/option-button";
import { QuestionCard } from "@/components/quiz/question-card";
import { QuizShell } from "@/components/quiz/quiz-shell";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getAttribution } from "@/lib/attribution";
import {
  getOrCreateSessionId,
  maybeTrackSeoQuizStarted,
  trackLeadSubmitted,
  trackQuizCompleted,
  trackQuizStarted,
} from "@/lib/analytics";
import { useQuizStepTracking } from "@/components/quiz/use-quiz-step-tracking";
import {
  BUDGET_LABELS,
  BUDGET_RANGES,
  CONTACT_METHODS,
  DESIRED_LOCATIONS,
  FINANCING_STATUSES,
  LIFESTYLE_PRIORITIES,
  PROPERTY_TYPES,
  TIMELINE_LABELS,
  TIMELINES,
} from "@/lib/constants";
import { getRedirectDelayMs, postLeadSubmission } from "@/lib/quiz/submit-lead";
import type { BuyerQuizData } from "@/lib/schemas/quiz";
import { tenantPathFromPathname } from "@/lib/tenants/tenant-paths";
import { useCurrentTenant } from "@/lib/tenants/current-tenant";
import {
  getConsentText,
  getContactStepSubtitle,
  getContactStepTitle,
} from "@/lib/tenants/tenant-copy";
import { getTenantSupportedRegionLabel } from "@/lib/tenants/tenant-config";

type SubmissionView = "quiz" | "loading";
type LoadingState = "preparing" | "complete" | "error";

const TOTAL_STEPS = 9;

type BuyerFormState = Partial<
  Omit<BuyerQuizData, "leadType" | "contact"> & {
    contact: Partial<BuyerQuizData["contact"]>;
    californiaConfirmed?: boolean | null;
  }
>;

const financingLabels: Record<(typeof FINANCING_STATUSES)[number], string> = {
  "cash buyer": "Cash buyer",
  "pre approved": "Pre-approved",
  "talking to lender": "Talking to a lender",
  "needs lender referral": "Needs lender referral",
  "just exploring": "Just exploring",
};

export function BuyerQuiz() {
  const router = useRouter();
  const pathname = usePathname();
  const tenant = useCurrentTenant();
  const regionLabel = getTenantSupportedRegionLabel(tenant);
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [submissionView, setSubmissionView] = useState<SubmissionView>("quiz");
  const [loadingState, setLoadingState] = useState<LoadingState>("preparing");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const honeypotRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<BuyerFormState>({
    desiredLocations: [],
    lifestylePriorities: [],
    contact: { preferredContactMethod: "email", consentGiven: false },
  });

  useEffect(() => {
    trackQuizStarted("buyer");
    maybeTrackSeoQuizStarted("buyer");
  }, []);

  useQuizStepTracking("buyer", step, TOTAL_STEPS);

  const update = (patch: Partial<BuyerFormState>) =>
    setForm((prev) => ({ ...prev, ...patch }));

  const toggleArray = <T extends string>(key: "desiredLocations" | "lifestylePriorities", value: T) => {
    const current = (form[key] as T[] | undefined) ?? [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    update({ [key]: next } as Partial<BuyerFormState>);
  };

  const validateStep = (): boolean => {
    setError(null);
    switch (step) {
      case 1:
        if (form.californiaConfirmed === null || form.californiaConfirmed === undefined) {
          setError("Please select an option");
          return false;
        }
        return true;
      case 2:
        if (!form.desiredLocations?.length) {
          setError("Select at least one location");
          return false;
        }
        return true;
      case 3:
        if (!form.budgetRange) {
          setError("Select a budget range");
          return false;
        }
        return true;
      case 4:
        if (!form.propertyType) {
          setError("Select a property type");
          return false;
        }
        return true;
      case 5:
        if (!form.lifestylePriorities?.length) {
          setError("Select at least one priority");
          return false;
        }
        return true;
      case 6:
        if (!form.timeline) {
          setError("Select a timeline");
          return false;
        }
        return true;
      case 7:
        if (!form.financingStatus) {
          setError("Select your financing status");
          return false;
        }
        return true;
      case 8:
        return true;
      case 9: {
        const c = form.contact;
        if (!c?.firstName?.trim()) {
          setError("First name is required");
          return false;
        }
        if (!c?.lastName?.trim()) {
          setError("Last name is required");
          return false;
        }
        if (!c?.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)) {
          setError("Valid email is required");
          return false;
        }
        if (!c?.consentGiven) {
          setError("Please agree to be contacted");
          return false;
        }
        return true;
      }
      default:
        return true;
    }
  };

  const handleNext = async () => {
    if (!validateStep()) return;

    if (step === 1 && form.californiaConfirmed === false) {
      return;
    }

    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1);
      return;
    }

    setIsTransitioning(true);
    setSubmissionView("loading");
    setLoadingState("preparing");

    const payload: BuyerQuizData = {
      leadType: "buyer",
      desiredLocations: form.desiredLocations!,
      budgetRange: form.budgetRange!,
      propertyType: form.propertyType!,
      lifestylePriorities: form.lifestylePriorities!,
      timeline: form.timeline!,
      financingStatus: form.financingStatus!,
      freeText: form.freeText,
      contact: {
        firstName: form.contact!.firstName!,
        lastName: form.contact!.lastName!,
        email: form.contact!.email!,
        phone: form.contact!.phone,
        preferredContactMethod: form.contact!.preferredContactMethod!,
        consentGiven: true,
      },
    };

    const result = await postLeadSubmission({
      ...payload,
      honeypot: honeypotRef.current?.value ?? "",
      attribution: getAttribution() ?? undefined,
      sessionId: getOrCreateSessionId(),
    });

    setIsTransitioning(false);

    if (!result.ok) {
      setLoadingState("error");
      return;
    }

    trackLeadSubmitted({
      leadId: result.leadId,
      leadType: "buyer",
      token: result.token,
    });
    trackQuizCompleted("buyer", { leadId: result.leadId });

    setLoadingState("complete");
    await new Promise((resolve) => setTimeout(resolve, getRedirectDelayMs()));
    router.push(
      `${tenantPathFromPathname(pathname, "/result")}?token=${result.token}`
    );
  };

  const handleTryAgain = () => {
    setSubmissionView("quiz");
    setLoadingState("preparing");
    setError(null);
    setIsTransitioning(false);
  };

  const handleBack = () => {
    setError(null);
    setStep((s) => Math.max(1, s - 1));
  };

  if (submissionView === "loading") {
    return (
      <ReportGenerationLoading
        leadType="buyer"
        state={loadingState}
        onTryAgain={handleTryAgain}
      />
    );
  }

  if (step === 1 && form.californiaConfirmed === false) {
    return (
      <QuizShell
        title="Private Client Property Brief"
        currentStep={1}
        totalSteps={TOTAL_STEPS}
        showNav={false}
      >
        <OutOfStateMessage />
      </QuizShell>
    );
  }

  return (
    <QuizShell
      title="Private Client Property Brief"
      currentStep={step}
      totalSteps={TOTAL_STEPS}
      onBack={step > 1 ? handleBack : undefined}
      onNext={handleNext}
      nextLabel={
        step === TOTAL_STEPS
          ? isTransitioning
            ? "Preparing Plan"
            : "Get My Plan"
          : "Continue"
      }
      nextDisabled={isTransitioning}
      isLoading={isTransitioning}
    >
      <HoneypotField ref={honeypotRef} />
      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {step === 1 && (
        <QuestionCard
          title="Are you looking in California?"
          subtitle={`${tenant.brandName} supports ${regionLabel} private client property planning.`}
        >
          <div className="space-y-3">
            <OptionButton
              label="Yes, California luxury markets"
              selected={form.californiaConfirmed === true}
              onClick={() => update({ californiaConfirmed: true })}
            />
            <OptionButton
              label="No, I'm looking outside California"
              selected={form.californiaConfirmed === false}
              onClick={() => update({ californiaConfirmed: false })}
            />
          </div>
        </QuestionCard>
      )}

      {step === 2 && (
        <QuestionCard
          title="Which areas interest you?"
          subtitle="Select all that apply."
        >
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {DESIRED_LOCATIONS.map((loc) => (
              <OptionButton
                key={loc}
                label={loc}
                multi
                selected={form.desiredLocations?.includes(loc)}
                onClick={() => toggleArray("desiredLocations", loc)}
              />
            ))}
          </div>
        </QuestionCard>
      )}

      {step === 3 && (
        <QuestionCard title="What is your budget range?">
          <div className="space-y-2">
            {BUDGET_RANGES.map((range) => (
              <OptionButton
                key={range}
                label={BUDGET_LABELS[range]}
                selected={form.budgetRange === range}
                onClick={() => update({ budgetRange: range })}
              />
            ))}
          </div>
        </QuestionCard>
      )}

      {step === 4 && (
        <QuestionCard title="What type of property are you seeking?">
          <div className="space-y-2">
            {PROPERTY_TYPES.map((type) => (
              <OptionButton
                key={type}
                label={type.replace(/\b\w/g, (c) => c.toUpperCase())}
                selected={form.propertyType === type}
                onClick={() => update({ propertyType: type })}
              />
            ))}
          </div>
        </QuestionCard>
      )}

      {step === 5 && (
        <QuestionCard
          title="What lifestyle priorities matter most?"
          subtitle="Select all that apply."
        >
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {LIFESTYLE_PRIORITIES.map((p) => (
              <OptionButton
                key={p}
                label={p.replace(/\b\w/g, (c) => c.toUpperCase())}
                multi
                selected={form.lifestylePriorities?.includes(p)}
                onClick={() => toggleArray("lifestylePriorities", p)}
              />
            ))}
          </div>
        </QuestionCard>
      )}

      {step === 6 && (
        <QuestionCard title="What is your timeline?">
          <div className="space-y-2">
            {TIMELINES.map((t) => (
              <OptionButton
                key={t}
                label={TIMELINE_LABELS[t]}
                selected={form.timeline === t}
                onClick={() => update({ timeline: t })}
              />
            ))}
          </div>
        </QuestionCard>
      )}

      {step === 7 && (
        <QuestionCard title="What is your financing status?">
          <div className="space-y-2">
            {FINANCING_STATUSES.map((f) => (
              <OptionButton
                key={f}
                label={financingLabels[f]}
                selected={form.financingStatus === f}
                onClick={() => update({ financingStatus: f })}
              />
            ))}
          </div>
        </QuestionCard>
      )}

      {step === 8 && (
        <QuestionCard
          title="Anything else we should know?"
          subtitle="Optional — share details about your ideal home, must-haves, or situation."
        >
          <Textarea
            placeholder="Tell us more about your goals..."
            value={form.freeText ?? ""}
            onChange={(e) => update({ freeText: e.target.value })}
            rows={5}
          />
        </QuestionCard>
      )}

      {step === 9 && (
        <QuestionCard
          title={getContactStepTitle()}
          subtitle={getContactStepSubtitle(tenant)}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="First name"
                value={form.contact?.firstName ?? ""}
                onChange={(e) =>
                  update({
                    contact: { ...form.contact, firstName: e.target.value },
                  })
                }
              />
              <Input
                placeholder="Last name"
                value={form.contact?.lastName ?? ""}
                onChange={(e) =>
                  update({
                    contact: { ...form.contact, lastName: e.target.value },
                  })
                }
              />
            </div>
            <Input
              type="email"
              placeholder="Email"
              value={form.contact?.email ?? ""}
              onChange={(e) =>
                update({ contact: { ...form.contact, email: e.target.value } })
              }
            />
            <Input
              type="tel"
              placeholder="Phone (optional)"
              value={form.contact?.phone ?? ""}
              onChange={(e) =>
                update({ contact: { ...form.contact, phone: e.target.value } })
              }
            />
            <div className="space-y-2">
              <p className="text-sm text-gray-500">Preferred contact method</p>
              {CONTACT_METHODS.map((m) => (
                <OptionButton
                  key={m}
                  label={m.charAt(0).toUpperCase() + m.slice(1)}
                  selected={form.contact?.preferredContactMethod === m}
                  onClick={() =>
                    update({
                      contact: {
                        ...form.contact,
                        preferredContactMethod: m,
                      },
                    })
                  }
                />
              ))}
            </div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-gray-300"
                checked={form.contact?.consentGiven ?? false}
                onChange={(e) =>
                  update({
                    contact: {
                      ...form.contact,
                      consentGiven: e.target.checked,
                    },
                  })
                }
              />
              <span className="text-xs text-gray-500 leading-relaxed">
                {getConsentText(tenant)} I understand AI guidance is for
                planning coordination only and is not legal, tax, lending, or
                investment advice.
              </span>
            </label>
          </div>
        </QuestionCard>
      )}
    </QuizShell>
  );
}
