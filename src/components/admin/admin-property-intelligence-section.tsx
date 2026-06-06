"use client";

import type { PropertyIntelligence } from "@/lib/property/types";
import { formatCurrency } from "@/lib/equity/calculateEquityMove";

function FactGrid({
  title,
  entries,
}: {
  title: string;
  entries: Array<[string, string | number | undefined]>;
}) {
  const visible = entries.filter(([, v]) => v != null && v !== "");
  if (visible.length === 0) return null;

  return (
    <div className="mb-3">
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">
        {title}
      </p>
      <div className="grid gap-1 sm:grid-cols-2">
        {visible.map(([label, value]) => (
          <div key={label} className="text-sm text-gray-700">
            <span className="text-gray-400">{label}: </span>
            {value}
          </div>
        ))}
      </div>
    </div>
  );
}

function formatOptionalCurrency(value?: number): string | undefined {
  if (value == null || !Number.isFinite(value)) return undefined;
  return formatCurrency(value);
}

export function AdminPropertyIntelligenceSection({
  intelligence,
}: {
  intelligence: PropertyIntelligence | null | undefined;
}) {
  if (!intelligence) return null;

  const seller = intelligence.sellerProvidedFacts;
  const rentCast = intelligence.rentCastFacts;

  return (
    <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm">
      <p className="mb-3 font-medium text-navy">Property Intelligence</p>

      <div className="mb-3 space-y-1 text-xs text-gray-600">
        <p>
          <span className="text-gray-400">Submitted address: </span>
          {intelligence.submittedAddress}
        </p>
        <p>
          <span className="text-gray-400">Google normalized: </span>
          {intelligence.normalizedAddress}
        </p>
        <p>
          <span className="text-gray-400">Address match: </span>
          {intelligence.addressMatchConfidence}
          {intelligence.addressDiscrepancy ? " (discrepancy flagged)" : ""}
        </p>
      </div>

      {intelligence.addressDiscrepancy && (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-sm text-amber-950">
          <p className="font-medium">Address validation mismatch</p>
          <p className="mt-1">
            Submitted: {intelligence.submittedAddress}
          </p>
          <p>Google normalized: {intelligence.normalizedAddress}</p>
        </div>
      )}

      <FactGrid
        title="Seller provided facts"
        entries={[
          ["Bedrooms", seller.bedrooms],
          ["Bathrooms", seller.bathrooms],
          ["Sq ft", seller.squareFeet],
          ["Lot size", seller.lotSize],
          ["Year built", seller.yearBuilt],
          ["Type", seller.propertyType],
          ["HOA", seller.hoaStatus],
          ["Pool", seller.poolStatus],
          ["Garage spaces", seller.garageSpaces],
          ["Notable features", seller.notableFeatures],
          ["Recent upgrades", seller.recentUpgrades],
          ["Buyer objections", seller.buyerObjectionConcerns],
        ]}
      />

      {rentCast && (
        <FactGrid
          title="RentCast facts"
          entries={[
            ["Bedrooms", rentCast.bedrooms],
            ["Bathrooms", rentCast.bathrooms],
            ["Sq ft", rentCast.squareFeet],
            ["Lot size", rentCast.lotSize],
            ["Year built", rentCast.yearBuilt],
            ["Type", rentCast.propertyType],
            ["Last sale date", rentCast.lastSaleDate],
            [
              "Last sale price",
              formatOptionalCurrency(rentCast.lastSalePrice),
            ],
            [
              "Assessed value",
              formatOptionalCurrency(rentCast.assessedValue),
            ],
            [
              "Est. value (internal)",
              formatOptionalCurrency(rentCast.estimatedValue),
            ],
            [
              "Rent estimate",
              rentCast.rentEstimate != null
                ? `${formatCurrency(rentCast.rentEstimate)}/mo`
                : undefined,
            ],
          ]}
        />
      )}

      {intelligence.rentCastMismatches.length > 0 && (
        <div className="mb-3">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">
            RentCast vs seller comparison
          </p>
          <div className="overflow-x-auto rounded border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-gray-500">
                  <th className="px-2 py-1.5 font-medium">Field</th>
                  <th className="px-2 py-1.5 font-medium">Seller</th>
                  <th className="px-2 py-1.5 font-medium">RentCast</th>
                </tr>
              </thead>
              <tbody>
                {intelligence.rentCastMismatches.map((row) => (
                  <tr
                    key={row.field}
                    className="border-b border-slate-50 last:border-0"
                  >
                    <td className="px-2 py-1.5 text-gray-600">{row.label}</td>
                    <td className="px-2 py-1.5">{row.sellerValue}</td>
                    <td className="px-2 py-1.5">{row.rentCastValue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {intelligence.googleLocationContext && (
        <div className="mb-3">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">
            Google context
          </p>
          <p className="text-sm text-gray-700">
            {intelligence.googleLocationContext.locationContext}
          </p>
          {intelligence.googleLocationContext.nearbyPlaces.length > 0 && (
            <p className="mt-1 text-xs text-gray-500">
              Nearby:{" "}
              {intelligence.googleLocationContext.nearbyPlaces
                .map((p) => p.name)
                .join(", ")}
            </p>
          )}
        </div>
      )}

      {intelligence.prepFocusAreas.length > 0 && (
        <div className="mb-3">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">
            Prep focus areas
          </p>
          <ul className="list-inside list-disc text-gray-700">
            {intelligence.prepFocusAreas.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {intelligence.buyerObjectionRisks.length > 0 && (
        <div className="mb-3">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">
            Buyer objection risks
          </p>
          <ul className="list-inside list-disc text-gray-700">
            {intelligence.buyerObjectionRisks.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {intelligence.missingDataQuestions.length > 0 && (
        <div className="mb-3">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">
            Missing data questions (admin)
          </p>
          <ul className="list-inside list-disc text-gray-600">
            {intelligence.missingDataQuestions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-gray-400">
        Data sources: {intelligence.dataSources.join(", ")}
      </p>
    </div>
  );
}
