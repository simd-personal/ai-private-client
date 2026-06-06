"use client";

import { useMemo } from "react";
import {
  ACTIVE_PIPELINE_STATUSES,
  APPOINTMENT_PIPELINE_STATUSES,
} from "@/lib/constants";
import { formatCurrency } from "@/lib/equity/calculateEquityMove";
import type { AdminLead } from "@/components/admin/admin-lead-table";

const appointmentSet = new Set<string>(APPOINTMENT_PIPELINE_STATUSES);
const activeSet = new Set<string>(ACTIVE_PIPELINE_STATUSES);

export function AdminPipelineSummary({ leads }: { leads: AdminLead[] }) {
  const summary = useMemo(() => {
    let newLeads = 0;
    let contacted = 0;
    let appointments = 0;
    let activeClients = 0;
    let closed = 0;
    let pipelineValue = 0;

    for (const lead of leads) {
      const status = lead.lead_status ?? "new";
      if (status === "new") newLeads += 1;
      if (status === "contacted") contacted += 1;
      if (appointmentSet.has(status)) appointments += 1;
      if (status === "active_client") activeClients += 1;
      if (status === "closed") closed += 1;
      if (activeSet.has(status) && lead.estimated_deal_value != null) {
        pipelineValue += lead.estimated_deal_value;
      }
    }

    return {
      newLeads,
      contacted,
      appointments,
      activeClients,
      closed,
      pipelineValue,
    };
  }, [leads]);

  const cards = [
    { label: "New leads", value: String(summary.newLeads) },
    { label: "Contacted", value: String(summary.contacted) },
    { label: "Appointments", value: String(summary.appointments) },
    { label: "Active clients", value: String(summary.activeClients) },
    { label: "Closed", value: String(summary.closed) },
    { label: "Est. pipeline value", value: formatCurrency(summary.pipelineValue) },
  ];

  return (
    <section className="mb-8 grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
        >
          <p className="text-xs tracking-[0.14em] text-gray-500 uppercase">
            {card.label}
          </p>
          <p className="mt-2 font-serif text-2xl text-navy">{card.value}</p>
        </div>
      ))}
    </section>
  );
}
