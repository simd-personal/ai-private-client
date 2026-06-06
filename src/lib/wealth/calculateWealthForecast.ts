import type { WealthQuizData } from "@/lib/schemas/quiz";

export const DEFAULT_PLANNING_INTEREST_RATE = 6.75;
export const DEFAULT_PROPERTY_TAX_RATE = 1.1;
export const DEFAULT_MAINTENANCE_RATE = 1;
const LOAN_TERM_MONTHS = 360;

const SCENARIO_RATES = {
  conservative: 0.02,
  base: 0.04,
  upside: 0.06,
} as const;

export interface WealthForecastCalculations {
  purchasePrice: number | null;
  downPaymentAmount: number | null;
  loanAmount: number | null;
  loanToValue: number | null;
  interestRateUsed: number | null;
  interestRateIsAssumption: boolean;
  monthlyPrincipalInterest: number | null;
  monthlyPropertyTax: number | null;
  monthlyInsurance: number | null;
  monthlyHoa: number | null;
  monthlyMaintenance: number | null;
  estimatedMonthlyCarry: number | null;
  annualCarry: number | null;
  holdPeriodYears: number | null;
  scenarioAppreciationRates: {
    conservative: number;
    base: number;
    upside: number;
  };
  futureValueConservative: number | null;
  futureValueBase: number | null;
  futureValueUpside: number | null;
  totalAppreciationConservative: number | null;
  totalAppreciationBase: number | null;
  totalAppreciationUpside: number | null;
  estimatedLoanBalanceAtExit: number | null;
  estimatedPrincipalPaydown: number | null;
  equityConservative: number | null;
  equityBase: number | null;
  equityUpside: number | null;
  cashInvested: number | null;
  equityMultipleConservative: number | null;
  equityMultipleBase: number | null;
  equityMultipleUpside: number | null;
}

function roundCurrency(value: number): number {
  return Math.round(value);
}

function roundRatio(value: number): number {
  return Math.round(value * 100) / 100;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function resolveDownPaymentAmount(data: WealthQuizData): number | null {
  if (data.purchasePrice == null || data.purchasePrice <= 0) return null;

  if (data.downPaymentType === "cash") {
    return roundCurrency(data.purchasePrice);
  }

  if (data.downPaymentType === "percent") {
    if (data.downPaymentPercent == null) return null;
    return roundCurrency(
      data.purchasePrice * (data.downPaymentPercent / 100)
    );
  }

  if (data.downPaymentType === "amount") {
    if (data.downPaymentAmount == null) return null;
    return roundCurrency(data.downPaymentAmount);
  }

  return null;
}

function monthlyPrincipalAndInterest(
  loanAmount: number,
  annualRatePercent: number
): number {
  if (loanAmount <= 0) return 0;
  const r = annualRatePercent / 100 / 12;
  if (r === 0) return loanAmount / LOAN_TERM_MONTHS;
  const factor = Math.pow(1 + r, LOAN_TERM_MONTHS);
  return (loanAmount * r * factor) / (factor - 1);
}

function remainingLoanBalance(
  loanAmount: number,
  annualRatePercent: number,
  monthsPaid: number
): number {
  if (loanAmount <= 0) return 0;
  const months = Math.min(monthsPaid, LOAN_TERM_MONTHS);
  const r = annualRatePercent / 100 / 12;
  const payment = monthlyPrincipalAndInterest(loanAmount, annualRatePercent);
  if (r === 0) {
    return Math.max(0, loanAmount - payment * months);
  }
  const balance =
    loanAmount * Math.pow(1 + r, months) -
    payment * ((Math.pow(1 + r, months) - 1) / r);
  return Math.max(0, balance);
}

function futureValue(
  purchasePrice: number,
  annualRate: number,
  years: number
): number {
  return roundCurrency(purchasePrice * Math.pow(1 + annualRate, years));
}

function equityMultiple(
  equity: number | null,
  cashInvested: number | null
): number | null {
  if (equity == null || cashInvested == null || cashInvested <= 0) return null;
  return roundRatio(equity / cashInvested);
}

export function calculateWealthForecast(
  data: WealthQuizData
): WealthForecastCalculations {
  const purchasePrice =
    data.purchasePrice != null && data.purchasePrice > 0
      ? roundCurrency(data.purchasePrice)
      : null;

  const downPaymentAmount = resolveDownPaymentAmount(data);

  const loanAmount =
    purchasePrice != null && downPaymentAmount != null
      ? Math.max(0, roundCurrency(purchasePrice - downPaymentAmount))
      : null;

  const loanToValue =
    purchasePrice != null && loanAmount != null && purchasePrice > 0
      ? roundRatio((loanAmount / purchasePrice) * 100)
      : null;

  const interestRateIsAssumption = data.interestRate == null;
  const interestRateUsed =
    data.interestRate != null ? data.interestRate : DEFAULT_PLANNING_INTEREST_RATE;

  const monthlyPrincipalInterest =
    loanAmount != null
      ? roundCurrency(
          monthlyPrincipalAndInterest(loanAmount, interestRateUsed)
        )
      : null;

  const propertyTaxRate = data.propertyTaxRate ?? DEFAULT_PROPERTY_TAX_RATE;
  const maintenanceRate = data.maintenanceRate ?? DEFAULT_MAINTENANCE_RATE;

  const monthlyPropertyTax =
    purchasePrice != null
      ? roundCurrency((purchasePrice * propertyTaxRate) / 100 / 12)
      : null;

  const monthlyInsurance =
    data.insuranceAnnual != null
      ? roundCurrency(data.insuranceAnnual / 12)
      : null;

  const monthlyHoa =
    data.hoaMonthly != null ? roundCurrency(data.hoaMonthly) : null;

  const monthlyMaintenance =
    purchasePrice != null
      ? roundCurrency((purchasePrice * maintenanceRate) / 100 / 12)
      : null;

  const carryParts = [
    monthlyPrincipalInterest,
    monthlyPropertyTax,
    monthlyInsurance,
    monthlyHoa,
    monthlyMaintenance,
  ].filter((v): v is number => v != null);

  const estimatedMonthlyCarry =
    carryParts.length > 0
      ? roundCurrency(carryParts.reduce((sum, v) => sum + v, 0))
      : null;

  const annualCarry =
    estimatedMonthlyCarry != null
      ? roundCurrency(estimatedMonthlyCarry * 12)
      : null;

  const holdPeriodYears = data.holdPeriodYears ?? null;

  const monthsAtExit =
    holdPeriodYears != null ? holdPeriodYears * 12 : null;

  const estimatedLoanBalanceAtExit =
    loanAmount != null && monthsAtExit != null
      ? roundCurrency(
          remainingLoanBalance(loanAmount, interestRateUsed, monthsAtExit)
        )
      : loanAmount === 0
        ? 0
        : null;

  const estimatedPrincipalPaydown =
    loanAmount != null && estimatedLoanBalanceAtExit != null
      ? roundCurrency(loanAmount - estimatedLoanBalanceAtExit)
      : null;

  const cashInvested = downPaymentAmount;

  const buildScenario = (rateKey: keyof typeof SCENARIO_RATES) => {
    const rate = SCENARIO_RATES[rateKey];
    if (purchasePrice == null || holdPeriodYears == null) {
      return {
        futureValue: null as number | null,
        totalAppreciation: null as number | null,
        equity: null as number | null,
        equityMultiple: null as number | null,
      };
    }
    const fv = futureValue(purchasePrice, rate, holdPeriodYears);
    const appreciation = roundCurrency(fv - purchasePrice);
    const equity =
      estimatedLoanBalanceAtExit != null
        ? roundCurrency(fv - estimatedLoanBalanceAtExit)
        : null;
    return {
      futureValue: fv,
      totalAppreciation: appreciation,
      equity,
      equityMultiple: equityMultiple(equity, cashInvested),
    };
  };

  const conservative = buildScenario("conservative");
  const base = buildScenario("base");
  const upside = buildScenario("upside");

  return {
    purchasePrice,
    downPaymentAmount,
    loanAmount,
    loanToValue,
    interestRateUsed,
    interestRateIsAssumption,
    monthlyPrincipalInterest,
    monthlyPropertyTax,
    monthlyInsurance,
    monthlyHoa,
    monthlyMaintenance,
    estimatedMonthlyCarry,
    annualCarry,
    holdPeriodYears,
    scenarioAppreciationRates: {
      conservative: SCENARIO_RATES.conservative,
      base: SCENARIO_RATES.base,
      upside: SCENARIO_RATES.upside,
    },
    futureValueConservative: conservative.futureValue,
    futureValueBase: base.futureValue,
    futureValueUpside: upside.futureValue,
    totalAppreciationConservative: conservative.totalAppreciation,
    totalAppreciationBase: base.totalAppreciation,
    totalAppreciationUpside: upside.totalAppreciation,
    estimatedLoanBalanceAtExit,
    estimatedPrincipalPaydown,
    equityConservative: conservative.equity,
    equityBase: base.equity,
    equityUpside: upside.equity,
    cashInvested,
    equityMultipleConservative: conservative.equityMultiple,
    equityMultipleBase: base.equityMultiple,
    equityMultipleUpside: upside.equityMultiple,
  };
}
