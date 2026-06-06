import { NextResponse } from "next/server";
import { verifyPlatformAdmin } from "@/lib/platform-admin/auth";
import {
  getLatestMercerDemoLead,
  resetMercerNewportDemo,
} from "@/lib/demo/reset-mercer-demo";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function GET(request: Request) {
  if (!verifyPlatformAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const status = await getLatestMercerDemoLead(supabase);
    return NextResponse.json({ status });
  } catch (error) {
    console.error("[mercer-demo GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!verifyPlatformAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const result = await resetMercerNewportDemo(supabase);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[mercer-demo reset]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to reset Mercer demo",
      },
      { status: 500 }
    );
  }
}
