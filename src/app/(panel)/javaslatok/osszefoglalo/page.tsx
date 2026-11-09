import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { PrintButton } from "@/components/recommendation-actions";
import { Skeleton } from "@/components/ui";
import { dayKey, formatShortDate } from "@/lib/dates";
import { isOpen, listFindings } from "@/lib/findings";
import { SEVERITIES, SEVERITY_ORDER } from "@/lib/findings-meta";
import { listRecommendations } from "@/lib/recommendations";
import { PRIORITIES, PRIORITY_ORDER } from "@/lib/recommendations-meta";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Vezetői összefoglaló" };

export default function SummaryPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/javaslatok" className="inline-flex items-center gap-1.5 text-sm text-white/55 hover:text-white">
          <ArrowLeft size={15} aria-hidden /> Javaslattétel
        </Link>
        <PrintButton />
      </div>
      <Suspense fallback={<Skeleton className="h-[40rem]" />}>
        <Summary />
      </Suspense>
    </div>
  );
}

async function Summary() {
  const user = await requireUser();
  const [recs, findingRows] = await Promise.all([listRecommendations(), listFindings()]);
  const approved = recs.filter((rec) => rec.status === "jovahagyva").sort((a, b) => PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority));
  const open = findingRows.filter((row) => isOpen(row.status));
  const today = dayKey(new Date());

  return (
    <article className="mx-auto w-full max-w-[52rem] rounded-2xl bg-white px-8 py-10 text-[#14182b] shadow-[0_30px_80px_-30px_rgb(0_0_0/0.8)] sm:px-14 sm:py-14 print:max-w-none print:rounded-none print:p-0 print:shadow-none">
      <header className="border-b-2 border-[#14182b] pb-4">
        <p className="text-xs font-semibold tracking-[0.2em] text-[#4b5563] uppercase">PannonGuard Biztonsági Szolgáltató Zrt. · Belső ellenőrzés</p>
        <h1 className="mt-2 text-3xl font-bold">Vezetői összefoglaló</h1>
        <p className="mt-1 text-sm text-[#4b5563]">Kelt: {formatShortDate(today)} · Összeállította: {user.name}</p>
      </header>

      <section className="mt-6">
        <h2 className="text-lg font-bold">Nyitott megállapítások</h2>
        {open.length === 0 ? (
          <p className="mt-2 text-sm">Jelenleg nincs nyitott megállapítás.</p>
        ) : (
          <>
            <p className="mt-2 text-sm">Összesen <strong>{open.length}</strong> nyitott vagy folyamatban lévő megállapítás van.</p>
            <table className="mt-3 w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#14182b] text-left">
                  <th className="py-1.5 pr-3">Súlyosság</th>
                  <th className="py-1.5">Darab</th>
                </tr>
              </thead>
              <tbody>
                {SEVERITY_ORDER.map((severity) => (
                  <tr key={severity} className="border-b border-[#d1d5db]">
                    <td className="py-1.5 pr-3">{SEVERITIES[severity]}</td>
                    <td className="py-1.5">{open.filter((row) => row.severity === severity).length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-bold">Jóváhagyott javaslatok</h2>
        {approved.length === 0 ? (
          <p className="mt-2 text-sm">Még nincs jóváhagyott javaslat.</p>
        ) : (
          <ol className="mt-3 space-y-5">
            {approved.map((rec, index) => (
              <li key={rec.id} className="break-inside-avoid">
                <p className="font-bold">
                  {index + 1}. {rec.title} <span className="text-sm font-normal text-[#4b5563]">({PRIORITIES[rec.priority]} prioritás)</span>
                </p>
                <p className="mt-1 text-sm whitespace-pre-wrap">{rec.text}</p>
                <p className="mt-1 text-xs text-[#4b5563]">
                  Megállapítás: {rec.findingTitle}
                  {rec.owner && ` · Felelős: ${rec.owner}`}
                  {rec.dueDate && ` · Határidő: ${formatShortDate(rec.dueDate)}`}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>

      <footer className="mt-10 border-t border-[#d1d5db] pt-3 text-xs text-[#6b7280]">A dokumentum a PannonGuard belső ellenőrzési rendszerből készült; a javaslatokat az ellenőr hagyta jóvá.</footer>
    </article>
  );
}
