import { NextResponse } from "next/server";

import { checkDataSourceHealth } from "@/lib/supabase";

export async function GET() {
  const data = await checkDataSourceHealth();

  return NextResponse.json(
    {
      ok: data.ok,
      app: "donawa-price-finder",
      dataSource: data.source,
      supabaseConfigured: data.configured,
    },
    { status: data.ok ? 200 : 503 },
  );
}
