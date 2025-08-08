import { NextResponse } from "next/server";

// Helper: try exchangerate.host first, then ER-API as fallback
async function getRate(from: string, to: string, date?: string) {
  if (from === to) return 1;

  // 1) exchangerate.host
  try {
    const url = date
      ? `https://api.exchangerate.host/${date}?base=${from}&symbols=${to}`
      : `https://api.exchangerate.host/latest?base=${from}&symbols=${to}`;
    const res = await fetch(url, { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      const r = json?.rates?.[to];
      if (r && Number.isFinite(r)) return Number(r);
    }
  } catch {}

  // 2) ER-API fallback (base fixed in path)
  try {
    const res2 = await fetch(`https://open.er-api.com/v6/latest/${from}`, { cache: "no-store" });
    if (res2.ok) {
      const json2 = await res2.json();
      const r2 = json2?.rates?.[to];
      if (r2 && Number.isFinite(r2)) return Number(r2);
    }
  } catch {}

  // Last resort
  return 1;
}

// GET /api/fx?from=USD&to=LKR&date=2025-08-08
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const from = (searchParams.get("from") || "LKR").toUpperCase();
  const to = (searchParams.get("to") || "LKR").toUpperCase();
  const date = searchParams.get("date") || undefined; // YYYY-MM-DD

  const rate = await getRate(from, to, date);
  return NextResponse.json({ rate });
}
