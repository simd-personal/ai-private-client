"use client";

import { useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { adminFetch } from "@/lib/admin/admin-fetch";
import type { DataRoomItem, DocumentSummary } from "@/lib/schemas/decision-layer";

const STATUS_LABELS: Record<DataRoomItem["status"], string> = {
  not_requested: "Not requested",
  requested: "Requested",
  received: "Received",
  reviewed: "Reviewed",
  not_needed: "Not needed",
};

function formatFileSize(bytes: number | null): string {
  if (bytes == null || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function summaryToClipboardText(summary: DocumentSummary): string {
  return [
    summary.summaryTitle,
    "",
    `Document type (guess): ${summary.documentTypeGuess}`,
    "",
    "Extracted facts for review:",
    ...summary.extractedFactsForReview.map((f) => `• ${f}`),
    "",
    "Possible planning topics:",
    ...summary.possiblePlanningTopics.map((t) => `• ${t}`),
    "",
    "Advisor review needed:",
    ...summary.advisorReviewNeeded.map((a) => `• ${a}`),
    "",
    "Missing or unclear items:",
    ...summary.missingOrUnclearItems.map((m) => `• ${m}`),
    "",
    summary.cautionNote,
  ].join("\n");
}

interface DataRoomItemRowProps {
  leadId: string;
  item: DataRoomItem;
  admin?: boolean;
  onStatusChange?: (status: DataRoomItem["status"]) => void;
  onRefresh?: () => void;
}

export function DataRoomItemRow({
  leadId,
  item,
  admin,
  onStatusChange,
  onRefresh,
}: DataRoomItemRowProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const hasFile = Boolean(item.storage_path && item.file_name);
  const summary = item.ai_document_summary as DocumentSummary | null | undefined;

  const uploadFile = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await adminFetch(
        `/api/leads/${leadId}/data-room/${item.id}/upload`,
        { method: "POST", body: form }
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Upload failed");
        return;
      }
      onRefresh?.();
    } catch {
      setError("Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const downloadFile = async () => {
    setDownloading(true);
    setError(null);
    try {
      const res = await adminFetch(
        `/api/leads/${leadId}/data-room/${item.id}/download`
      );
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? "Download failed");
        return;
      }
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch {
      setError("Download failed");
    } finally {
      setDownloading(false);
    }
  };

  const generateSummary = async () => {
    setSummarizing(true);
    setError(null);
    try {
      const res = await adminFetch(
        `/api/leads/${leadId}/data-room/${item.id}/summarize`,
        { method: "POST" }
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Summary generation failed");
        return;
      }
      onRefresh?.();
    } catch {
      setError("Summary generation failed");
    } finally {
      setSummarizing(false);
    }
  };

  const copySummary = async () => {
    if (!summary) return;
    await navigator.clipboard.writeText(summaryToClipboardText(summary));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg border border-gray-100 bg-white p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-navy">{item.item_name}</p>
          {item.description && (
            <p className="mt-0.5 text-xs text-gray-500">{item.description}</p>
          )}
          {admin && item.advisor_owner && (
            <p className="mt-1 text-xs text-gray-400">
              Advisor owner: {item.advisor_owner}
            </p>
          )}
          {admin && item.ai_reason && (
            <p className="mt-1 text-xs italic text-gray-400">{item.ai_reason}</p>
          )}

          {admin && hasFile && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
              <span className="font-medium text-charcoal">{item.file_name}</span>
              <span>{formatFileSize(item.file_size_bytes)}</span>
              <Badge variant="outline">File received</Badge>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{item.priority}</Badge>
          {admin && onStatusChange ? (
            <select
              value={item.status}
              onChange={(e) =>
                onStatusChange(e.target.value as DataRoomItem["status"])
              }
              className="rounded-md border border-gray-200 px-2 py-1 text-xs"
            >
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          ) : (
            <Badge>{STATUS_LABELS[item.status]}</Badge>
          )}
        </div>
      </div>

      {admin && (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-gray-50 pt-3">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,application/pdf,image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadFile(file);
            }}
          />

          {!hasFile ? (
            <Button
              size="sm"
              variant="secondary"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? "Uploading…" : "Upload"}
            </Button>
          ) : (
            <>
              <Button
                size="sm"
                variant="secondary"
                disabled={downloading}
                onClick={() => void downloadFile()}
              >
                {downloading ? "Opening…" : "Download"}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? "Replacing…" : "Replace file"}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={summarizing}
                onClick={() => void generateSummary()}
              >
                {summarizing ? "Generating…" : "Generate Summary"}
              </Button>
            </>
          )}
        </div>
      )}

      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}

      {admin && summary && (
        <div className="mt-3 rounded-lg border border-champagne/30 bg-beige/20 p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-navy">{summary.summaryTitle}</p>
            <Button size="sm" variant="secondary" onClick={() => void copySummary()}>
              {copied ? "Copied" : "Copy summary"}
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            Document type (guess): {summary.documentTypeGuess}
          </p>
          <p className="mt-2 text-xs italic text-gray-500">{summary.cautionNote}</p>
          <div className="mt-3 space-y-2 text-xs text-gray-600">
            <div>
              <p className="font-medium text-charcoal">Extracted facts for review</p>
              <ul className="mt-1 list-inside list-disc">
                {summary.extractedFactsForReview.map((fact) => (
                  <li key={fact}>{fact}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-medium text-charcoal">Possible planning topics</p>
              <ul className="mt-1 list-inside list-disc">
                {summary.possiblePlanningTopics.map((topic) => (
                  <li key={topic}>{topic}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-medium text-charcoal">Advisor review needed</p>
              <ul className="mt-1 list-inside list-disc">
                {summary.advisorReviewNeeded.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
