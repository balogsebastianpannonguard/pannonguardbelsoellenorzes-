import { ACTIVITY, listActivity } from "@/lib/activity";
import { requireUser } from "@/lib/session";

const cell = (value: unknown) => {
  const text = String(value ?? "");
  // Képletinjekció ellen: a táblázatkezelő ne értelmezze képletként.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
};

/** A belépett felhasználó teljes tevékenységnaplója CSV-ben (Excelben megnyitható, pontosvesszővel tagolt). */
export async function GET(request: Request) {
  const user = await requireUser();
  const tipus = new URL(request.url).searchParams.get("tipus") ?? "";
  const entries = await listActivity(user.session.userId, { event: tipus, limit: 100_000 });
  const rows = [
    ["Időpont (UTC)", "Esemény", "Eseménykód", "Felhasználó", "E-mail", "Érintett adat típusa", "Érintett adat azonosítója", "Érintett adat neve", "Részletek", "IP-cím", "Böngésző"],
    ...entries.map((entry) => [
      entry.at.toISOString(),
      ACTIVITY[entry.event] ?? entry.event,
      entry.event,
      entry.name,
      entry.email,
      entry.target?.type ?? "",
      entry.target?.id ?? "",
      entry.target?.name ?? "",
      Object.entries(entry.detail ?? {})
        .map(([key, value]) => `${key}: ${value}`)
        .join("; "),
      entry.ip,
      entry.userAgent,
    ]),
  ];
  const csv = "﻿" + rows.map((row) => row.map(cell).join(";")).join("\r\n");
  const stamp = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Budapest" });
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pannonguard-tevekenysegnaplo-${stamp}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
