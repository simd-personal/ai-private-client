"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { adminFetch } from "@/lib/admin/admin-fetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface TenantSettingsResponse {
  tenant: {
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
  };
  tenantBrandName?: string;
}

type FormState = {
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

function fromApi(data: TenantSettingsResponse["tenant"]): FormState {
  return {
    brand_name: data.brand_name ?? "",
    agent_name: data.agent_name ?? "",
    agent_title: data.agent_title ?? "",
    brokerage_name: data.brokerage_name ?? "",
    agent_license_number: data.agent_license_number ?? "",
    brokerage_license_number: data.brokerage_license_number ?? "",
    notification_email: data.notification_email ?? "",
    contact_email: data.contact_email ?? "",
    phone: data.phone ?? "",
    booking_url: data.booking_url ?? "",
    logo_url: data.logo_url ?? "",
    primary_color: data.primary_color ?? "",
    accent_color: data.accent_color ?? "",
    supported_states: (data.supported_states ?? []).join(", "),
    service_areas: (data.service_areas ?? []).join(", "),
    default_state: data.default_state ?? "",
    disclaimer_text: data.disclaimer_text ?? "",
    seo_base_title: data.seo_base_title ?? "",
    seo_base_description: data.seo_base_description ?? "",
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

function getBrandInitials(brandName: string): string {
  const words = brandName
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);
  return (words[0]?.[0] ?? "B") + (words[1]?.[0] ?? "");
}

function buildFieldErrorMessage(
  field: string,
  messages: string[]
): string {
  if (field === "logo_url") {
    return "Logo URL must be a valid URL or left blank.";
  }
  if (field === "booking_url") {
    return "Booking URL must be a valid URL or left blank.";
  }
  const label = field.replace(/_/g, " ");
  return `${label}: ${messages.join(", ")}`;
}

export function AdminTenantSettingsForm() {
  const [slug, setSlug] = useState<string>("");
  const [brandName, setBrandName] = useState<string>("");
  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch("/api/admin/tenant");
      if (res.status === 401) {
        setError("Session expired. Please log in again.");
        return;
      }
      const data = (await res.json()) as
        | TenantSettingsResponse
        | { error?: string };
      if (!res.ok || !("tenant" in data)) {
        setError("Failed to load tenant settings");
        return;
      }
      setSlug(data.tenant.slug);
      setBrandName(data.tenant.brand_name);
      setForm(fromApi(data.tenant));
    } catch {
      setError("Failed to connect");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial admin settings load
    void fetchSettings();
  }, [fetchSettings]);

  const isDirty = useMemo(() => Boolean(form), [form]);

  const updateField = (key: keyof FormState, value: string) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    setSuccess(null);
  };

  const handleLogoUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploadingLogo(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await adminFetch("/api/admin/tenant/logo", {
        method: "POST",
        body: formData,
      });
      const data = (await res.json()) as { logo_url?: string; error?: string };

      if (!res.ok || !data.logo_url) {
        setError(data.error ?? "Failed to upload logo");
        return;
      }

      setForm((prev) => (prev ? { ...prev, logo_url: data.logo_url ?? "" } : prev));
      setSuccess("Logo uploaded.");
    } catch {
      setError("Failed to upload logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    setUploadingLogo(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await adminFetch("/api/admin/tenant", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logo_url: null }),
      });
      const data = (await res.json()) as
        | TenantSettingsResponse
        | { error?: string };
      if (!res.ok || !("tenant" in data)) {
        setError((data as { error?: string }).error ?? "Failed to remove logo");
        return;
      }

      setForm(fromApi(data.tenant));
      setSuccess("Logo removed.");
    } catch {
      setError("Failed to remove logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    const payload = {
      ...form,
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
      disclaimer_text: toNullableText(form.disclaimer_text),
      seo_base_title: toNullableText(form.seo_base_title),
      seo_base_description: toNullableText(form.seo_base_description),
      supported_states: parseList(form.supported_states),
      service_areas: parseList(form.service_areas),
    };

    try {
      const res = await adminFetch("/api/admin/tenant", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as
        | TenantSettingsResponse
        | { error?: string; details?: { fieldErrors?: Record<string, string[]> } };

      if (!res.ok || !("tenant" in data)) {
        const validationErrors =
          "details" in data && data.details?.fieldErrors
            ? Object.entries(data.details.fieldErrors)
                .flatMap(([field, messages]) =>
                  messages && messages.length > 0
                    ? [buildFieldErrorMessage(field, messages)]
                    : []
                )
            : [];
        setError(
          validationErrors.length
            ? validationErrors.join(" ")
            : (data as { error?: string }).error ??
                "Failed to save tenant settings"
        );
        return;
      }

      setBrandName(data.tenant.brand_name);
      setForm(fromApi(data.tenant));
      setSuccess("Settings saved.");
    } catch {
      setError("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !form) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <p className="text-sm text-gray-500">Loading tenant settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-medium">Tenant settings affect live experiences.</p>
        <p className="mt-1">
          Changes update public pages, report context, booking CTAs, notifications,
          and disclaimers for this tenant.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <p className="text-xs tracking-[0.18em] text-gray-500 uppercase">
            Tenant
          </p>
          <h2 className="font-serif text-2xl text-navy">{brandName}</h2>
          <p className="text-sm text-gray-500">Slug: {slug}</p>
        </div>

        <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-sm font-medium text-navy">Logo</p>
          <p className="mt-1 text-xs text-gray-500">
            Upload a PNG, JPG, or WebP logo (max 2MB).
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            {form.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element -- tenant logo URL may be external
              <img
                src={form.logo_url}
                alt={`${form.brand_name || "Tenant"} logo`}
                className="h-14 w-auto max-w-[220px] rounded bg-white p-1 shadow-sm"
              />
            ) : (
              <div className="flex h-14 w-20 items-center justify-center rounded bg-navy/10 text-navy">
                <span className="text-sm font-semibold tracking-wide">
                  {getBrandInitials(form.brand_name || brandName).toUpperCase()}
                </span>
              </div>
            )}
            <label className="inline-flex cursor-pointer">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={(event) => void handleLogoUpload(event)}
                disabled={uploadingLogo || saving}
              />
              <span className="inline-flex h-10 items-center rounded-md border border-gray-300 bg-white px-4 text-sm text-gray-700 transition hover:bg-gray-100">
                {uploadingLogo ? "Uploading..." : "Upload new logo"}
              </span>
            </label>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void handleRemoveLogo()}
              disabled={uploadingLogo || saving || !form.logo_url}
            >
              Remove logo
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Brand name">
            <Input
              value={form.brand_name}
              onChange={(e) => updateField("brand_name", e.target.value)}
            />
          </Field>
          <Field label="Agent name">
            <Input
              value={form.agent_name}
              onChange={(e) => updateField("agent_name", e.target.value)}
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
            />
          </Field>
          <Field label="Agent license number">
            <Input
              value={form.agent_license_number}
              onChange={(e) =>
                updateField("agent_license_number", e.target.value)
              }
            />
          </Field>
          <Field label="Brokerage license number">
            <Input
              value={form.brokerage_license_number}
              onChange={(e) =>
                updateField("brokerage_license_number", e.target.value)
              }
            />
          </Field>
          <Field label="Notification email">
            <Input
              type="email"
              value={form.notification_email}
              onChange={(e) =>
                updateField("notification_email", e.target.value)
              }
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
            <Input
              value={form.phone}
              onChange={(e) => updateField("phone", e.target.value)}
            />
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
            />
          </Field>
          <Field label="Service areas (comma separated)">
            <Input
              value={form.service_areas}
              onChange={(e) => updateField("service_areas", e.target.value)}
            />
          </Field>
          <Field label="Default state">
            <Input
              value={form.default_state}
              onChange={(e) => updateField("default_state", e.target.value)}
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
              onChange={(e) =>
                updateField("seo_base_description", e.target.value)
              }
              rows={3}
            />
          </Field>
        </div>

        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
        {success ? <p className="mt-4 text-sm text-green-700">{success}</p> : null}

        <div className="mt-6 flex gap-3">
          <Button
            variant="secondary"
            onClick={() => void fetchSettings()}
            disabled={saving}
          >
            Reload
          </Button>
          <Button onClick={handleSave} disabled={saving || !isDirty}>
            {saving ? "Saving..." : "Save settings"}
          </Button>
        </div>
      </div>
    </div>
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
