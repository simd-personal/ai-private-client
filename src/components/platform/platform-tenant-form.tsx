"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export interface PlatformTenantRecord {
  slug: string;
  brand_name: string;
  agent_name: string;
  agent_title: string | null;
  brokerage_name: string | null;
  agent_license_number: string | null;
  brokerage_license_number: string | null;
  notification_email: string | null;
  contact_email: string | null;
  phone: string | null;
  booking_url: string | null;
  logo_url: string | null;
  primary_color: string | null;
  accent_color: string | null;
  supported_states: string[] | null;
  service_areas: string[] | null;
  default_state: string | null;
  disclaimer_text: string | null;
  seo_base_title: string | null;
  seo_base_description: string | null;
}

type FormState = {
  slug: string;
  brand_name: string;
  agent_name: string;
  agent_title: string;
  brokerage_name: string;
  agent_license_number: string;
  brokerage_license_number: string;
  notification_email: string;
  contact_email: string;
  phone: string;
  booking_url: string;
  logo_url: string;
  primary_color: string;
  accent_color: string;
  supported_states: string;
  service_areas: string;
  default_state: string;
  disclaimer_text: string;
  seo_base_title: string;
  seo_base_description: string;
};

export interface PlatformTenantSubmitPayload {
  slug?: string;
  brand_name: string;
  agent_name: string;
  agent_title: string | null;
  brokerage_name: string | null;
  agent_license_number: string | null;
  brokerage_license_number: string | null;
  notification_email: string | null;
  contact_email: string | null;
  phone: string | null;
  booking_url: string | null;
  logo_url: string | null;
  primary_color: string | null;
  accent_color: string | null;
  supported_states: string[];
  service_areas: string[];
  default_state: string | null;
  disclaimer_text: string | null;
  seo_base_title: string | null;
  seo_base_description: string | null;
}

interface PlatformTenantFormProps {
  mode: "create" | "edit";
  initialTenant?: PlatformTenantRecord | null;
  onSubmit: (
    payload: PlatformTenantSubmitPayload
  ) => Promise<{ ok: boolean; error?: string }>;
  submitLabel: string;
}

const EMPTY_FORM: FormState = {
  slug: "",
  brand_name: "",
  agent_name: "",
  agent_title: "",
  brokerage_name: "",
  agent_license_number: "",
  brokerage_license_number: "",
  notification_email: "",
  contact_email: "",
  phone: "",
  booking_url: "",
  logo_url: "",
  primary_color: "",
  accent_color: "",
  supported_states: "",
  service_areas: "",
  default_state: "",
  disclaimer_text: "",
  seo_base_title: "",
  seo_base_description: "",
};

function toFormState(tenant: PlatformTenantRecord): FormState {
  return {
    slug: tenant.slug,
    brand_name: tenant.brand_name ?? "",
    agent_name: tenant.agent_name ?? "",
    agent_title: tenant.agent_title ?? "",
    brokerage_name: tenant.brokerage_name ?? "",
    agent_license_number: tenant.agent_license_number ?? "",
    brokerage_license_number: tenant.brokerage_license_number ?? "",
    notification_email: tenant.notification_email ?? "",
    contact_email: tenant.contact_email ?? "",
    phone: tenant.phone ?? "",
    booking_url: tenant.booking_url ?? "",
    logo_url: tenant.logo_url ?? "",
    primary_color: tenant.primary_color ?? "",
    accent_color: tenant.accent_color ?? "",
    supported_states: (tenant.supported_states ?? []).join(", "),
    service_areas: (tenant.service_areas ?? []).join(", "),
    default_state: tenant.default_state ?? "",
    disclaimer_text: tenant.disclaimer_text ?? "",
    seo_base_title: tenant.seo_base_title ?? "",
    seo_base_description: tenant.seo_base_description ?? "",
  };
}

function parseList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function toNullableText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export function PlatformTenantForm({
  mode,
  initialTenant,
  onSubmit,
  submitLabel,
}: PlatformTenantFormProps) {
  const [form, setForm] = useState<FormState>(
    initialTenant ? toFormState(initialTenant) : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!initialTenant) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync form with fetched tenant record
    setForm(toFormState(initialTenant));
  }, [initialTenant]);

  const updateField = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    const payload: PlatformTenantSubmitPayload = {
      ...(mode === "create" ? { slug: form.slug.trim() } : {}),
      brand_name: form.brand_name.trim(),
      agent_name: form.agent_name.trim(),
      agent_title: toNullableText(form.agent_title),
      brokerage_name: toNullableText(form.brokerage_name),
      agent_license_number: toNullableText(form.agent_license_number),
      brokerage_license_number: toNullableText(form.brokerage_license_number),
      notification_email: toNullableText(form.notification_email),
      contact_email: toNullableText(form.contact_email),
      phone: toNullableText(form.phone),
      booking_url: toNullableText(form.booking_url),
      logo_url: toNullableText(form.logo_url),
      primary_color: toNullableText(form.primary_color),
      accent_color: toNullableText(form.accent_color),
      supported_states: parseList(form.supported_states),
      service_areas: parseList(form.service_areas),
      default_state: toNullableText(form.default_state),
      disclaimer_text: toNullableText(form.disclaimer_text),
      seo_base_title: toNullableText(form.seo_base_title),
      seo_base_description: toNullableText(form.seo_base_description),
    };

    const result = await onSubmit(payload);
    if (!result.ok) {
      setError(result.error ?? "Failed to save tenant");
      setSaving(false);
      return;
    }

    setSuccess(mode === "create" ? "Tenant created." : "Tenant updated.");
    setSaving(false);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
    >
      <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-medium">Platform-level tenant management</p>
        <p className="mt-1">
          Changes affect tenant branding, lead routing context, notification recipients,
          and public presentation under tenant-scoped routes.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {mode === "create" ? (
          <Field label="Slug (kebab-case)">
            <Input
              value={form.slug}
              onChange={(e) => updateField("slug", e.target.value.toLowerCase())}
              placeholder="test-agent"
              required
            />
          </Field>
        ) : null}

        <Field label="Brand name">
          <Input
            value={form.brand_name}
            onChange={(e) => updateField("brand_name", e.target.value)}
            required
          />
        </Field>
        <Field label="Agent name">
          <Input
            value={form.agent_name}
            onChange={(e) => updateField("agent_name", e.target.value)}
            required
          />
        </Field>
        <Field label="Agent title">
          <Input
            value={form.agent_title}
            onChange={(e) => updateField("agent_title", e.target.value)}
          />
        </Field>
        <Field label="Brokerage name">
          <Input
            value={form.brokerage_name}
            onChange={(e) => updateField("brokerage_name", e.target.value)}
            required
          />
        </Field>
        <Field label="Agent license number">
          <Input
            value={form.agent_license_number}
            onChange={(e) => updateField("agent_license_number", e.target.value)}
            required
          />
        </Field>
        <Field label="Brokerage license number">
          <Input
            value={form.brokerage_license_number}
            onChange={(e) =>
              updateField("brokerage_license_number", e.target.value)
            }
            required
          />
        </Field>
        <Field label="Notification email">
          <Input
            type="email"
            value={form.notification_email}
            onChange={(e) => updateField("notification_email", e.target.value)}
            required
          />
        </Field>
        <Field label="Contact email">
          <Input
            type="email"
            value={form.contact_email}
            onChange={(e) => updateField("contact_email", e.target.value)}
          />
        </Field>
        <Field label="Phone">
          <Input value={form.phone} onChange={(e) => updateField("phone", e.target.value)} />
        </Field>
        <Field label="Booking URL">
          <Input
            value={form.booking_url}
            onChange={(e) => updateField("booking_url", e.target.value)}
          />
        </Field>
        <Field label="Logo URL">
          <Input
            value={form.logo_url}
            onChange={(e) => updateField("logo_url", e.target.value)}
          />
        </Field>
        <Field label="Primary color">
          <Input
            value={form.primary_color}
            onChange={(e) => updateField("primary_color", e.target.value)}
          />
        </Field>
        <Field label="Accent color">
          <Input
            value={form.accent_color}
            onChange={(e) => updateField("accent_color", e.target.value)}
          />
        </Field>
        <Field label="Supported states (comma separated)">
          <Input
            value={form.supported_states}
            onChange={(e) => updateField("supported_states", e.target.value)}
            required
          />
        </Field>
        <Field label="Service areas (comma separated)">
          <Input
            value={form.service_areas}
            onChange={(e) => updateField("service_areas", e.target.value)}
            required
          />
        </Field>
        <Field label="Default state">
          <Input
            value={form.default_state}
            onChange={(e) => updateField("default_state", e.target.value)}
            required
          />
        </Field>
        <Field label="SEO base title">
          <Input
            value={form.seo_base_title}
            onChange={(e) => updateField("seo_base_title", e.target.value)}
          />
        </Field>
      </div>

      <div className="mt-4 grid gap-4">
        <Field label="Disclaimer text">
          <Textarea
            value={form.disclaimer_text}
            onChange={(e) => updateField("disclaimer_text", e.target.value)}
            rows={4}
          />
        </Field>
        <Field label="SEO base description">
          <Textarea
            value={form.seo_base_description}
            onChange={(e) => updateField("seo_base_description", e.target.value)}
            rows={3}
          />
        </Field>
      </div>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      {success ? <p className="mt-4 text-sm text-green-700">{success}</p> : null}

      <div className="mt-6">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm text-gray-600">{label}</span>
      {children}
    </label>
  );
}
