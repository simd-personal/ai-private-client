"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LeadConcierge } from "@/lib/schemas/lead-concierge";

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <Button variant="ghost" size="sm" onClick={handleCopy} className="gap-1">
      {copied ? (
        <>
          <Check className="h-3 w-3" /> Copied
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" /> Copy {label}
        </>
      )}
    </Button>
  );
}

function ConciergeField({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-3">
      <p className="mb-1 font-medium text-navy">{label}</p>
      <p className="text-gray-600">{value}</p>
    </div>
  );
}

function ConciergeFieldWithCopy({
  label,
  value,
  copyLabel,
}: {
  label: string;
  value: string;
  copyLabel: string;
}) {
  return (
    <div className="mb-3">
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="font-medium text-navy">{label}</p>
        <CopyButton text={value} label={copyLabel} />
      </div>
      <p className="text-gray-600">{value}</p>
    </div>
  );
}

interface AdminLeadConciergeSectionProps {
  concierge: LeadConcierge | null;
}

export function AdminLeadConciergeSection({
  concierge,
}: AdminLeadConciergeSectionProps) {
  if (!concierge) return null;

  return (
    <div className="mb-4 rounded-xl border border-navy/10 bg-navy/5 p-4 text-sm">
      <p className="mb-3 font-serif text-lg text-navy">Lead Concierge</p>

      <ConciergeField
        label="Lead priority reason"
        value={concierge.leadPriorityReason}
      />

      <ConciergeFieldWithCopy
        label="Suggested call opener"
        value={concierge.callOpener}
        copyLabel="Call opener"
      />

      <ConciergeFieldWithCopy
        label="Suggested SMS"
        value={concierge.smsFollowUp}
        copyLabel="SMS"
      />

      <ConciergeFieldWithCopy
        label="Suggested email"
        value={concierge.emailFollowUp}
        copyLabel="Email"
      />

      <div className="mb-3">
        <p className="mb-1 font-medium text-navy">Objections to expect</p>
        <ul className="list-disc space-y-1 pl-5 text-gray-600">
          {concierge.objectionsToExpect.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <ConciergeField
        label="Recommended follow-up timeline"
        value={concierge.recommendedFollowUpTimeline}
      />

      <ConciergeField label="Next best action" value={concierge.nextBestAction} />
    </div>
  );
}
