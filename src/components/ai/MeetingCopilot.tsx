"use client";

import { useCallback, useEffect, useState } from "react";
import { ReportCard } from "@/components/report/report-card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { CopyBlock } from "@/components/ai/CopyBlock";
import { adminFetch } from "@/lib/admin/admin-fetch";
import {
  trackMeetingCopilotViewed,
  trackMeetingNoteAdded,
  trackMeetingSummaryGenerated,
} from "@/lib/analytics";
import type { MeetingNote, MeetingSummary } from "@/lib/schemas/decision-layer";

interface MeetingCopilotProps {
  leadId: string;
}

export function MeetingCopilot({ leadId }: MeetingCopilotProps) {
  const [notes, setNotes] = useState<MeetingNote[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await adminFetch(`/api/leads/${leadId}/meeting-notes`);
    const json = (await res.json()) as { notes: MeetingNote[] };
    setNotes(json.notes);
  }, [leadId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- admin meeting notes fetch
    void load();
    trackMeetingCopilotViewed({ lead_id: leadId });
  }, [leadId, load]);

  const save = async () => {
    if (!body.trim()) return;
    setSaving(true);
    try {
      await adminFetch(`/api/leads/${leadId}/meeting-notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          note_title: title || undefined,
          note_body: body,
          generate_summary: true,
        }),
      });
      trackMeetingNoteAdded({ lead_id: leadId });
      trackMeetingSummaryGenerated({ lead_id: leadId });
      setTitle("");
      setBody("");
      void load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4" data-testid="meeting-copilot">
      <ReportCard title="Meeting Copilot">
        <p className="mb-4 text-sm text-gray-600">
          Paste meeting notes or transcript excerpts. The system will extract
          planning topics, unresolved questions, and a client-safe follow-up.
        </p>
        <Input
          placeholder="Meeting title (optional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mb-3"
        />
        <Textarea
          placeholder="Meeting notes…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={6}
        />
        <Button className="mt-3" size="sm" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save & generate summary"}
        </Button>
      </ReportCard>

      {notes.map((note) => (
        <MeetingNoteCard key={note.id} note={note} />
      ))}
    </div>
  );
}

function MeetingNoteCard({ note }: { note: MeetingNote }) {
  const summary = note.ai_summary as MeetingSummary | null;

  return (
    <ReportCard title={note.note_title ?? "Meeting note"}>
      <p className="text-xs text-gray-400">
        {note.meeting_date
          ? new Date(note.meeting_date).toLocaleString()
          : new Date(note.created_at).toLocaleString()}
      </p>
      <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600">
        {note.note_body.slice(0, 500)}
        {note.note_body.length > 500 ? "…" : ""}
      </p>
      {summary && (
        <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
          <p className="text-sm text-navy">{summary.summary}</p>
          {summary.unresolvedQuestions.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500">
                Unresolved questions
              </p>
              <ul className="mt-1 list-disc pl-4 text-sm text-gray-600">
                {summary.unresolvedQuestions.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
            </div>
          )}
          <CopyBlock
            label="Suggested client follow-up"
            text={summary.suggestedClientFollowUp}
          />
        </div>
      )}
    </ReportCard>
  );
}
