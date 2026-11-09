import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { checkAllLaws } from "@/lib/legal";

// A jogszabályok napi ellenőrzése. A Vercel Cron a CRON_SECRET értékét Bearer-tokenként küldi.
export const maxDuration = 120;

function authorized(header: string | null) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !header) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(header);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET) return NextResponse.json({ error: "A CRON_SECRET nincs beállítva." }, { status: 503 });
  if (!authorized(request.headers.get("authorization"))) return NextResponse.json({ error: "Nincs jogosultság." }, { status: 401 });
  await checkAllLaws();
  return NextResponse.json({ ok: true });
}
