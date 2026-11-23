import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft, Download, ScrollText, Send } from "lucide-react";
import { PageTitle } from "@/components/page-title";
import { Empty, Skeleton, buttonClass } from "@/components/ui";
import { ACTIVITY, listActivity, type ActivityEntry } from "@/lib/activity";
import { formatStamp } from "@/lib/dates";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Tevékenységnapló" };

const detailText = (entry: Pick<ActivityEntry, "detail">) =>
  Object.entries(entry.detail ?? {})
    .map(([key, value]) => `${key}: ${typeof value === "number" ? value.toLocaleString("hu-HU") : value}`)
    .join(" · ");

export default function ActivityPage({ searchParams }: { searchParams: Promise<{ tipus?: string }> }) {
  return (
    <div className="space-y-6">
      <Link href="/biztonsag" className="inline-flex items-center gap-1.5 text-sm text-white/55 hover:text-white">
        <ArrowLeft size={15} aria-hidden /> Biztonság
      </Link>
      <PageTitle eyebrow="Biztonság · Audit" title="Tevékenység" accent="napló.">
        Minden művelet az adataiddal – feltöltés, letöltés, törlés, export, AI-feladat, fordítás – időponttal, IP-címmel és
        eszközzel; valamint minden alkalom, amikor szöveg külső szolgáltatóhoz (AI, fordító) került. A naplót az alkalmazás
        nem módosítja és nem törli. A dokumentumok tartalma nem kerül a naplóba.
      </PageTitle>
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Log searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Log({ searchParams }: { searchParams: Promise<{ tipus?: string }> }) {
  const [{ tipus = "" }, user] = await Promise.all([searchParams, requireUser()]);
  const entries = await listActivity(user.session.userId, { event: tipus });
  const csv = `/biztonsag/naplo/csv${tipus ? `?tipus=${encodeURIComponent(tipus)}` : ""}`;

  return (
    <section className="pg-panel space-y-4 rounded-3xl p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <form className="flex flex-wrap items-center gap-2">
          <select name="tipus" defaultValue={tipus} aria-label="Esemény típusa" className="pg-field pg-input h-9 rounded-xl px-3 text-sm text-white">
            <option value="">Minden esemény</option>
            {Object.entries(ACTIVITY).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <button type="submit" className={buttonClass("secondary", "sm")}>
            Szűrés
          </button>
        </form>
        <a href={csv} className={buttonClass("primary", "sm")}>
          <Download size={15} aria-hidden /> Exportálás (CSV, Excel)
        </a>
      </div>

      {entries.length === 0 ? (
        <Empty icon={ScrollText} title="Nincs naplóbejegyzés" text="A műveletek ettől a frissítéstől kezdve kerülnek a naplóba." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/8 [scrollbar-width:thin]">
          <table className="w-full min-w-[48rem] text-left text-sm">
            <thead className="bg-white/4 text-xs text-white/55">
              <tr>
                <th className="px-3 py-2 font-semibold">Időpont</th>
                <th className="px-3 py-2 font-semibold">Esemény</th>
                <th className="px-3 py-2 font-semibold">Érintett adat</th>
                <th className="px-3 py-2 font-semibold">Részletek</th>
                <th className="px-3 py-2 font-semibold">IP-cím</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={String(entry._id)} className="border-t border-white/6 align-top">
                  <td className="px-3 py-2 whitespace-nowrap text-white/70">{formatStamp(entry.at)}</td>
                  <td className="px-3 py-2 font-medium">
                    <span className="inline-flex items-center gap-1.5">
                      {entry.event === "external.send" && <Send size={13} aria-hidden className="text-amber-300" />}
                      {ACTIVITY[entry.event] ?? entry.event}
                    </span>
                  </td>
                  <td className="max-w-[18rem] px-3 py-2 text-white/70 [overflow-wrap:anywhere]">{entry.target ? `${entry.target.name ?? ""}${entry.target.name ? "" : entry.target.type}` : "–"}</td>
                  <td className="max-w-[18rem] px-3 py-2 text-xs text-white/55 [overflow-wrap:anywhere]">{detailText(entry) || "–"}</td>
                  <td className="px-3 py-2 text-xs whitespace-nowrap text-white/50">{entry.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {entries.length === 500 && <p className="text-xs text-white/45">A legutóbbi 500 bejegyzés látható; a teljes napló a CSV-exportban.</p>}
    </section>
  );
}
