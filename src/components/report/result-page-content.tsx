"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { BookingCta } from "@/components/booking/booking-cta";
import { PublicStrategyRoomSections } from "@/components/ai/PublicStrategyRoomSections";
import { AiDisclaimer } from "@/components/report/ai-disclaimer";
import { PrivateReviewCta } from "@/components/report/private-review-cta";
import { ReportCard } from "@/components/report/report-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trackReportViewed } from "@/lib/analytics";
import type {
  PublicBuyerReport,
  PublicEquityMoveReport,
  PublicSellerReport,
  PublicWealthForecastReport,
} from "@/lib/schemas/ai-report";
import { EQUITY_DISCLAIMER, WEALTH_DISCLAIMER } from "@/lib/constants";
import { formatCurrency } from "@/lib/equity/calculateEquityMove";
import {
  getSellerPositioningSectionTitle,
  isPremiumSellerValue,
} from "@/lib/seller/seller-tier";
import type { SellerQuizData } from "@/lib/schemas/quiz";
import type { PublicDecisionLayerData } from "@/lib/schemas/decision-layer";
import type { PublicGenerationStatus } from "@/lib/schemas/lead-generation";
import type { PublicStrategyRoomData } from "@/lib/schemas/ai-strategy-room";
import { ResultGenerationProgress } from "@/components/report/result-generation-progress";
import {
  getQuestionsForAdvisor,
} from "@/lib/schemas/ai-report";
import { useCurrentTenant } from "@/lib/tenants/current-tenant";
import {
  getAdvisorReviewFallbackLabel,
  getQuestionsForAdvisorLabel,
} from "@/lib/tenants/tenant-copy";
import { tenantPathFromPathname } from "@/lib/tenants/tenant-paths";

interface ResultApiResponse {
  leadType: "buyer" | "seller" | "equity" | "wealth_forecast";
  report:
    | PublicBuyerReport
    | PublicSellerReport
    | PublicEquityMoveReport
    | PublicWealthForecastReport
    | null;
  strategyRoom?: PublicStrategyRoomData | null;
  decisionLayer?: PublicDecisionLayerData | null;
  generation?: PublicGenerationStatus;
  createdAt: string;
  sellerEstimatedValueRange?: string;
}

function CopyPrivateLink({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  const pathname = usePathname();

  const handleCopy = async () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const resultPath = tenantPathFromPathname(pathname, "/result");
    const url = `${origin}${resultPath}?token=${encodeURIComponent(token)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <Button variant="secondary" size="sm" onClick={handleCopy}>
      {copied ? "Link Copied" : "Copy Private Link"}
    </Button>
  );
}

function formatPct(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

function BuyerReportView({
  report,
}: {
  report: PublicBuyerReport;
}) {
  const tenant = useCurrentTenant();
  return (
    <>
      <ReportCard title="Summary">
        <p className="leading-relaxed">{report.summary}</p>
      </ReportCard>

      <ReportCard title="Best-Fit Areas">
        <div className="space-y-4">
          {report.bestFitAreas.map((area) => (
            <div key={area.area} className="rounded-xl bg-beige/30 p-4">
              <div className="mb-1 flex items-center justify-between">
                <span className="font-medium text-navy">{area.area}</span>
                <Badge variant="champagne">{area.fitScore}% fit</Badge>
              </div>
              <p className="text-sm text-gray-600">{area.reason}</p>
            </div>
          ))}
        </div>
      </ReportCard>

      <ReportCard title="Budget Fit">
        <Badge
          variant={
            report.budgetFit.rating === "strong"
              ? "champagne"
              : report.budgetFit.rating === "moderate"
                ? "warm"
                : "cold"
          }
          className="mb-3 capitalize"
        >
          {report.budgetFit.rating} fit
        </Badge>
        <p className="leading-relaxed">{report.budgetFit.explanation}</p>
      </ReportCard>

      <ReportCard title="Property Recommendation">
        <p className="leading-relaxed">{report.propertyRecommendation}</p>
      </ReportCard>

      <PrivateReviewCta leadType="buyer" />

      <ReportCard title="Recommended Next Step">
        {report.recommendedNextStep}
      </ReportCard>

      <ReportCard title={getQuestionsForAdvisorLabel(tenant)}>
        <ul className="list-disc space-y-2 pl-5">
          {getQuestionsForAdvisor(report).map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ul>
      </ReportCard>
    </>
  );
}

function EquityReportView({ report }: { report: PublicEquityMoveReport }) {
  const tenant = useCurrentTenant();
  const snap = report.equitySnapshot;
  const sale = report.saleScenario;

  return (
    <>
      <ReportCard title="Summary">
        <p className="leading-relaxed">{report.publicSummary}</p>
      </ReportCard>

      <ReportCard title="Value Estimate Basis">
        <p className="mb-3 text-sm leading-relaxed text-gray-600">
          {report.valueEstimateBasis.basisNote}
        </p>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-gray-400">Planning value</dt>
            <dd className="font-medium text-navy">
              {report.valueEstimateBasis.estimatedValue != null
                ? formatCurrency(report.valueEstimateBasis.estimatedValue)
                : getAdvisorReviewFallbackLabel()}
            </dd>
          </div>
          {report.valueEstimateBasis.comparableCount != null &&
            report.valueEstimateBasis.comparableCount > 0 && (
              <div>
                <dt className="text-gray-400">Comparable context</dt>
                <dd className="font-medium text-navy">
                  {report.valueEstimateBasis.comparableCount} recent sales
                  referenced in the automated estimate
                </dd>
              </div>
            )}
          <div>
            <dt className="text-gray-400">Confidence</dt>
            <dd className="capitalize text-navy">
              {report.valueEstimateBasis.confidence}
            </dd>
          </div>
        </dl>
      </ReportCard>

      <ReportCard title="Equity Snapshot">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          {snap.estimatedAppreciation != null && (
            <div>
              <dt className="text-gray-400">Estimated appreciation</dt>
              <dd className="font-medium text-navy">
                {formatCurrency(snap.estimatedAppreciation)}
              </dd>
            </div>
          )}
          {snap.grossEquity != null && (
            <div>
              <dt className="text-gray-400">Estimated gross equity</dt>
              <dd className="font-medium text-navy">
                {formatCurrency(snap.grossEquity)}
              </dd>
            </div>
          )}
          {snap.ownershipYears != null && (
            <div>
              <dt className="text-gray-400">Years owned</dt>
              <dd className="font-medium text-navy">{snap.ownershipYears}</dd>
            </div>
          )}
          {snap.moveCategory && (
            <div>
              <dt className="text-gray-400">Equity profile</dt>
              <dd className="font-medium capitalize text-navy">
                {snap.moveCategory}
              </dd>
            </div>
          )}
        </dl>
      </ReportCard>

      <ReportCard title="Sale Scenario (Estimate)">
        <dl className="grid gap-3 text-sm">
          {sale.estimatedNetBeforeTaxLow != null &&
            sale.estimatedNetBeforeTaxHigh != null && (
              <div>
                <dt className="text-gray-400">Est. net before tax</dt>
                <dd className="font-medium text-navy">
                  {formatCurrency(sale.estimatedNetBeforeTaxLow)} –{" "}
                  {formatCurrency(sale.estimatedNetBeforeTaxHigh)}
                </dd>
              </div>
            )}
          <div>
            <dt className="text-gray-400">Selling costs (planning range)</dt>
            <dd className="text-navy">{sale.sellingCostRange}</dd>
          </div>
          {sale.potentialTaxableGainEstimate != null && (
            <div>
              <dt className="text-gray-400">Potential taxable gain (planning)</dt>
              <dd className="font-medium text-navy">
                {formatCurrency(sale.potentialTaxableGainEstimate)}
              </dd>
            </div>
          )}
        </dl>
        <p className="mt-4 text-xs text-gray-500">{EQUITY_DISCLAIMER}</p>
      </ReportCard>

      <ReportCard title="Tax Planning Note">
        <p className="leading-relaxed">{report.taxPlanningNote}</p>
      </ReportCard>

      <ReportCard title="Next Move Strategy">
        <p className="leading-relaxed">{report.nextMoveStrategy}</p>
      </ReportCard>

      <PrivateReviewCta leadType="equity" />

      <ReportCard title="Recommended Next Step">
        {report.recommendedNextStep}
      </ReportCard>

      <ReportCard title={getQuestionsForAdvisorLabel(tenant)}>
        <ul className="list-disc space-y-2 pl-5">
          {getQuestionsForAdvisor(report).map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ul>
      </ReportCard>
    </>
  );
}

function WealthForecastReportView({
  report,
}: {
  report: PublicWealthForecastReport;
}) {
  const tenant = useCurrentTenant();
  const snap = report.forecastSnapshot;
  const scenarios = report.scenarioComparison;

  const scenarioRows = [
    { key: "Conservative", data: scenarios.conservative },
    { key: "Base", data: scenarios.base },
    { key: "Upside", data: scenarios.upside },
  ] as const;

  return (
    <>
      <ReportCard title="Summary">
        <p className="leading-relaxed">{report.publicSummary}</p>
      </ReportCard>

      <ReportCard title="Forecast Snapshot">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          {snap.purchasePrice != null && (
            <div>
              <dt className="text-gray-400">Purchase price</dt>
              <dd className="font-medium text-navy">
                {formatCurrency(snap.purchasePrice)}
              </dd>
            </div>
          )}
          {snap.downPaymentAmount != null && (
            <div>
              <dt className="text-gray-400">Down payment</dt>
              <dd className="font-medium text-navy">
                {formatCurrency(snap.downPaymentAmount)}
              </dd>
            </div>
          )}
          {snap.loanAmount != null && (
            <div>
              <dt className="text-gray-400">Loan amount</dt>
              <dd className="font-medium text-navy">
                {formatCurrency(snap.loanAmount)}
              </dd>
            </div>
          )}
          {snap.loanToValue != null && (
            <div>
              <dt className="text-gray-400">Loan-to-value</dt>
              <dd className="font-medium text-navy">{snap.loanToValue}%</dd>
            </div>
          )}
          {snap.holdPeriodYears != null && (
            <div>
              <dt className="text-gray-400">Hold period</dt>
              <dd className="font-medium text-navy">
                {snap.holdPeriodYears} years
              </dd>
            </div>
          )}
          <div>
            <dt className="text-gray-400">Property use</dt>
            <dd className="font-medium text-navy">{snap.propertyUse}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-gray-400">Target locations</dt>
            <dd className="font-medium text-navy">
              {snap.targetLocations.join(", ")}
            </dd>
          </div>
          {snap.estimatedMonthlyCarry != null && (
            <div>
              <dt className="text-gray-400">Est. monthly carry</dt>
              <dd className="font-medium text-navy">
                {formatCurrency(snap.estimatedMonthlyCarry)}
              </dd>
            </div>
          )}
        </dl>
      </ReportCard>

      <ReportCard title="Scenario Comparison (Planning Model)">
        <div className="space-y-4">
          {scenarioRows.map(({ key, data }) => (
            <div key={key} className="rounded-xl bg-beige/30 p-4">
              <p className="mb-2 font-medium text-navy">{key} scenario</p>
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-gray-400">Annual appreciation assumption</dt>
                  <dd>{formatPct(data.annualAppreciation)}</dd>
                </div>
                {data.futureValue != null && (
                  <div>
                    <dt className="text-gray-400">Modeled future value</dt>
                    <dd className="font-medium text-navy">
                      {formatCurrency(data.futureValue)}
                    </dd>
                  </div>
                )}
                {data.estimatedEquity != null && (
                  <div>
                    <dt className="text-gray-400">Estimated equity at exit</dt>
                    <dd className="font-medium text-navy">
                      {formatCurrency(data.estimatedEquity)}
                    </dd>
                  </div>
                )}
                {data.equityMultiple != null && (
                  <div>
                    <dt className="text-gray-400">Equity multiple on cash in</dt>
                    <dd className="font-medium text-navy">
                      {data.equityMultiple}x
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-gray-500">{WEALTH_DISCLAIMER}</p>
      </ReportCard>

      <ReportCard title="Leverage Strategy">
        <p className="leading-relaxed">{report.leverageStrategy}</p>
      </ReportCard>

      <ReportCard title="Ownership Cost Notes">
        <p className="leading-relaxed">{report.ownershipCostNotes}</p>
      </ReportCard>

      <ReportCard title="Tax Planning Topics to Review">
        <ul className="list-disc space-y-2 pl-5">
          {report.taxPlanningTopics.map((topic) => (
            <li key={topic}>{topic}</li>
          ))}
        </ul>
      </ReportCard>

      <PrivateReviewCta leadType="wealth_forecast" />

      <ReportCard title="Recommended Next Step">
        {report.recommendedNextStep}
      </ReportCard>

      <ReportCard title={getQuestionsForAdvisorLabel(tenant)}>
        <ul className="list-disc space-y-2 pl-5">
          {getQuestionsForAdvisor(report).map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ul>
      </ReportCard>
    </>
  );
}

function SellerReportView({
  report,
  estimatedValueRange,
}: {
  report: PublicSellerReport;
  estimatedValueRange?: string;
}) {
  const tenant = useCurrentTenant();
  const positioningTitle =
    estimatedValueRange &&
    isPremiumSellerValue(
      estimatedValueRange as SellerQuizData["estimatedValueRange"]
    )
      ? getSellerPositioningSectionTitle(
          estimatedValueRange as SellerQuizData["estimatedValueRange"]
        )
      : "Market Positioning";

  return (
    <>
      <ReportCard title="Summary">
        <p className="leading-relaxed">{report.summary}</p>
      </ReportCard>
      <ReportCard title="Seller Strategy">
        <p className="leading-relaxed">{report.sellerStrategy}</p>
      </ReportCard>
      <ReportCard title={positioningTitle}>
        <p className="leading-relaxed">{report.positioningAngle}</p>
      </ReportCard>
      <ReportCard title="Preparation Recommendations">
        <ul className="list-disc space-y-2 pl-5">
          {report.prepRecommendations.map((rec) => (
            <li key={rec}>{rec}</li>
          ))}
        </ul>
      </ReportCard>
      <PrivateReviewCta leadType="seller" />
      <ReportCard title="Recommended Next Step">
        {report.recommendedNextStep}
      </ReportCard>
      <ReportCard title={getQuestionsForAdvisorLabel(tenant)}>
        <ul className="list-disc space-y-2 pl-5">
          {getQuestionsForAdvisor(report).map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ul>
      </ReportCard>
    </>
  );
}

function ReportNotFound() {
  return (
    <div className="mx-auto max-w-lg px-6 py-20 text-center">
      <h1 className="mb-4 font-serif text-2xl text-navy">Report Not Found</h1>
      <p className="mb-8 text-gray-500">
        This plan link may be invalid or expired. Please complete the quiz again.
      </p>
      <Link href="/">
        <Button>Return Home</Button>
      </Link>
    </div>
  );
}

function ResultByToken({ token }: { token: string }) {
  const pathname = usePathname();
  const [data, setData] = useState<ResultApiResponse | null>(null);
  const [generationStatus, setGenerationStatus] =
    useState<PublicGenerationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progressDismissed, setProgressDismissed] = useState(false);

  const fetchResult = async () => {
    const res = await fetch(`/api/leads/result/${encodeURIComponent(token)}`);
    const json = await res.json();
    if (!res.ok) {
      throw new Error("not_found");
    }
    return json as ResultApiResponse;
  };

  const fetchStatus = async () => {
    const res = await fetch(
      `/api/leads/result/${encodeURIComponent(token)}/status`
    );
    if (!res.ok) return null;
    return (await res.json()) as PublicGenerationStatus;
  };

  useEffect(() => {
    let cancelled = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    async function load() {
      try {
        const [resultJson, statusJson] = await Promise.all([
          fetchResult(),
          fetchStatus(),
        ]);

        if (cancelled) return;

        setData(resultJson);
        setGenerationStatus(statusJson ?? resultJson.generation ?? null);
        setLoading(false);
        trackReportViewed({ token, leadType: resultJson.leadType });

        const done =
          statusJson?.isReady ||
          statusJson?.generationStatus === "complete" ||
          statusJson?.generationStatus === "failed";

        if (!done) {
          pollTimer = setInterval(() => {
            void (async () => {
              try {
                const [nextResult, nextStatus] = await Promise.all([
                  fetchResult(),
                  fetchStatus(),
                ]);
                if (cancelled) return;
                setData(nextResult);
                setGenerationStatus(nextStatus ?? nextResult.generation ?? null);

                if (
                  nextStatus?.isReady ||
                  nextStatus?.generationStatus === "complete" ||
                  nextStatus?.generationStatus === "failed"
                ) {
                  if (pollTimer) clearInterval(pollTimer);
                }
              } catch {
                /* keep polling */
              }
            })();
          }, 2500);
        }
      } catch {
        if (!cancelled) {
          setError("not_found");
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-gray-400">
        Opening your private brief workspace...
      </div>
    );
  }

  if (error || !data) {
    return <ReportNotFound />;
  }

  const showProgress =
    generationStatus &&
    !generationStatus.isReady &&
    generationStatus.generationStatus !== "complete" &&
    !progressDismissed;

  const hasReport = data.report != null;
  const hasPartialContent =
    hasReport ||
    Boolean(data.strategyRoom?.strategyRoom) ||
    Boolean(data.decisionLayer?.decisionGraph);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mx-auto max-w-2xl px-6 py-12"
    >
      {showProgress && generationStatus ? (
        <ResultGenerationProgress
          status={generationStatus}
          showContinue={hasPartialContent}
          onContinue={() => setProgressDismissed(true)}
        />
      ) : null}

      {hasReport ? (
        <>
          <p className="mb-2 text-xs tracking-[0.2em] text-champagne uppercase">
            Your Private Plan
          </p>
          <h1 className="mb-8 font-serif text-3xl text-navy md:text-4xl">
            {(data.report as PublicBuyerReport).reportTitle}
          </h1>
        </>
      ) : (
        <div className="mb-8">
          <p className="mb-2 text-xs tracking-[0.2em] text-champagne uppercase">
            Your Private Plan
          </p>
          <h1 className="font-serif text-3xl text-navy md:text-4xl">
            Private Client Brief
          </h1>
          <p className="mt-3 text-sm text-gray-600">
            Your base report is still being prepared. Additional sections will
            appear below as they become ready.
          </p>
        </div>
      )}

      <div className="mb-8 space-y-6">
        {hasReport ? (
          data.leadType === "buyer" ? (
            <BuyerReportView report={data.report as PublicBuyerReport} />
          ) : data.leadType === "seller" ? (
            <SellerReportView
              report={data.report as PublicSellerReport}
              estimatedValueRange={data.sellerEstimatedValueRange}
            />
          ) : data.leadType === "equity" ? (
            <EquityReportView report={data.report as PublicEquityMoveReport} />
          ) : (
            <WealthForecastReportView
              report={data.report as PublicWealthForecastReport}
            />
          )
        ) : null}

        <PublicStrategyRoomSections
          data={data.strategyRoom ?? null}
          decisionLayer={data.decisionLayer ?? null}
          recommendedNextStep={
            hasReport
              ? (data.report as { recommendedNextStep?: string })
                  .recommendedNextStep
              : undefined
          }
        />
      </div>

      <AiDisclaimer />

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <BookingCta location="result_page" fullWidth />
        </div>
        <CopyPrivateLink token={token} />
        <Link href={tenantPathFromPathname(pathname, "/")} className="flex-1">
          <Button variant="secondary" className="w-full" size="lg">
            Return Home
          </Button>
        </Link>
      </div>
    </motion.div>
  );
}

function ResultContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  if (!token) return <ReportNotFound />;

  return <ResultByToken token={token} />;
}

export function ResultPageContent() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center text-gray-400">
          Loading your plan...
        </div>
      }
    >
      <ResultContent />
    </Suspense>
  );
}
