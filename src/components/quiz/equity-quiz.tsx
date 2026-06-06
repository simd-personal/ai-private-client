"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
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
  EQUITY_BIGGEST_CONCERNS,
  EQUITY_CONCERN_LABELS,
  EQUITY_FILING_LABELS,
  EQUITY_FILING_STATUSES,
  EQUITY_GOAL_LABELS,
  EQUITY_NEXT_MOVE_GOALS,
  EQUITY_TIMELINE_LABELS,
  EQUITY_TIMELINES,
} from "@/lib/constants";
import { formatCurrency } from "@/lib/equity/calculateEquityMove";
import {
  formatMoneyAmount,
  formatMoneyInput,
  parseMoney,
} from "@/lib/quiz/money-input";
import type { PublicEquityEstimateResponse } from "@/lib/property/equityPropertyTypes";
import type { ValueEstimateChoice } from "@/lib/property/equityPropertyTypes";
import { postLeadSubmission } from "@/lib/quiz/submit-lead";
import type { CurrentValueSource } from "@/lib/property/equityPropertyTypes";
import type { EquityQuizData } from "@/lib/schemas/quiz";
import { tenantPathFromPathname } from "@/lib/tenants/tenant-paths";
import { useCurrentTenant } from "@/lib/tenants/current-tenant";
import {
  getAdvisoryTeamLabel,
  getConsentText,
  getContactStepSubtitle,
  getContactStepTitle,
} from "@/lib/tenants/tenant-copy";
import { getTenantSupportedRegionLabel } from "@/lib/tenants/tenant-config";

type SubmissionView = "quiz" | "loading";
type LoadingState = "preparing" | "complete" | "error";

const TOTAL_STEPS = 11;

type EquityFormState = Partial<
  Omit<EquityQuizData, "leadType" | "contact" | "propertyAddress"> & {
    contact: Partial<EquityQuizData["contact"]>;
    propertyAddress: Partial<EquityQuizData["propertyAddress"]>;
    californiaConfirmed?: boolean | null;
    originalPurchasePriceInput?: string;
    estimatedCurrentValueInput?: string;
    mortgageBalanceInput?: string;
    estimatedImprovementsInput?: string;
    estimatedInterestRateInput?: string;
    valueEstimateChoice?: ValueEstimateChoice | null;
  }
>;

const goalsNeedingLocation = new Set([
  "upsize",
  "downsize",
  "relocate within California",
  "buy second home",
]);

export function EquityQuiz() {
  const router = useRouter();
  const pathname = usePathname();
  const tenant = useCurrentTenant();
  const regionLabel = getTenantSupportedRegionLabel(tenant);
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [submissionView, setSubmissionView] = useState<SubmissionView>("quiz");
  const [loadingState, setLoadingState] = useState<LoadingState>("preparing");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [estimateLoading, setEstimateLoading] = useState(false);
  const [estimateData, setEstimateData] =
    useState<PublicEquityEstimateResponse | null>(null);
  const honeypotRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<EquityFormState>({
    currentHomeState: "California",
    propertyAddress: { state: "CA" },
    contact: { preferredContactMethod: "email", consentGiven: false },
  });

  useEffect(() => {
    trackQuizStarted("equity");
    maybeTrackSeoQuizStarted("equity");
  }, []);

  useQuizStepTracking("equity", step, TOTAL_STEPS);

  const update = (patch: Partial<EquityFormState>) =>
    setForm((prev) => ({ ...prev, ...patch }));

  const fetchEstimate = useCallback(async () => {
    const addr = form.propertyAddress;
    if (!addr?.street?.trim() || !addr.city?.trim() || !addr.zip?.trim()) {
      return;
    }

    setEstimateLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/property/equity-estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: addr.street.trim(),
          city: addr.city.trim(),
          state: addr.state?.trim() || "CA",
          zip: addr.zip.trim(),
          yearPurchased: form.yearPurchased,
          originalPurchasePrice: parseMoney(form.originalPurchasePriceInput),
        }),
      });

      const data = (await res.json()) as PublicEquityEstimateResponse;
      setEstimateData(data);
    } catch {
      setEstimateData({
        available: false,
        estimationConfidence: "unavailable",
        dataSources: [],
        message:
          "We could not find a reliable automated estimate. You can enter your best guess, or leave this blank for advisor review.",
      });
    } finally {
      setEstimateLoading(false);
    }
  }, [form.propertyAddress, form.yearPurchased, form.originalPurchasePriceInput]);

  const validateStep = (): boolean => {
    setError(null);
    const addr = form.propertyAddress;

    switch (step) {
      case 1:
        if (!addr?.street?.trim()) {
          setError("Enter your street address");
          return false;
        }
        if (!addr.city?.trim()) {
          setError("Enter your city");
          return false;
        }
        if (!addr.zip?.trim() || addr.zip.trim().length < 5) {
          setError("Enter a valid ZIP code");
          return false;
        }
        if (form.californiaConfirmed === null || form.californiaConfirmed === undefined) {
          setError("Please confirm your property is in California");
          return false;
        }
        if (form.californiaConfirmed === false) {
          setError(`${tenant.brandName} currently supports ${regionLabel} homeowners only`);
          return false;
        }
        return true;
      case 2:
        if (!form.yearPurchased || form.yearPurchased < 1950) {
          setError("Enter the year you purchased");
          return false;
        }
        return true;
      case 3: {
        const purchase = parseMoney(form.originalPurchasePriceInput);
        if (!purchase || purchase <= 0) {
          setError("Enter your original purchase price");
          return false;
        }
        return true;
      }
      case 4: {
        const mortgage = parseMoney(form.mortgageBalanceInput);
        if (mortgage === undefined) {
          setError("Enter your mortgage balance (use 0 if paid off)");
          return false;
        }
        return true;
      }
      case 5: {
        const choice = form.valueEstimateChoice;
        if (!choice) {
          setError("Choose how you want to handle your current value estimate");
          return false;
        }
        if (choice === "use_estimate" && !estimateData?.available) {
          setError(
            "No automated estimate is available — choose Adjust estimate or I am not sure"
          );
          return false;
        }
        if (choice === "adjust") {
          const adjusted = parseMoney(form.estimatedCurrentValueInput);
          if (!adjusted || adjusted <= 0) {
            setError("Enter your adjusted planning value");
            return false;
          }
        }
        return true;
      }
      case 6:
        if (!form.filingStatus) {
          setError("Select a filing status for planning estimates");
          return false;
        }
        return true;
      case 7:
        if (!form.nextMoveGoal) {
          setError("Select your next move goal");
          return false;
        }
        return true;
      case 8:
        if (!form.timeline) {
          setError("Select a timeline");
          return false;
        }
        return true;
      case 9:
        if (!form.biggestConcern) {
          setError("Select your biggest planning concern");
          return false;
        }
        return true;
      case 10:
        return true;
      case 11: {
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
      if (step === 4) {
        void fetchEstimate();
      }
      setStep((s) => s + 1);
      return;
    }

    setIsTransitioning(true);
    setSubmissionView("loading");
    setLoadingState("preparing");

    const purchase = parseMoney(form.originalPurchasePriceInput)!;
    const mortgage = parseMoney(form.mortgageBalanceInput)!;
    const improvements = parseMoney(form.estimatedImprovementsInput);
    const rate = form.estimatedInterestRateInput
      ? Number(form.estimatedInterestRateInput)
      : undefined;

    const choice = form.valueEstimateChoice;
    let estimatedCurrentValue: number | undefined;
    let currentValueSource: CurrentValueSource = "unknown";

    if (choice === "use_estimate" && estimateData?.estimatedValue) {
      estimatedCurrentValue = estimateData.estimatedValue;
      currentValueSource = "rentcast_estimate";
    } else if (choice === "adjust") {
      estimatedCurrentValue = parseMoney(form.estimatedCurrentValueInput);
      currentValueSource = "user_adjusted";
    } else if (choice === "unsure") {
      currentValueSource = "unknown";
    }

    const propertyAddress = {
      street: form.propertyAddress!.street!.trim(),
      city: form.propertyAddress!.city!.trim(),
      state: form.propertyAddress!.state?.trim() || "CA",
      zip: form.propertyAddress!.zip!.trim(),
    };

    const payload: EquityQuizData = {
      leadType: "equity",
      propertyAddress,
      currentHomeCity: propertyAddress.city,
      currentHomeState: form.currentHomeState ?? "California",
      yearPurchased: form.yearPurchased!,
      originalPurchasePrice: purchase,
      estimatedCurrentValue,
      currentValueSource,
      valueEstimateChoice: choice ?? undefined,
      mortgageBalance: mortgage,
      estimatedInterestRate:
        rate !== undefined && Number.isFinite(rate) ? rate : undefined,
      estimatedImprovements: improvements,
      filingStatus: form.filingStatus!,
      nextMoveGoal: form.nextMoveGoal!,
      desiredNextLocation: form.desiredNextLocation?.trim() || undefined,
      timeline: form.timeline!,
      biggestConcern: form.biggestConcern!,
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
      leadType: "equity",
      token: result.token,
    });
    trackQuizCompleted("equity", { leadId: result.leadId });

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

  const showLocationField =
    form.nextMoveGoal && goalsNeedingLocation.has(form.nextMoveGoal);

  const estimateSourceLabel = estimateData?.available
    ? "Property data provider estimate"
    : "Homeowner-provided estimate";

  if (submissionView === "loading") {
    return (
      <ReportGenerationLoading
        leadType="equity"
        state={loadingState}
        mode="intake"
        onTryAgain={handleTryAgain}
      />
    );
  }

  return (
    <QuizShell
      title="Equity Move Up Plan"
      currentStep={step}
      totalSteps={TOTAL_STEPS}
      onBack={step > 1 ? () => setStep((s) => s - 1) : undefined}
      onNext={handleNext}
      nextLabel={
        step === TOTAL_STEPS
          ? isTransitioning
            ? "Preparing Plan"
            : "Get My Equity Plan"
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
          title="What is your property address?"
          subtitle="We use your address to build a planning estimate when available — not an appraisal."
        >
          <Input
            placeholder="Street address"
            value={form.propertyAddress?.street ?? ""}
            onChange={(e) =>
              update({
                propertyAddress: {
                  ...form.propertyAddress,
                  street: e.target.value,
                  state: form.propertyAddress?.state ?? "CA",
                },
              })
            }
          />
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Input
              placeholder="City"
              value={form.propertyAddress?.city ?? ""}
              onChange={(e) =>
                update({
                  propertyAddress: {
                    ...form.propertyAddress,
                    city: e.target.value,
                    state: form.propertyAddress?.state ?? "CA",
                  },
                })
              }
            />
            <Input
              placeholder="State"
              value={form.propertyAddress?.state ?? "CA"}
              onChange={(e) =>
                update({
                  propertyAddress: {
                    ...form.propertyAddress,
                    state: e.target.value,
                  },
                })
              }
            />
            <Input
              placeholder="ZIP"
              value={form.propertyAddress?.zip ?? ""}
              onChange={(e) =>
                update({
                  propertyAddress: {
                    ...form.propertyAddress,
                    zip: e.target.value,
                  },
                })
              }
            />
          </div>
          <div className="mt-6 space-y-3">
            <OptionButton
              label="Yes, my home is in California"
              selected={form.californiaConfirmed === true}
              onClick={() => update({ californiaConfirmed: true })}
            />
            <OptionButton
              label="No, my home is outside California"
              selected={form.californiaConfirmed === false}
              onClick={() => update({ californiaConfirmed: false })}
            />
          </div>
        </QuestionCard>
      )}

      {step === 2 && (
        <QuestionCard
          title="When did you purchase your home?"
          subtitle="Approximate year is fine for planning estimates."
        >
          <Input
            type="number"
            placeholder="e.g. 2014"
            min={1950}
            max={new Date().getFullYear()}
            value={form.yearPurchased ?? ""}
            onChange={(e) => {
              const parsed = parseInt(e.target.value, 10);
              update({
                yearPurchased: Number.isFinite(parsed) ? parsed : undefined,
              });
            }}
          />
        </QuestionCard>
      )}

      {step === 3 && (
        <QuestionCard
          title="What was your original purchase price?"
          subtitle="This helps model appreciation and capital gains planning ranges."
        >
          <Input
            placeholder="e.g. 850,000"
            inputMode="numeric"
            value={form.originalPurchasePriceInput ?? ""}
            onChange={(e) =>
              update({
                originalPurchasePriceInput: formatMoneyInput(e.target.value),
              })
            }
          />
        </QuestionCard>
      )}

      {step === 4 && (
        <QuestionCard
          title="Mortgage balance"
          subtitle="Optional: estimated interest rate if you know it."
        >
          <label className="mb-1 block text-sm text-gray-600">
            Remaining mortgage balance
          </label>
          <Input
            placeholder="e.g. 420,000 (use 0 if paid off)"
            inputMode="numeric"
            value={form.mortgageBalanceInput ?? ""}
            onChange={(e) =>
              update({
                mortgageBalanceInput: formatMoneyInput(e.target.value),
              })
            }
          />
          <label className="mb-1 mt-4 block text-sm text-gray-600">
            Estimated interest rate % (optional)
          </label>
          <Input
            placeholder="e.g. 3.25"
            inputMode="decimal"
            value={form.estimatedInterestRateInput ?? ""}
            onChange={(e) =>
              update({ estimatedInterestRateInput: e.target.value })
            }
          />
        </QuestionCard>
      )}

      {step === 5 && (
        <QuestionCard
          title="Estimate your current value"
          subtitle="Planning estimate only — pricing should be confirmed during licensed agent review."
        >
          {estimateLoading && (
            <p className="mb-4 text-sm text-gray-500">
              Looking up a planning estimate for your address…
            </p>
          )}

          {!estimateLoading && estimateData?.available && (
            <div className="mb-6 rounded-xl border border-champagne/40 bg-beige/30 p-4 text-sm">
              <p className="mb-2 font-medium text-navy">Planning estimate</p>
              {estimateData.estimatedValue != null && (
                <p className="text-gray-700">
                  Estimated planning value:{" "}
                  <span className="font-medium">
                    {formatCurrency(estimateData.estimatedValue)}
                  </span>
                </p>
              )}
              {estimateData.estimatedValueLow != null &&
                estimateData.estimatedValueHigh != null && (
                  <p className="mt-1 text-gray-600">
                    Estimate range: {formatCurrency(estimateData.estimatedValueLow)}{" "}
                    – {formatCurrency(estimateData.estimatedValueHigh)}
                  </p>
                )}
              {estimateData.comparableCount != null &&
                estimateData.comparableCount > 0 && (
                  <p className="mt-1 text-gray-600">
                    Comparable sale context: {estimateData.comparableCount}{" "}
                    recent sales used in the automated estimate
                  </p>
                )}
              <p className="mt-2 text-xs text-gray-500">
                Data source: {estimateSourceLabel}
              </p>
            </div>
          )}

          {!estimateLoading && estimateData && !estimateData.available && (
            <p className="mb-6 rounded-lg bg-beige/40 px-4 py-3 text-sm text-gray-600">
              {estimateData.message}
            </p>
          )}

          <div className="space-y-3">
            <OptionButton
              label="Use this estimate"
              selected={form.valueEstimateChoice === "use_estimate"}
              onClick={() => {
                if (!estimateData?.available) return;
                update({
                  valueEstimateChoice: "use_estimate",
                  estimatedCurrentValueInput: estimateData.estimatedValue
                    ? formatMoneyAmount(estimateData.estimatedValue)
                    : undefined,
                });
              }}
            />
            <OptionButton
              label="Adjust estimate"
              selected={form.valueEstimateChoice === "adjust"}
              onClick={() => update({ valueEstimateChoice: "adjust" })}
            />
            <OptionButton
              label="I am not sure"
              selected={form.valueEstimateChoice === "unsure"}
              onClick={() =>
                update({
                  valueEstimateChoice: "unsure",
                  estimatedCurrentValueInput: undefined,
                })
              }
            />
          </div>

          {form.valueEstimateChoice === "adjust" && (
            <div className="mt-4">
              <label className="mb-1 block text-sm text-gray-600">
                Your planning value
              </label>
              <Input
                placeholder="e.g. 1,650,000"
                inputMode="numeric"
                value={form.estimatedCurrentValueInput ?? ""}
                onChange={(e) =>
                  update({
                    estimatedCurrentValueInput: formatMoneyInput(e.target.value),
                  })
                }
              />
            </div>
          )}
        </QuestionCard>
      )}

      {step === 6 && (
        <QuestionCard
          title="Improvements and filing status"
          subtitle="For planning estimates only — confirm tax details with a CPA."
        >
          <label className="mb-1 block text-sm text-gray-600">
            Estimated improvements since purchase (optional)
          </label>
          <Input
            placeholder="e.g. 120,000"
            inputMode="numeric"
            value={form.estimatedImprovementsInput ?? ""}
            onChange={(e) =>
              update({
                estimatedImprovementsInput: formatMoneyInput(e.target.value),
              })
            }
          />
          <p className="mb-2 mt-6 text-sm text-gray-600">
            Filing status (planning reference)
          </p>
          <div className="space-y-3">
            {EQUITY_FILING_STATUSES.map((status) => (
              <OptionButton
                key={status}
                label={EQUITY_FILING_LABELS[status]}
                selected={form.filingStatus === status}
                onClick={() => update({ filingStatus: status })}
              />
            ))}
          </div>
        </QuestionCard>
      )}

      {step === 7 && (
        <QuestionCard
          title="What is your next move goal?"
          subtitle="This helps shape your equity and timing strategy."
        >
          <div className="space-y-3">
            {EQUITY_NEXT_MOVE_GOALS.map((goal) => (
              <OptionButton
                key={goal}
                label={EQUITY_GOAL_LABELS[goal]}
                selected={form.nextMoveGoal === goal}
                onClick={() => update({ nextMoveGoal: goal })}
              />
            ))}
          </div>
          {showLocationField && (
            <Input
              className="mt-4"
              placeholder="Desired next location (optional)"
              value={form.desiredNextLocation ?? ""}
              onChange={(e) => update({ desiredNextLocation: e.target.value })}
            />
          )}
        </QuestionCard>
      )}

      {step === 8 && (
        <QuestionCard title="What is your timeline?">
          <div className="space-y-3">
            {EQUITY_TIMELINES.map((t) => (
              <OptionButton
                key={t}
                label={EQUITY_TIMELINE_LABELS[t]}
                selected={form.timeline === t}
                onClick={() => update({ timeline: t })}
              />
            ))}
          </div>
        </QuestionCard>
      )}

      {step === 9 && (
        <QuestionCard title="What is your biggest planning concern?">
          <div className="space-y-3">
            {EQUITY_BIGGEST_CONCERNS.map((c) => (
              <OptionButton
                key={c}
                label={EQUITY_CONCERN_LABELS[c]}
                selected={form.biggestConcern === c}
                onClick={() => update({ biggestConcern: c })}
              />
            ))}
          </div>
        </QuestionCard>
      )}

      {step === 10 && (
        <QuestionCard
          title="Anything else we should know?"
          subtitle="Optional — upgrades, timing constraints, or relocation notes."
        >
          <Textarea
            rows={4}
            placeholder={`Share any context that would help ${getAdvisoryTeamLabel(tenant)} prepare your brief...`}
            value={form.freeText ?? ""}
            onChange={(e) => update({ freeText: e.target.value })}
          />
        </QuestionCard>
      )}

      {step === 11 && (
        <QuestionCard
          title={getContactStepTitle()}
          subtitle={getContactStepSubtitle(tenant)}
        >
          <div className="grid gap-4 sm:grid-cols-2">
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
            className="mt-4"
            type="email"
            placeholder="Email"
            value={form.contact?.email ?? ""}
            onChange={(e) =>
              update({ contact: { ...form.contact, email: e.target.value } })
            }
          />
          <Input
            className="mt-4"
            type="tel"
            placeholder="Phone (optional)"
            value={form.contact?.phone ?? ""}
            onChange={(e) =>
              update({ contact: { ...form.contact, phone: e.target.value } })
            }
          />
          <p className="mb-2 mt-4 text-sm text-gray-600">Preferred contact</p>
          <div className="flex flex-wrap gap-2">
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
          <label className="mt-6 flex items-start gap-3 text-sm text-gray-600">
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
            {getConsentText(tenant)} Estimates are not tax or legal advice.
          </label>
        </QuestionCard>
      )}
    </QuizShell>
  );
}
