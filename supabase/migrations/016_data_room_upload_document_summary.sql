-- Data Room document upload summary fields (admin-only)

alter table public.decision_data_room_items
  add column if not exists ai_document_summary jsonb,
  add column if not exists ai_document_summary_generated_at timestamptz,
  add column if not exists ai_document_summary_source text,
  add column if not exists ai_document_summary_model text;
