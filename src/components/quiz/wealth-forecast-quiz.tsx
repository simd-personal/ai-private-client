"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { HoneypotField } from "@/components/quiz/honeypot-field";
import { ReportGenerationLoading } from "@/components/quiz/report-generation-loading";
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
  CONTACT_METHODS,
  DESIRED_LOCATIONS,
  WEALTH_CARRY_COMFORT,
  WEALTH_CARRY_LABELS,
  WEALTH_DOWN_PAYMENT_TYPES,
  WEALTH_HOLD_PERIODS,
  WEALTH_LEVERAGE_LABELS,
  WEALTH_LEVERAGE_PREFERENCES,
  WEALTH_LIQUIDITY_LABELS,
  WEALTH_LIQUIDITY_SITUATIONS,
  WEALTH_PROPERTY_USE_LABELS,
  WEALTH_PROPERTY_USES,
  WEALTH_RISK_PROFILES,
  WEALTH_TIMELINE_LABELS,
  WEALTH_TIMELINES,
} from "@/lib/constants";
import {
  formatMoneyInput,
  parseMoney,
} from "@/lib/quiz/money-input";
import { postLeadSubmission } from "@/lib/quiz/submit-lead";
import type { WealthQuizData } from "@/lib/schemas/quiz";
import { tenantPathFromPathname } from "@/lib/tenants/tenant-paths";

type SubmissionView = "quiz" | "loading";
type LoadingState = "preparing" | "complete" | "error";

const TOTAL_STEPS = 10;

type WealthFormState = Partial<
  Omit<WealthQuizData, "leadType" | "contact" | "targetLocations"> & {
    contact: Partial<WealthQuizData["contact"]>;
    targetLocations: string[];
    purchasePriceInput?: string;
    downPaymentPercentInput?: string;
    downPaymentAmountInput?: string;
    interestRateInput?: string;
    insuranceAnnualInput?: string;
    hoaMonthlyInput?: string;
    propertyTaxRateInput?: string;
    maintenanceRateInput?: string;
  }
>;

function parsePercent(value?: string): number | undefined {
  if (!value?.trim()) return undefined;
  const n = Number(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

export function WealthForecastQuiz() {
  const router = useRouter();
  const pathname = usePathname();
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [submissionView, setSubmissionView] = useState<SubmissionView>("quiz");
  const [loadingState, setLoadingState] = useState<LoadingState>("preparing");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const honeypotRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<WealthFormState>({
    targetLocations: [],
    propertyTaxRate: 1.1,
    maintenanceRate: 1,
    contact: { preferredContactMethod: "email", consentGiven: false },
  });

  useEffect(() => {
    trackQuizStarted("wealth_forecast");
    maybeTrackSeoQuizStarted("wealth_forecast");
  }, []);

  useQuizStepTracking("wealth_forecast", step, TOTAL_STEPS);

  const update = (patch: Partial<WealthFormState>) =>
    setForm((prev) => ({ ...prev, ...patch }));

  const toggleLocation = (loc: string) => {
    const current = form.targetLocations ?? [];
    if (current.includes(loc)) {
      update({ targetLocations: current.filter((l) => l !== loc) });
    } else {
      update({ targetLocations: [...current, loc] });
    }
  };

  const validateStep = (): boolean => {
    setError(null);
    switch (step) {
      case 1: {
        const price = parseMoney(form.purchasePriceInput);
        if (!price || price <= 0) {
          setError("Enter a target purchase price");
          return false;
        }
        if (!form.downPaymentType) {
          setError("Select a down payment approach");
          return false;
        }
        if (form.downPaymentType === "percent") {
          const pct = parsePercent(form.downPaymentPercentInput);
          if (pct == null || pct <= 0 || pct > 100) {
            setError("Enter a valid down payment percentage");
            return false;
          }
        }
        if (form.downPaymentType === "amount") {
          const amt = parseMoney(form.downPaymentAmountInput);
          if (!amt || amt <= 0) {
            setError("Enter a down payment amount");
            return false;
          }
          if (amt > price) {
            setError("Down payment cannot exceed purchase price");
            return false;
          }
        }
        return true;
      }
      case 2:
        if (!form.propertyUse) {
          setError("Select how you plan to use the property");
          return false;
        }
        return true;
      case 3:
        if (!form.targetLocations?.length) {
          setError("Select at least one target location");
          return false;
        }
        return true;
      case 4:
        if (!form.holdPeriodYears) {
          setError("Select a hold period for this scenario");
          return false;
        }
        return true;
      case 5:
        return true;
      case 6:
        if (!form.liquiditySituation) {
          setError("Select your liquidity situation");
          return false;
        }
        if (!form.leveragePreference) {
          setError("Select a leverage preference");
          return false;
        }
        return true;
      case 7:
        if (!form.riskProfile) {
          setError("Select a scenario view");
          return false;
        }
        if (!form.monthlyCarryComfort) {
          setError("Select your monthly carry comfort");
          return false;
        }
        return true;
      case 8:
        if (!form.timeline) {
          setError("Select a purchase timeline");
          return false;
        }
        return true;
      case 9:
        return true;
      case 10: {
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

    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1);
      return;
    }

    setIsTransitioning(true);
    setSubmissionView("loading");
    setLoadingState("preparing");

    const purchasePrice = parseMoney(form.purchasePriceInput)!;
    const rate = form.interestRateInput
      ? Number(form.interestRateInput)
      : undefined;

    const payload: WealthQuizData = {
      leadType: "wealth_forecast",
      purchasePrice,
      downPaymentType: form.downPaymentType!,
      downPaymentPercent:
        form.downPaymentType === "percent"
          ? parsePercent(form.downPaymentPercentInput)
          : undefined,
      downPaymentAmount:
        form.downPaymentType === "amount"
          ? parseMoney(form.downPaymentAmountInput)
          : undefined,
      propertyUse: form.propertyUse!,
      targetLocations: form.targetLocations!,
      holdPeriodYears: form.holdPeriodYears!,
      interestRate:
        rate !== undefined && Number.isFinite(rate) ? rate : undefined,
      propertyTaxRate:
        parsePercent(form.propertyTaxRateInput) ?? form.propertyTaxRate ?? 1.1,
      insuranceAnnual: parseMoney(form.insuranceAnnualInput),
      hoaMonthly: parseMoney(form.hoaMonthlyInput),
      maintenanceRate:
        parsePercent(form.maintenanceRateInput) ?? form.maintenanceRate ?? 1,
      liquiditySituation: form.liquiditySituation!,
      leveragePreference: form.leveragePreference!,
      riskProfile: form.riskProfile!,
      monthlyCarryComfort: form.monthlyCarryComfort!,
      timeline: form.timeline!,
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
      leadType: "wealth_forecast",
      token: result.token,
    });
    trackQuizCompleted("wealth_forecast", { leadId: result.leadId });

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

  if (submissionView === "loading") {
    return (
      <ReportGenerationLoading
        leadType="wealth_forecast"
        state={loadingState}
        mode="intake"
        onTryAgain={handleTryAgain}
      />
    );
  }

  return (
    <QuizShell
      title="Real Estate Wealth Forecast"
      currentStep={step}
      totalSteps={TOTAL_STEPS}
      onBack={step > 1 ? () => setStep((s) => s - 1) : undefined}
      onNext={handleNext}
      nextLabel={
        step === TOTAL_STEPS
          ? isTransitioning
            ? "Building Forecast"
            : "Build My Forecast"
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
          title="Target purchase price and down payment"
          subtitle="Planning assumptions only — not an appraisal or lending approval."
        >
          <label className="mb-1 block text-sm text-gray-600">
            Purchase price
          </label>
          <Input
            placeholder="e.g. 3,500,000"
            inputMode="numeric"
            value={form.purchasePriceInput ?? ""}
            onChange={(e) =>
              update({ purchasePriceInput: formatMoneyInput(e.target.value) })
            }
          />
          <p className="mb-3 mt-6 text-sm font-medium text-navy">
            Down payment approach
          </p>
          <div className="space-y-3">
            {WEALTH_DOWN_PAYMENT_TYPES.map((type) => (
              <OptionButton
                key={type}
                label={
                  type === "percent"
                    ? "Percentage of purchase price"
                    : type === "amount"
                      ? "Fixed dollar amount"
                      : "All cash (no financing)"
                }
                selected={form.downPaymentType === type}
                onClick={() => update({ downPaymentType: type })}
              />
            ))}
          </div>
          {form.downPaymentType === "percent" && (
            <div className="mt-4">
              <label className="mb-1 block text-sm text-gray-600">
                Down payment percent
              </label>
              <Input
                placeholder="e.g. 25"
                inputMode="decimal"
                value={form.downPaymentPercentInput ?? ""}
                onChange={(e) =>
                  update({ downPaymentPercentInput: e.target.value })
                }
              />
            </div>
          )}
          {form.downPaymentType === "amount" && (
            <div className="mt-4">
              <label className="mb-1 block text-sm text-gray-600">
                Down payment amount
              </label>
              <Input
                placeholder="e.g. 750,000"
                inputMode="numeric"
                value={form.downPaymentAmountInput ?? ""}
                onChange={(e) =>
                  update({
                    downPaymentAmountInput: formatMoneyInput(e.target.value),
                  })
                }
              />
            </div>
          )}
        </QuestionCard>
      )}

      {step === 2 && (
        <QuestionCard
          title="How do you plan to use this property?"
          subtitle="Property use affects planning topics to review with a CPA."
        >
          <div className="space-y-3">
            {WEALTH_PROPERTY_USES.map((use) => (
              <OptionButton
                key={use}
                label={WEALTH_PROPERTY_USE_LABELS[use]}
                selected={form.propertyUse === use}
                onClick={() => update({ propertyUse: use })}
              />
            ))}
          </div>
        </QuestionCard>
      )}

      {step === 3 && (
        <QuestionCard
          title="Target California locations"
          subtitle="Select all areas you want modeled in this scenario."
        >
          <div className="space-y-3">
            {DESIRED_LOCATIONS.map((loc) => (
              <OptionButton
                key={loc}
                label={loc}
                selected={form.targetLocations?.includes(loc) ?? false}
                onClick={() => toggleLocation(loc)}
              />
            ))}
          </div>
        </QuestionCard>
      )}

      {step === 4 && (
        <QuestionCard
          title="Hold period and interest rate"
          subtitle="Hold period drives appreciation scenarios. Leave rate blank to use a planning assumption."
        >
          <p className="mb-3 text-sm font-medium text-navy">Hold period (years)</p>
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {WEALTH_HOLD_PERIODS.map((years) => (
              <OptionButton
                key={years}
                label={`${years} years`}
                selected={form.holdPeriodYears === years}
                onClick={() => update({ holdPeriodYears: years })}
              />
            ))}
          </div>
          <label className="mb-1 block text-sm text-gray-600">
            Interest rate % (optional)
          </label>
          <Input
            placeholder="Leave blank for 6.75% planning assumption"
            inputMode="decimal"
            value={form.interestRateInput ?? ""}
            onChange={(e) => update({ interestRateInput: e.target.value })}
          />
        </QuestionCard>
      )}

      {step === 5 && (
        <QuestionCard
          title="Ownership cost assumptions"
          subtitle="Defaults are common California planning assumptions — adjust if you have better estimates."
        >
          <label className="mb-1 block text-sm text-gray-600">
            Property tax rate % (annual)
          </label>
          <Input
            placeholder="1.1"
            inputMode="decimal"
            value={form.propertyTaxRateInput ?? String(form.propertyTaxRate ?? 1.1)}
            onChange={(e) => update({ propertyTaxRateInput: e.target.value })}
          />
          <label className="mb-1 mt-4 block text-sm text-gray-600">
            Insurance (annual, optional)
          </label>
          <Input
            placeholder="e.g. 8,000"
            inputMode="numeric"
            value={form.insuranceAnnualInput ?? ""}
            onChange={(e) =>
              update({ insuranceAnnualInput: formatMoneyInput(e.target.value) })
            }
          />
          <label className="mb-1 mt-4 block text-sm text-gray-600">
            HOA (monthly, optional)
          </label>
          <Input
            placeholder="e.g. 350"
            inputMode="numeric"
            value={form.hoaMonthlyInput ?? ""}
            onChange={(e) =>
              update({ hoaMonthlyInput: formatMoneyInput(e.target.value) })
            }
          />
          <label className="mb-1 mt-4 block text-sm text-gray-600">
            Maintenance reserve % (annual)
          </label>
          <Input
            placeholder="1"
            inputMode="decimal"
            value={form.maintenanceRateInput ?? String(form.maintenanceRate ?? 1)}
            onChange={(e) => update({ maintenanceRateInput: e.target.value })}
          />
        </QuestionCard>
      )}

      {step === 6 && (
        <QuestionCard
          title="Liquidity and leverage"
          subtitle="Helps frame how this purchase fits your broader wealth picture."
        >
          <p className="mb-3 text-sm font-medium text-navy">Liquidity situation</p>
          <div className="mb-6 space-y-3">
            {WEALTH_LIQUIDITY_SITUATIONS.map((situation) => (
              <OptionButton
                key={situation}
                label={WEALTH_LIQUIDITY_LABELS[situation]}
                selected={form.liquiditySituation === situation}
                onClick={() => update({ liquiditySituation: situation })}
              />
            ))}
          </div>
          <p className="mb-3 text-sm font-medium text-navy">Leverage preference</p>
          <div className="space-y-3">
            {WEALTH_LEVERAGE_PREFERENCES.map((pref) => (
              <OptionButton
                key={pref}
                label={WEALTH_LEVERAGE_LABELS[pref]}
                selected={form.leveragePreference === pref}
                onClick={() => update({ leveragePreference: pref })}
              />
            ))}
          </div>
        </QuestionCard>
      )}

      {step === 7 && (
        <QuestionCard
          title="Risk view and monthly carry comfort"
          subtitle="Scenario modeling only — not investment advice."
        >
          <p className="mb-3 text-sm font-medium text-navy">Scenario view</p>
          <div className="mb-6 space-y-3">
            {WEALTH_RISK_PROFILES.map((profile) => (
              <OptionButton
                key={profile}
                label={
                  profile === "conservative"
                    ? "Conservative scenarios"
                    : profile === "balanced"
                      ? "Balanced scenarios"
                      : profile === "upside_oriented"
                        ? "Upside-oriented scenarios"
                        : "Show all scenarios"
                }
                selected={form.riskProfile === profile}
                onClick={() => update({ riskProfile: profile })}
              />
            ))}
          </div>
          <p className="mb-3 text-sm font-medium text-navy">
            Comfortable monthly carry
          </p>
          <div className="space-y-3">
            {WEALTH_CARRY_COMFORT.map((comfort) => (
              <OptionButton
                key={comfort}
                label={WEALTH_CARRY_LABELS[comfort]}
                selected={form.monthlyCarryComfort === comfort}
                onClick={() => update({ monthlyCarryComfort: comfort })}
              />
            ))}
          </div>
        </QuestionCard>
      )}

      {step === 8 && (
        <QuestionCard title="Purchase timeline">
          <div className="space-y-3">
            {WEALTH_TIMELINES.map((timeline) => (
              <OptionButton
                key={timeline}
                label={WEALTH_TIMELINE_LABELS[timeline]}
                selected={form.timeline === timeline}
                onClick={() => update({ timeline })}
              />
            ))}
          </div>
        </QuestionCard>
      )}

      {step === 9 && (
        <QuestionCard
          title="Anything else we should factor in?"
          subtitle="Optional — liquidity events, business plans, or carry concerns."
        >
          <Textarea
            placeholder="Share context for a more tailored planning scenario..."
            value={form.freeText ?? ""}
            onChange={(e) => update({ freeText: e.target.value })}
            rows={5}
          />
        </QuestionCard>
      )}

      {step === 10 && (
        <QuestionCard title="Receive your private forecast">
          <div className="space-y-4">
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
              <p className="text-sm text-gray-600">Preferred contact method</p>
              {CONTACT_METHODS.map((method) => (
                <OptionButton
                  key={method}
                  label={method.charAt(0).toUpperCase() + method.slice(1)}
                  selected={form.contact?.preferredContactMethod === method}
                  onClick={() =>
                    update({
                      contact: {
                        ...form.contact,
                        preferredContactMethod: method,
                      },
                    })
                  }
                />
              ))}
            </div>
            <label className="flex items-start gap-3 text-sm text-gray-600">
              <input
                type="checkbox"
                className="mt-1"
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
              I agree to be contacted about my forecast and understand this is
              planning information only, not financial or tax advice.
            </label>
          </div>
        </QuestionCard>
      )}
    </QuizShell>
  );
}
