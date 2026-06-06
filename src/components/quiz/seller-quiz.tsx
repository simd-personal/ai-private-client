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
  PROPERTY_CONDITIONS,
  PROPERTY_TYPES,
  SELLER_HOA_LABELS,
  SELLER_HOA_STATUSES,
  SELLER_LUXURY_AMENITY_LABELS,
  SELLER_LUXURY_AMENITY_STATUSES,
  SELLER_POOL_LABELS,
  SELLER_POOL_STATUSES,
  SELLER_PRIORITIES,
  SELLING_TIMELINES,
  TIMELINE_LABELS,
} from "@/lib/constants";
import { isCaliforniaProperty } from "@/lib/schemas/quiz";
import { isPremiumSellerValue } from "@/lib/seller/seller-tier";
import { postLeadSubmission } from "@/lib/quiz/submit-lead";
import type { SellerQuizData } from "@/lib/schemas/quiz";
import { tenantPathFromPathname } from "@/lib/tenants/tenant-paths";
import { useCurrentTenant } from "@/lib/tenants/current-tenant";
import {
  getAdvisoryTeamLabel,
  getConsentText,
  getContactStepSubtitle,
  getContactStepTitle,
} from "@/lib/tenants/tenant-copy";

type SubmissionView = "quiz" | "loading";
type LoadingState = "preparing" | "complete" | "error";

const TOTAL_STEPS = 7;

type SellerFormState = Partial<
  Omit<SellerQuizData, "leadType" | "contact" | "propertyAddress"> & {
    propertyAddress: Partial<SellerQuizData["propertyAddress"]>;
    contact: Partial<SellerQuizData["contact"]>;
  }
>;

const conditionLabels: Record<(typeof PROPERTY_CONDITIONS)[number], string> = {
  "needs work": "Needs work",
  average: "Average condition",
  updated: "Updated",
  "luxury renovated": "Luxury renovated",
  "new construction": "New construction",
};

const priorityLabels: Record<(typeof SELLER_PRIORITIES)[number], string> = {
  "highest price": "Highest price",
  privacy: "Privacy",
  speed: "Speed",
  relocation: "Relocation",
  "off market sale": "Off-market sale",
  "market testing": "Market testing",
};

export function SellerQuiz() {
  const router = useRouter();
  const pathname = usePathname();
  const tenant = useCurrentTenant();
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [submissionView, setSubmissionView] = useState<SubmissionView>("quiz");
  const [loadingState, setLoadingState] = useState<LoadingState>("preparing");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const honeypotRef = useRef<HTMLInputElement>(null);
  const [outOfState, setOutOfState] = useState(false);
  const [showLuxuryDetails, setShowLuxuryDetails] = useState(false);
  const [form, setForm] = useState<SellerFormState>({
    propertyAddress: { state: "CA" },
    contact: { preferredContactMethod: "email", consentGiven: false },
  });

  useEffect(() => {
    trackQuizStarted("seller");
    maybeTrackSeoQuizStarted("seller");
  }, []);

  useQuizStepTracking("seller", step, TOTAL_STEPS);

  const update = (patch: Partial<SellerFormState>) =>
    setForm((prev) => ({ ...prev, ...patch }));

  const validateStep = (): boolean => {
    setError(null);
    switch (step) {
      case 1: {
        const addr = form.propertyAddress;
        if (!addr?.street?.trim()) {
          setError("Street address is required");
          return false;
        }
        if (!addr?.city?.trim()) {
          setError("City is required");
          return false;
        }
        if (!addr?.state?.trim()) {
          setError("State is required");
          return false;
        }
        if (!addr?.zip?.trim()) {
          setError("ZIP code is required");
          return false;
        }
        if (!isCaliforniaProperty(addr.state)) {
          setOutOfState(true);
          return false;
        }
        setOutOfState(false);
        return true;
      }
      case 2:
        if (!form.estimatedValueRange) {
          setError("Select an estimated value range");
          return false;
        }
        return true;
      case 3:
        if (!form.propertyCondition) {
          setError("Select property condition");
          return false;
        }
        return true;
      case 4:
        if (!form.sellingTimeline) {
          setError("Select a selling timeline");
          return false;
        }
        return true;
      case 5:
        if (!form.sellerPriority) {
          setError("Select your top priority");
          return false;
        }
        return true;
      case 6:
        return true;
      case 7: {
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
    if (outOfState) return;

    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1);
      return;
    }

    setIsTransitioning(true);
    setSubmissionView("loading");
    setLoadingState("preparing");

    const payload: SellerQuizData = {
      leadType: "seller",
      propertyAddress: form.propertyAddress as SellerQuizData["propertyAddress"],
      estimatedValueRange: form.estimatedValueRange!,
      propertyCondition: form.propertyCondition!,
      sellingTimeline: form.sellingTimeline!,
      sellerPriority: form.sellerPriority!,
      upgrades: form.upgrades,
      bedrooms: form.bedrooms,
      bathrooms: form.bathrooms,
      squareFeet: form.squareFeet,
      lotSize: form.lotSize,
      yearBuilt: form.yearBuilt,
      propertyType: form.propertyType,
      hoaStatus: form.hoaStatus,
      poolStatus: form.poolStatus,
      garageSpaces: form.garageSpaces,
      notableFeatures: form.notableFeatures,
      recentUpgrades: form.recentUpgrades,
      buyerObjectionConcerns: form.buyerObjectionConcerns,
      viewType: form.viewType,
      waterProximity: form.waterProximity,
      gatedOrPrivateAccess: form.gatedOrPrivateAccess,
      poolSpa: form.poolSpa,
      guestHouse: form.guestHouse,
      elevator: form.elevator,
      outdoorKitchen: form.outdoorKitchen,
      wineRoom: form.wineRoom,
      theater: form.theater,
      gym: form.gym,
      smartHome: form.smartHome,
      architectDesigner: form.architectDesigner,
      photoPrivacyPreference: form.photoPrivacyPreference,
      showingPrivacyPreference: form.showingPrivacyPreference,
      priorListingHistory: form.priorListingHistory,
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
      leadType: "seller",
      token: result.token,
    });
    trackQuizCompleted("seller", { leadId: result.leadId });

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
    setOutOfState(false);
    setStep((s) => Math.max(1, s - 1));
  };

  if (submissionView === "loading") {
    return (
      <ReportGenerationLoading
        leadType="seller"
        state={loadingState}
        mode="intake"
        onTryAgain={handleTryAgain}
      />
    );
  }

  if (outOfState) {
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
          title="Where is your property located?"
          subtitle="California properties only for direct representation."
        >
          <div className="space-y-4">
            <Input
              placeholder="Street address"
              value={form.propertyAddress?.street ?? ""}
              onChange={(e) =>
                update({
                  propertyAddress: {
                    ...form.propertyAddress,
                    street: e.target.value,
                  },
                })
              }
            />
            <Input
              placeholder="City"
              value={form.propertyAddress?.city ?? ""}
              onChange={(e) =>
                update({
                  propertyAddress: {
                    ...form.propertyAddress,
                    city: e.target.value,
                  },
                })
              }
            />
            <div className="grid grid-cols-2 gap-3">
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
          </div>
        </QuestionCard>
      )}

      {step === 2 && (
        <QuestionCard title="What is your estimated property value?">
          <div className="space-y-2">
            {BUDGET_RANGES.map((range) => (
              <OptionButton
                key={range}
                label={BUDGET_LABELS[range]}
                selected={form.estimatedValueRange === range}
                onClick={() => update({ estimatedValueRange: range })}
              />
            ))}
          </div>
        </QuestionCard>
      )}

      {step === 3 && (
        <QuestionCard title="What is the property condition?">
          <div className="space-y-2">
            {PROPERTY_CONDITIONS.map((c) => (
              <OptionButton
                key={c}
                label={conditionLabels[c]}
                selected={form.propertyCondition === c}
                onClick={() => update({ propertyCondition: c })}
              />
            ))}
          </div>
        </QuestionCard>
      )}

      {step === 4 && (
        <QuestionCard title="When are you thinking of selling?">
          <div className="space-y-2">
            {SELLING_TIMELINES.map((t) => (
              <OptionButton
                key={t}
                label={
                  t === "testing the market"
                    ? "Testing the market"
                    : TIMELINE_LABELS[t as keyof typeof TIMELINE_LABELS] ?? t
                }
                selected={form.sellingTimeline === t}
                onClick={() => update({ sellingTimeline: t })}
              />
            ))}
          </div>
        </QuestionCard>
      )}

      {step === 5 && (
        <QuestionCard title="What is your top selling priority?">
          <div className="space-y-2">
            {SELLER_PRIORITIES.map((p) => (
              <OptionButton
                key={p}
                label={priorityLabels[p]}
                selected={form.sellerPriority === p}
                onClick={() => update({ sellerPriority: p })}
              />
            ))}
          </div>
        </QuestionCard>
      )}

      {step === 6 && (
        <QuestionCard
          title="Property details & notes"
          subtitle={`Optional — helps ${getAdvisoryTeamLabel(tenant)} tailor your seller planning brief. Skip anything you are unsure about.`}
        >
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Input
              type="number"
              min={0}
              placeholder="Bedrooms"
              value={form.bedrooms ?? ""}
              onChange={(e) =>
                update({
                  bedrooms: e.target.value
                    ? Number.parseInt(e.target.value, 10)
                    : undefined,
                })
              }
            />
            <Input
              type="number"
              min={0}
              step={0.5}
              placeholder="Bathrooms"
              value={form.bathrooms ?? ""}
              onChange={(e) =>
                update({
                  bathrooms: e.target.value
                    ? Number.parseFloat(e.target.value)
                    : undefined,
                })
              }
            />
            <Input
              type="number"
              min={0}
              placeholder="Sq ft"
              value={form.squareFeet ?? ""}
              onChange={(e) =>
                update({
                  squareFeet: e.target.value
                    ? Number.parseInt(e.target.value, 10)
                    : undefined,
                })
              }
            />
            <Input
              type="number"
              min={0}
              placeholder="Lot sq ft"
              value={form.lotSize ?? ""}
              onChange={(e) =>
                update({
                  lotSize: e.target.value
                    ? Number.parseInt(e.target.value, 10)
                    : undefined,
                })
              }
            />
            <Input
              type="number"
              min={1800}
              placeholder="Year built"
              value={form.yearBuilt ?? ""}
              onChange={(e) =>
                update({
                  yearBuilt: e.target.value
                    ? Number.parseInt(e.target.value, 10)
                    : undefined,
                })
              }
            />
            <Input
              type="number"
              min={0}
              placeholder="Garage spaces"
              value={form.garageSpaces ?? ""}
              onChange={(e) =>
                update({
                  garageSpaces: e.target.value
                    ? Number.parseInt(e.target.value, 10)
                    : undefined,
                })
              }
            />
          </div>
          <div className="mb-4 space-y-2">
            <p className="text-sm text-gray-500">Property type</p>
            <div className="flex flex-wrap gap-2">
              {PROPERTY_TYPES.map((type) => (
                <OptionButton
                  key={type}
                  label={type.replace(/\b\w/g, (c) => c.toUpperCase())}
                  selected={form.propertyType === type}
                  onClick={() => update({ propertyType: type })}
                />
              ))}
            </div>
          </div>
          <div className="mb-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm text-gray-500">HOA</p>
              {SELLER_HOA_STATUSES.map((status) => (
                <OptionButton
                  key={status}
                  label={SELLER_HOA_LABELS[status]}
                  selected={form.hoaStatus === status}
                  onClick={() => update({ hoaStatus: status })}
                />
              ))}
            </div>
            <div className="space-y-2">
              <p className="text-sm text-gray-500">Pool</p>
              {SELLER_POOL_STATUSES.map((status) => (
                <OptionButton
                  key={status}
                  label={SELLER_POOL_LABELS[status]}
                  selected={form.poolStatus === status}
                  onClick={() => update({ poolStatus: status })}
                />
              ))}
            </div>
          </div>
          <Textarea
            className="mb-3"
            placeholder="Notable features (views, lot, architecture...)"
            value={form.notableFeatures ?? ""}
            onChange={(e) => update({ notableFeatures: e.target.value })}
            rows={2}
          />
          <Textarea
            className="mb-3"
            placeholder="Recent upgrades (kitchen, flooring, landscaping...)"
            value={form.recentUpgrades ?? form.upgrades ?? ""}
            onChange={(e) =>
              update({ recentUpgrades: e.target.value, upgrades: e.target.value })
            }
            rows={2}
          />
          <Textarea
            className="mb-3"
            placeholder="Buyer objections you expect (price, condition, HOA...)"
            value={form.buyerObjectionConcerns ?? ""}
            onChange={(e) =>
              update({ buyerObjectionConcerns: e.target.value })
            }
            rows={2}
          />
          <button
            type="button"
            className="mb-3 text-sm font-medium text-navy underline-offset-2 hover:underline"
            onClick={() => setShowLuxuryDetails((open) => !open)}
          >
            {showLuxuryDetails
              ? "Hide optional luxury property details"
              : "Add optional luxury property details"}
          </button>
          {showLuxuryDetails && (
            <div className="mb-4 space-y-3 rounded-xl border border-gray-100 bg-beige/20 p-4">
              <p className="text-sm text-gray-500">
                For estates and coastal properties — skip anything you are unsure
                about.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  placeholder="View type (ocean, golf, city...)"
                  value={form.viewType ?? ""}
                  onChange={(e) => update({ viewType: e.target.value })}
                />
                <Input
                  placeholder="Water proximity"
                  value={form.waterProximity ?? ""}
                  onChange={(e) => update({ waterProximity: e.target.value })}
                />
              </div>
              {(
                [
                  ["gatedOrPrivateAccess", "Gated / private access"],
                  ["poolSpa", "Pool & spa"],
                  ["guestHouse", "Guest house"],
                  ["elevator", "Elevator"],
                  ["outdoorKitchen", "Outdoor kitchen"],
                  ["wineRoom", "Wine room"],
                  ["theater", "Theater"],
                  ["gym", "Gym"],
                  ["smartHome", "Smart home"],
                ] as const
              ).map(([field, label]) => (
                <div key={field} className="space-y-1">
                  <p className="text-xs text-gray-500">{label}</p>
                  <div className="flex flex-wrap gap-2">
                    {SELLER_LUXURY_AMENITY_STATUSES.map((status) => (
                      <OptionButton
                        key={status}
                        label={SELLER_LUXURY_AMENITY_LABELS[status]}
                        selected={form[field] === status}
                        onClick={() => update({ [field]: status })}
                      />
                    ))}
                  </div>
                </div>
              ))}
              <Input
                placeholder="Architect or designer"
                value={form.architectDesigner ?? ""}
                onChange={(e) => update({ architectDesigner: e.target.value })}
              />
              <Input
                placeholder="Photo privacy preference"
                value={form.photoPrivacyPreference ?? ""}
                onChange={(e) =>
                  update({ photoPrivacyPreference: e.target.value })
                }
              />
              <Input
                placeholder="Showing privacy requirements"
                value={form.showingPrivacyPreference ?? ""}
                onChange={(e) =>
                  update({ showingPrivacyPreference: e.target.value })
                }
              />
              <Input
                placeholder="Prior listing history (if any)"
                value={form.priorListingHistory ?? ""}
                onChange={(e) =>
                  update({ priorListingHistory: e.target.value })
                }
              />
            </div>
          )}
          {form.estimatedValueRange &&
            isPremiumSellerValue(form.estimatedValueRange) &&
            !showLuxuryDetails && (
              <p className="mb-3 text-xs text-gray-500">
                For homes above $5M, luxury details help {getAdvisoryTeamLabel(tenant)}{" "}
                shape a private
                listing strategy.
              </p>
            )}
          <Textarea
            placeholder="Anything else about timing or strategy..."
            value={form.freeText ?? ""}
            onChange={(e) => update({ freeText: e.target.value })}
            rows={2}
          />
        </QuestionCard>
      )}

      {step === 7 && (
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
