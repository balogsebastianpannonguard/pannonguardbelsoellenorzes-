import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, CalendarClock, ClipboardList, History, Pencil, UserRound } from "lucide-react";
import { PageTitle } from "@/components/page-title";
import { DeleteTenderButton, ItemForm, ItemRow, TenderForm } from "@/components/tenders-forms";
import { Empty, Panel, Pill, Skeleton } from "@/components/ui";
import { dayKey, formatStamp } from "@/lib/dates";
import { requireUser } from "@/lib/session";
import { getTender } from "@/lib/tenders";
import { TENDER_STATUS, daysBetween, progress } from "@/lib/tenders-shared";

export const metadata: Metadata = { title: "Pályázat" };

export default function TenderPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <div className="space-y-8">
      <Link href="/palyazatok" className="pg-rise inline-flex items-center gap-1.5 text-sm text-white/55 hover:text-white">
        <ArrowLeft size={15} aria-hidden /> Pályázatok
      </Link>
      <Suspense fallback={<Skeleton className="h-[36rem]" />}>
        <Tender params={params} />
      </Suspense>
    </div>
  );
}

async function Tender({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }] = await Promise.all([params, requireUser()]);
  const tender = await getTender(id);
  if (!tender) notFound();

  const today = dayKey(new Date());
  const days = daysBetween(today, tender.deadline);
  const active = TENDER_STATUS[tender.status].active;
  const percent = progress(tender.items);
  const status = TENDER_STATUS[tender.status];
  const deadlineTone = !active ? "text-white/75" : days < 0 ? "text-red-300" : days <= 14 ? "text-amber-300" : "text-white/75";
  const deadlineHint = !active ? "" : days < 0 ? `${-days} napja lejárt` : days === 0 ? "ma jár le" : `${days} nap múlva`;

  return (
    <>
      <PageTitle eyebrow="01 · Pályázati anyagok" title={tender.name}>
        <span className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
          <Pill tone={status.tone}>{status.label}</Pill>
          {tender.issuer && <span>{tender.issuer}</span>}
          <span className={`inline-flex items-center gap-1.5 ${deadlineTone}`}>
            <CalendarClock size={15} aria-hidden /> {tender.deadline}
            {deadlineHint && <span className="text-xs opacity-80">({deadlineHint})</span>}
          </span>
          {tender.owner && (
            <span className="inline-flex items-center gap-1.5">
              <UserRound size={15} aria-hidden /> {tender.owner}
            </span>
          )}
        </span>
      </PageTitle>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-6">
          <Panel
            title="Dokumentumok"
            icon={ClipboardList}
            action={<span className="text-sm font-semibold tabular-nums text-white/70">{percent}% kész</span>}
          >
            <div
              role="progressbar"
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Készültség"
              className="mb-5 h-2.5 overflow-hidden rounded-full bg-white/8"
            >
              <div className="h-full rounded-full bg-linear-to-r from-mint to-violet-bright transition-[width] duration-500" style={{ width: `${percent}%` }} />
            </div>
            {tender.items.length === 0 ? (
              <Empty icon={ClipboardList} title="Még nincs dokumentum" text="Add hozzá a pályázathoz szükséges dokumentumokat, felelőssel és határidővel." />
            ) : (
              <ul className="space-y-2.5">
                {tender.items.map((item) => (
                  <ItemRow key={item.id} tenderId={tender.id} item={item} today={today} />
                ))}
              </ul>
            )}
            <div className="mt-5">
              <ItemForm tenderId={tender.id} />
            </div>
          </Panel>

          <Panel title="Változásnapló" icon={History}>
            {tender.log.length === 0 ? (
              <p className="text-sm text-white/55">Még nincs bejegyzés.</p>
            ) : (
              <ol className="space-y-1">
                {tender.log.map((entry, index) => (
                  <li key={`${entry.at}-${index}`} className="flex items-start gap-3 rounded-xl px-2 py-2 hover:bg-white/4">
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-mint/70" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">{entry.text}</p>
                      <p className="text-xs text-white/45">{entry.by}</p>
                    </div>
                    <time dateTime={entry.at} className="shrink-0 text-xs text-white/45">
                      {formatStamp(new Date(entry.at))}
                    </time>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>

        <div className="space-y-6 xl:sticky xl:top-8">
          <Panel title="Adatok" icon={Pencil}>
            <TenderForm tender={tender} />
          </Panel>
          <DeleteTenderButton id={tender.id} name={tender.name} />
        </div>
      </div>
    </>
  );
}
