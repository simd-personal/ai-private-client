"use client";

import { useCallback, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { adminFetch } from "@/lib/admin/admin-fetch";
import {
  LEAD_COMMENT_COMPOSER_TYPES,
  type LeadCommentType,
} from "@/lib/constants";

interface LeadComment {
  id: string;
  comment_text: string;
  comment_type: LeadCommentType;
  created_by: string | null;
  created_at: string;
  updated_at: string | null;
}

interface AdminLeadCommentsSectionProps {
  leadId: string;
}

function commentBadgeLabel(type: LeadCommentType): string {
  return type.replace(/_/g, " ");
}

export function AdminLeadCommentsSection({
  leadId,
}: AdminLeadCommentsSectionProps) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [comments, setComments] = useState<LeadComment[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [newType, setNewType] = useState<(typeof LEAD_COMMENT_COMPOSER_TYPES)[number]>(
    "note"
  );
  const [newText, setNewText] = useState("");
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const fetchComments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch(`/api/admin/leads/${leadId}/comments`);
      const data = (await res.json()) as
        | { comments?: LeadComment[]; error?: string }
        | undefined;
      if (!res.ok || !data?.comments) {
        setError(data?.error ?? "Failed to load comments");
        return;
      }
      setComments(data.comments);
      setLoaded(true);
    } catch {
      setError("Failed to connect");
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next && !loaded) {
      void fetchComments();
    }
  };

  const handleAddComment = async () => {
    if (!newText.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await adminFetch(`/api/admin/leads/${leadId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment_text: newText, comment_type: newType }),
      });
      const data = (await res.json()) as { error?: string } | undefined;
      if (!res.ok) {
        setError(data?.error ?? "Failed to add comment");
        return;
      }
      setNewText("");
      setNewType("note");
      await fetchComments();
    } catch {
      setError("Failed to connect");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async (commentId: string) => {
    if (!editText.trim()) return;
    setError(null);
    try {
      const res = await adminFetch(
        `/api/admin/leads/${leadId}/comments/${commentId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ comment_text: editText }),
        }
      );
      const data = (await res.json()) as { error?: string } | undefined;
      if (!res.ok) {
        setError(data?.error ?? "Failed to update comment");
        return;
      }
      setEditingId(null);
      setEditText("");
      await fetchComments();
    } catch {
      setError("Failed to connect");
    }
  };

  const handleDelete = async (commentId: string) => {
    setError(null);
    try {
      const res = await adminFetch(
        `/api/admin/leads/${leadId}/comments/${commentId}`,
        { method: "DELETE" }
      );
      const data = (await res.json()) as { error?: string } | undefined;
      if (!res.ok) {
        setError(data?.error ?? "Failed to delete comment");
        return;
      }
      await fetchComments();
    } catch {
      setError("Failed to connect");
    }
  };

  const isSystemComment = (type: LeadCommentType) =>
    type === "system" || type === "status_change";

  return (
    <div className="mb-4 rounded-xl border border-gray-100 bg-white p-4 text-sm">
      <div className="flex items-center justify-between">
        <p className="font-medium text-navy">Lead Comments</p>
        <Button variant="ghost" size="sm" onClick={handleToggle}>
          {open ? "Hide timeline" : "Show timeline"}
        </Button>
      </div>

      {open ? (
        <div className="mt-4 space-y-4">
          <div className="rounded-lg border border-gray-100 bg-beige/20 p-3">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <select
                value={newType}
                onChange={(e) =>
                  setNewType(
                    e.target.value as (typeof LEAD_COMMENT_COMPOSER_TYPES)[number]
                  )
                }
                className="h-9 rounded-lg border border-gray-200 bg-white px-2 text-xs"
              >
                {LEAD_COMMENT_COMPOSER_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <Textarea
              placeholder="Add a comment about this lead..."
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              rows={2}
            />
            <Button
              size="sm"
              className="mt-2"
              disabled={saving || !newText.trim()}
              onClick={() => void handleAddComment()}
            >
              {saving ? "Adding..." : "Add Comment"}
            </Button>
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          {loading ? (
            <p className="text-gray-500">Loading comments...</p>
          ) : comments.length === 0 ? (
            <p className="text-gray-500">No comments yet.</p>
          ) : (
            <ul className="space-y-3">
              {comments.map((comment) => (
                <li
                  key={comment.id}
                  className="rounded-lg border border-gray-100 p-3"
                >
                  <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          isSystemComment(comment.comment_type)
                            ? "default"
                            : "champagne"
                        }
                      >
                        {commentBadgeLabel(comment.comment_type)}
                      </Badge>
                      <span className="text-xs text-gray-400">
                        {new Date(comment.created_at).toLocaleString()}
                        {comment.created_by ? ` · ${comment.created_by}` : ""}
                      </span>
                    </div>
                    {!isSystemComment(comment.comment_type) ? (
                      <div className="flex gap-1">
                        {editingId === comment.id ? null : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingId(comment.id);
                              setEditText(comment.comment_text);
                            }}
                          >
                            Edit
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void handleDelete(comment.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    ) : null}
                  </div>

                  {editingId === comment.id ? (
                    <div>
                      <Textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={2}
                      />
                      <div className="mt-2 flex gap-2">
                        <Button
                          size="sm"
                          disabled={!editText.trim()}
                          onClick={() => void handleSaveEdit(comment.id)}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setEditingId(null);
                            setEditText("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-700">{comment.comment_text}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
