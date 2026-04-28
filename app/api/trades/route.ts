import { createServerClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = await createServerClient();
  const { searchParams } = new URL(request.url);

  const startDateParam = searchParams.get("startDate");
  const endDateParam = searchParams.get("endDate");

  // Date-range mode: used by dashboard when switching accounts
  if (startDateParam) {
    let query = supabase
      .from("trades")
      .select("*")
      .gte("date", startDateParam)
      .order("date", { ascending: true });

    if (endDateParam) {
      query = query.lte("date", endDateParam);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  }

  // Month mode: used by calendar
  const year = parseInt(searchParams.get("year") || "0");
  const month = parseInt(searchParams.get("month") || "0");

  if (!year || !month) {
    return NextResponse.json([]);
  }

  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate =
    month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, "0")}-01`;

  const { data, error } = await supabase
    .from("trades")
    .select("*")
    .gte("date", startDate)
    .lt("date", endDate)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
