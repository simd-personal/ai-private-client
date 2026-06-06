export function sanitizeFilename(original: string): string {
  const base = original.split(/[/\\]/).pop()?.trim() ?? "document";
  const withoutControl = base.replace(/[\x00-\x1f\x7f]/g, "");
  const cleaned = withoutControl
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);

  return cleaned.length > 0 ? cleaned : "document";
}
