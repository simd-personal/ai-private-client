import { NextResponse } from "next/server";
import { toPublicGenerationStatus } from "@/lib/schemas/lead-generation";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { selectLeadForPublicStatus } from "@/lib/leads/public-result-query";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token || token.length < 16) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await selectLeadForPublicStatus(supabase, token);

    if (error || !data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(toPublicGenerationStatus(data));
  } catch (error) {
    console.error("[result status GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
