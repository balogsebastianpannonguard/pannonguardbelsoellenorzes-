import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CircleAlert, ClipboardList, FilePlus2, Files, TriangleAlert } from "lucide-react";
import { AuditForm } from "@/components/audit-form";
import { PageTitle } from "@/components/page-title";
import { Empty, Panel, Pill, Skeleton } from "@/components/ui";
import { auditFiles, audits } from "@/lib/audits";
import { formatStamp } from "@/lib/dates";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Ellenőri adatok" };

export default function AuditsPage() {
  return (
    <div className="space-y-8">
      <PageTitle eyebrow="04 · Belső ellenőrzés" title="Beérkező" accent="ellenőri adatok.">
        Ellenőrzésenként gyűjtsd a beérkező fájlokat: feltöltéskor automatikusan ellenőrizzük a formát és a tartalmat, a találatok pedig a fájl mellett látszanak.
      </PageTitle>
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Content />
      </Suspense>
    </div>
  );
}

async function Content() {
  await requireUser();
  const [list, counts] = await Promise.all([
    audits().then((collection) => collection.find().sort({ createdAt: -1 }).limit(100).toArray()),
    auditFiles().then((collection) =>
      collection
        .aggregate<{ _id: { toString(): string }; files: number; errors: number; warnings: number }>([
          {
            $group: {
              _id: "$auditId",
              files: { $sum: 1 },
              errors: { $sum: { $size: { $filter: { input: "$issues", cond: { $eq: ["$$this.level", "error"] } } } } },
              warnings: { $sum: { $size: { $filter: { input: "$issues", cond: { $eq: ["$$this.level", "warning"] } } } } },
            },
          },
        ])
        .toArray(),
    ),
  ]);
  const byAudit = new Map(counts.map((entry) => [entry._id.toString(), entry]));

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[26rem_minmax(0,1fr)]">
      <Panel title="Új ellenőrzés" icon={FilePlus2} className="xl:sticky xl:top-8">
        <AuditForm />
      </Panel>

      <section>
        <h2 className="mb-4 flex items-center gap-2.5 font-display text-lg font-semibold">
          Ellenőrzések <Pill tone="muted">{list.length}</Pill>
        </h2>
        {list.length === 0 ? (
          <Empty icon={ClipboardList} title="Még nincs ellenőrzés" text="Hozd létre az elsőt, majd töltsd fel hozzá a beérkező fájlokat." />
        ) : (
          <ul className="space-y-3">
            {list.map((audit) => {
              const stats = byAudit.get(String(audit._id));
              return (
                <li key={String(audit._id)}>
                  <Link href={`/ellenori-adatok/${audit._id}`} className="pg-card group flex flex-wrap items-center gap-4 rounded-2xl p-5 hover:bg-white/5">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-violet/15 text-violet-bright transition-colors group-hover:bg-mint/15 group-hover:text-mint">
                      <ClipboardList size={20} aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{audit.name}</p>
                      <p className="truncate text-xs text-white/45">
                        {[audit.area, audit.periodFrom && `${audit.periodFrom} – ${audit.periodTo ?? ""}`, audit.lead].filter(Boolean).join(" · ") || "Nincs megadott terület vagy időszak"}
                      </p>
                      <p className="mt-0.5 text-xs text-white/35">
                        {formatStamp(audit.createdAt)} · {audit.createdBy}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Pill tone="muted" icon={Files}>
                        {stats?.files ?? 0} fájl
                      </Pill>
                      {stats && stats.errors > 0 && (
                        <Pill tone="error" icon={CircleAlert}>
                          {stats.errors} hiba
                        </Pill>
                      )}
                      {stats && stats.warnings > 0 && (
                        <Pill tone="warning" icon={TriangleAlert}>
                          {stats.warnings} figyelmeztetés
                        </Pill>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
