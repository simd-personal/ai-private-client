import type { AdminFiltersState } from "@/components/admin/admin-lead-filters";
import type { AdminLead } from "@/components/admin/admin-lead-table";

export function filterAndSortLeads(
  leads: AdminLead[],
  filters: AdminFiltersState
): AdminLead[] {
  let result = [...leads];

  if (filters.leadType !== "all") {
    result = result.filter((l) => l.lead_type === filters.leadType);
  }

  if (filters.temperature !== "all") {
    result = result.filter((l) => l.lead_temperature === filters.temperature);
  }

  if (filters.status !== "all") {
    result = result.filter((l) => l.status === filters.status);
  }

  if (filters.pipelineStatus !== "all") {
    result = result.filter(
      (l) => (l.lead_status ?? "new") === filters.pipelineStatus
    );
  }

  if (filters.search.trim()) {
    const q = filters.search.toLowerCase();
    result = result.filter((lead) => {
      const city =
        lead.quiz_data.leadType === "seller"
          ? lead.quiz_data.propertyAddress.city
          : lead.quiz_data.leadType === "equity"
            ? lead.quiz_data.currentHomeCity
            : lead.quiz_data.leadType === "wealth_forecast"
              ? lead.quiz_data.targetLocations.join(" ")
              : "";
      const haystack = [
        lead.first_name,
        lead.last_name,
        lead.email,
        lead.phone ?? "",
        city,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }

  if (filters.sort === "score") {
    result.sort((a, b) => b.lead_score - a.lead_score);
  } else if (filters.sort === "follow_up") {
    result.sort((a, b) => {
      const aTime = a.next_follow_up_at
        ? new Date(a.next_follow_up_at).getTime()
        : Number.POSITIVE_INFINITY;
      const bTime = b.next_follow_up_at
        ? new Date(b.next_follow_up_at).getTime()
        : Number.POSITIVE_INFINITY;
      return aTime - bTime;
    });
  } else {
    result.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  return result;
}
