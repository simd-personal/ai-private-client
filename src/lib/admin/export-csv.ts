import {
  BUDGET_LABELS,
  EQUITY_TIMELINE_LABELS,
  TIMELINE_LABELS,
  WEALTH_TIMELINE_LABELS,
} from "@/lib/constants";
import type { AdminLead } from "@/components/admin/admin-lead-table";
import { formatCurrency } from "@/lib/equity/calculateEquityMove";

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function getTimeline(lead: AdminLead): string {
  const q = lead.quiz_data;
  if (q.leadType === "buyer") return TIMELINE_LABELS[q.timeline] ?? q.timeline;
  if (q.leadType === "equity") {
    return EQUITY_TIMELINE_LABELS[q.timeline] ?? q.timeline;
  }
  if (q.leadType === "wealth_forecast") {
    return WEALTH_TIMELINE_LABELS[q.timeline] ?? q.timeline;
  }
  const key = q.sellingTimeline as keyof typeof TIMELINE_LABELS;
  return TIMELINE_LABELS[key] ?? q.sellingTimeline;
}

function getBudgetOrValue(lead: AdminLead): string {
  const q = lead.quiz_data;
  if (q.leadType === "equity") {
    return q.estimatedCurrentValue != null
      ? formatCurrency(q.estimatedCurrentValue)
      : "Value TBD";
  }
  if (q.leadType === "wealth_forecast") {
    return formatCurrency(q.purchasePrice);
  }
  const range =
    q.leadType === "buyer" ? q.budgetRange : q.estimatedValueRange;
  return BUDGET_LABELS[range] ?? range;
}

function getLocation(lead: AdminLead): string {
  const q = lead.quiz_data;
  if (q.leadType === "buyer") return q.desiredLocations.join("; ");
  if (q.leadType === "equity") {
    return `${q.currentHomeCity}, ${q.currentHomeState}`;
  }
  if (q.leadType === "wealth_forecast") {
    return q.targetLocations.join("; ");
  }
  return `${q.propertyAddress.city}, ${q.propertyAddress.state}`;
}

export function exportLeadsToCsv(leads: AdminLead[]): void {
  const headers = [
    "Name",
    "Type",
    "Email",
    "Phone",
    "Score",
    "Temperature",
    "Status",
    "Timeline",
    "Budget/Value",
    "Location",
    "UTM Source",
    "Created",
    "Internal Summary",
    "Follow-Up Message",
    "Notes",
  ];

  const rows = leads.map((lead) => [
    `${lead.first_name} ${lead.last_name}`,
    lead.lead_type,
    lead.email,
    lead.phone ?? "",
    String(lead.lead_score),
    lead.lead_temperature,
    lead.status,
    getTimeline(lead),
    getBudgetOrValue(lead),
    getLocation(lead),
    lead.utm_source ?? "",
    new Date(lead.created_at).toISOString(),
    lead.internal_lead_summary,
    lead.suggested_follow_up_message,
    lead.admin_notes ?? "",
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map(escapeCsv).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `private-client-leads-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
