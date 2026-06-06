import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { resolveTenantFromRequest } from "@/lib/tenants/tenant-resolver";

const TENANT_LOGO_BUCKET = "tenant-logos";
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Map<string, string>([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
]);

function verifyAdmin(request: Request): boolean {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return false;

  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;
  return authHeader.slice(7) === password;
}

export async function POST(request: Request) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const resolvedTenant = await resolveTenantFromRequest(request);
    if (!resolvedTenant.tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      );
    }

    if (file.size <= 0) {
      return NextResponse.json(
        { error: "Uploaded file is empty" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File must be 2MB or smaller" },
        { status: 400 }
      );
    }

    const ext = ALLOWED_MIME_TYPES.get(file.type);
    if (!ext) {
      return NextResponse.json(
        { error: "Unsupported file type. Use PNG, JPG, or WebP." },
        { status: 400 }
      );
    }

    const timestamp = Date.now();
    const path = `${resolvedTenant.tenant.slug}/logo-${timestamp}.${ext}`;
    const bytes = Buffer.from(await file.arrayBuffer());
    const supabase = getSupabaseAdmin();

    const { error: uploadError } = await supabase.storage
      .from(TENANT_LOGO_BUCKET)
      .upload(path, bytes, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("[admin/tenant/logo] upload failed:", uploadError);
      return NextResponse.json(
        {
          error:
            "Failed to upload logo. Ensure the tenant-logos bucket exists in Supabase Storage.",
        },
        { status: 500 }
      );
    }

    const { data: publicUrlData } = supabase.storage
      .from(TENANT_LOGO_BUCKET)
      .getPublicUrl(path);
    const logoUrl = publicUrlData.publicUrl;

    const { error: updateError } = await supabase
      .from("tenants")
      .update({
        logo_url: logoUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", resolvedTenant.tenantId);

    if (updateError) {
      console.error("[admin/tenant/logo] update failed:", updateError);
      return NextResponse.json(
        { error: "Uploaded logo but failed to save tenant settings" },
        { status: 500 }
      );
    }

    return NextResponse.json({ logo_url: logoUrl });
  } catch (error) {
    console.error("[admin/tenant/logo] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
