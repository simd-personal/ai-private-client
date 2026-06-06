"use client";

import type { EquityPropertyIntelligence } from "@/lib/property/equityPropertyTypes";
import type { CurrentValueSource } from "@/lib/property/equityPropertyTypes";
import { formatCurrency } from "@/lib/equity/calculateEquityMove";

function formatSourceLabel(source: CurrentValueSource): string {
  switch (source) {
    case "rentcast_estimate":
      return "RentCast planning estimate (accepted)";
    case "user_adjusted":
      return "Homeowner adjusted estimate";
    case "user_provided":
      return "Homeowner provided estimate";
    default:
      return "Unknown — confirm with homeowner";
  }
}

export function AdminEquityPropertyIntelligenceSection({
  intelligence,
  currentValueSource,
  userUsedValue,
}: {
  intelligence: EquityPropertyIntelligence | null | undefined;
  currentValueSource?: CurrentValueSource;
  userUsedValue?: number | null;
}) {
  if (!intelligence) return null;

  return (
    <div className="mb-4 rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-4 text-sm">
      <p className="mb-3 font-medium text-navy">Equity Property Intelligence</p>

      <div className="mb-3 space-y-1 text-xs text-gray-600">
        <p>
          <span className="text-gray-400">Normalized address: </span>
          {intelligence.normalizedAddress}
        </p>
        <p>
          <span className="text-gray-400">Address confidence: </span>
          {intelligence.addressConfidence}
        </p>
        {currentValueSource && (
          <p>
            <span className="text-gray-400">Current value source: </span>
            {formatSourceLabel(currentValueSource)}
          </p>
        )}
        <p>
          <span className="text-gray-400">Estimation confidence: </span>
          {intelligence.estimationConfidence}
        </p>
      </div>

      {userUsedValue != null && userUsedValue > 0 && (
        <p className="mb-2 text-sm text-gray-700">
          <span className="text-gray-400">Value used in calculations: </span>
          {formatCurrency(userUsedValue)}
        </p>
      )}

      {intelligence.estimatedValue != null &&
        userUsedValue != null &&
        userUsedValue > 0 &&
        Math.round(intelligence.estimatedValue) !== Math.round(userUsedValue) && (
          <p className="mb-2 text-sm text-amber-800">
            <span className="text-gray-400">Difference vs RentCast AVM: </span>
            {formatCurrency(userUsedValue - intelligence.estimatedValue)}
          </p>
        )}

      {(intelligence.estimatedValue != null ||
        intelligence.estimatedValueLow != null) && (
        <div className="mb-3 grid gap-1 sm:grid-cols-2">
          {intelligence.estimatedValue != null && (
            <p className="text-sm text-gray-700">
              <span className="text-gray-400">RentCast AVM: </span>
              {formatCurrency(intelligence.estimatedValue)}
            </p>
          )}
          {intelligence.estimatedValueLow != null &&
            intelligence.estimatedValueHigh != null && (
              <p className="text-sm text-gray-700">
                <span className="text-gray-400">Estimate range: </span>
                {formatCurrency(intelligence.estimatedValueLow)} –{" "}
                {formatCurrency(intelligence.estimatedValueHigh)}
              </p>
            )}
          <p className="text-sm text-gray-700">
            <span className="text-gray-400">Comparable count: </span>
            {intelligence.comparableCount}
          </p>
        </div>
      )}

      {intelligence.compsSummary.length > 0 && (
        <div className="mb-3">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">
            Comparable sale context (admin)
          </p>
          <ul className="list-inside list-disc text-xs text-gray-600">
            {intelligence.compsSummary.slice(0, 5).map((comp, index) => (
              <li key={index}>
                {comp.salePrice != null
                  ? formatCurrency(comp.salePrice)
                  : "Sale price n/a"}
                {comp.saleDate ? ` · ${comp.saleDate.slice(0, 10)}` : ""}
                {comp.bedrooms != null ? ` · ${comp.bedrooms} bed` : ""}
                {comp.bathrooms != null ? ` · ${comp.bathrooms} bath` : ""}
                {comp.squareFeet != null
                  ? ` · ${comp.squareFeet.toLocaleString()} sq ft`
                  : ""}
                {comp.distanceMiles != null
                  ? ` · ${comp.distanceMiles.toFixed(2)} mi`
                  : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      {intelligence.missingDataQuestions.length > 0 && (
        <div className="mb-3">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">
            Missing data questions
          </p>
          <ul className="list-inside list-disc text-gray-600">
            {intelligence.missingDataQuestions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-gray-400">
        Data sources: {intelligence.dataSources.join(", ") || "none"}
      </p>
    </div>
  );
}
