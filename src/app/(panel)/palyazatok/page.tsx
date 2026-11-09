import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CalendarClock, CircleAlert, FileWarning, FolderKanban, Plus, UserRound } from "lucide-react";
import { PageTitle } from "@/components/page-title";
import { TenderForm } from "@/components/tenders-forms";
import { Empty, Panel, Pill, Skeleton, Stat } from "@/components/ui";
import { dayKey } from "@/lib/dates";
import { requireUser } from "@/lib/session";
import { listTenders } from "@/lib/tenders";
import { TENDER_STATUS, daysBetween, progress, type TenderView } from "@/lib/tenders-shared";

export const metadata: Metadata = { title: "Pályázati anyagok" };

const SOON_DAYS = 14;

export default function TendersPage() {
  return (
    <div className="space-y-8">
      <PageTitle eyebrow="01 · Belső ellenőrzés" title="Pályázati" accent="anyagok">
        A pályázatok határideje, a hiányzó dokumentumok és a készültség egy helyen. Felelősönként és tételenként követhető, mi van még hátra.
      </PageTitle>
      <Suspense fallback={<Skeleton className="h-[34rem]" />}>
        <Tenders />
      </Suspense>
    </div>
  );
}

function deadlineInfo(tender: TenderView, today: string) {
  const days = daysBetween(today, tender.deadline);
  const active = TENDER_STATUS[tender.status].active;
  if (!active) return { label: tender.deadline, tone: "muted" as const, hint: "" };
  if (days < 0) return { label: tender.deadline, tone: "error" as const, hint: `${-days} napja lejárt` };
  if (days === 0) return { label: tender.deadline, tone: "error" as const, hint: "ma jár le" };
  if (days <= SOON_DAYS) return { label: tender.deadline, tone: "warning" as const, hint: `${days} nap múlva` };
  return { label: tender.deadline, tone: "muted" as const, hint: `${days} nap múlva` };
}

async function Tenders() {
  await requireUser();
  const today = dayKey(new Date());
  const all = await listTenders();

  const active = all.filter((tender) => TENDER_STATUS[tender.status].active);
  const late = active.filter((tender) => tender.deadline < today);
  const soon = active.filter((tender) => tender.deadline >= today && daysBetween(today, tender.deadline) <= SOON_DAYS);
  const missing = active.reduce((sum, tender) => sum + tender.items.filter((item) => item.status === "hianyzik").length, 0);

  // Az aktív pályázatok határidő szerint elöl, a lezártak mögöttük (újabb elöl).
  const sorted = [...active, ...all.filter((tender) => !TENDER_STATUS[tender.status].active).reverse()];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Aktív pályázat" value={active.length} icon={FolderKanban} tone="text-mint-bright" />
        <Stat label={`Határidő ${SOON_DAYS} napon belül`} value={soon.length} icon={CalendarClock} tone={soon.length ? "text-amber-300" : "text-white/70"} />
        <Stat label="Lejárt határidő" value={late.length} icon={CircleAlert} tone={late.length ? "text-red-300" : "text-white/70"} />
        <Stat label="Hiányzó dokumentum" value={missing} icon={FileWarning} tone={missing ? "text-amber-300" : "text-white/70"} hint="az aktív pályázatokban" />
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-3">
          {sorted.length === 0 ? (
            <Empty icon={FolderKanban} title="Még nincs pályázat" text="Vedd fel az első pályázatot a jobb oldali űrlapon, majd add hozzá a szükséges dokumentumokat." />
          ) : (
            sorted.map((tender) => {
              const percent = progress(tender.items);
              const info = deadlineInfo(tender, today);
              const status = TENDER_STATUS[tender.status];
              const missingCount = tender.items.filter((item) => item.status === "hianyzik").length;
              return (
                <Link key={tender.id} href={`/palyazatok/${tender.id}`} className="pg-card block rounded-2xl p-5 hover:bg-white/5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-display text-lg font-semibold">{tender.name}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-sm text-white/50">
                        {tender.issuer && <span>{tender.issuer}</span>}
                        {tender.owner && (
                          <span className="inline-flex items-center gap-1">
                            <UserRound size={13} aria-hidden /> {tender.owner}
                          </span>
                        )}
                      </p>
                    </div>
                    <Pill tone={status.tone}>{status.label}</Pill>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                    <span className="inline-flex items-center gap-2">
                      <CalendarClock size={15} aria-hidden className="text-white/45" />
                      <span className={info.tone === "error" ? "font-semibold text-red-300" : info.tone === "warning" ? "font-semibold text-amber-300" : "text-white/75"}>
                        {info.label}
                      </span>
                      {info.hint && <span className="text-xs text-white/45">{info.hint}</span>}
                    </span>
                    {tender.items.length > 0 && (
                      <span className="text-xs text-white/50">
                        {tender.items.filter((item) => item.status === "kesz").length}/{tender.items.length} dokumentum kész
                        {missingCount > 0 && <span className="text-red-300"> · {missingCount} hiányzik</span>}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <div
                      role="progressbar"
                      aria-valuenow={percent}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label="Készültség"
                      className="h-2 flex-1 overflow-hidden rounded-full bg-white/8"
                    >
                      <div className="h-full rounded-full bg-linear-to-r from-mint to-violet-bright" style={{ width: `${percent}%` }} />
                    </div>
                    <span className="w-10 text-right text-sm font-semibold tabular-nums text-white/70">{percent}%</span>
                  </div>
                </Link>
              );
            })
          )}
        </div>

        <Panel title="Új pályázat" icon={Plus} className="xl:sticky xl:top-8">
          <TenderForm />
        </Panel>
      </div>
    </div>
  );
}
