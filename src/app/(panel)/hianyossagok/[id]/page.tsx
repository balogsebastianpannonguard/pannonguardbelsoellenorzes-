import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, Clock, FileText, Lightbulb, Pencil } from "lucide-react";
import { DeleteFindingButton } from "@/components/finding-actions";
import { FindingForm } from "@/components/finding-form";
import { PageTitle } from "@/components/page-title";
import { RecommendationGenerate } from "@/components/recommendation-actions";
import { Panel, Pill, Skeleton } from "@/components/ui";
import { aiAvailable } from "@/lib/ai";
import { formatStamp } from "@/lib/dates";
import { getFindingRow, listAuditOptions } from "@/lib/findings";
import { SEVERITIES, SEVERITY_TONE, SOURCES, STATUSES, STATUS_TONE } from "@/lib/findings-meta";
import { listRecommendationsFor } from "@/lib/recommendations";
import { PRIORITIES, REC_STATUSES, REC_TONE } from "@/lib/recommendations-meta";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Megállapítás" };
export const maxDuration = 120;

export default function FindingPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <div className="space-y-8">
      <Link href="/hianyossagok" className="inline-flex items-center gap-1.5 text-sm text-white/55 hover:text-white">
        <ArrowLeft size={15} aria-hidden /> Hiányosságok
      </Link>
      <Suspense fallback={<Skeleton className="h-[36rem]" />}>
        <Detail params={params} />
      </Suspense>
    </div>
  );
}

async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }] = await Promise.all([params, requireUser()]);
  const [finding, audits] = await Promise.all([getFindingRow(id), listAuditOptions()]);
  if (!finding) notFound();
  const recommendations = await listRecommendationsFor(finding.id);

  return (
    <div className="space-y-6">
      <PageTitle eyebrow={`Megállapítás · ${SOURCES[finding.source]}`} title={finding.title}>
        <span className="flex flex-wrap items-center gap-2">
          <Pill tone={SEVERITY_TONE[finding.severity]}>{SEVERITIES[finding.severity]}</Pill>
          <Pill tone={STATUS_TONE[finding.status]}>{STATUSES[finding.status]}</Pill>
          <span className="text-sm text-white/45">Felvette: {finding.createdBy} · {formatStamp(new Date(finding.createdAt))}</span>
        </span>
      </PageTitle>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          {finding.evidence && (
            <Panel title="Bizonyíték" icon={FileText}>
              <p className="border-l-2 border-mint/40 pl-3 text-sm leading-relaxed whitespace-pre-wrap text-white/70">{finding.evidence}</p>
            </Panel>
          )}
          <Panel title="Szerkesztés" icon={Pencil}>
            <FindingForm finding={finding} audits={audits} />
          </Panel>
          <Panel title="Javaslatok" icon={Lightbulb} action={<RecommendationGenerate findingId={finding.id} aiOn={aiAvailable()} />}>
            {recommendations.length === 0 ? (
              <p className="text-sm text-white/55">Ehhez a megállapításhoz még nincs javaslat.</p>
            ) : (
              <ul className="space-y-2">
                {recommendations.map((rec) => (
                  <li key={rec.id}>
                    <Link href={`/javaslatok/${rec.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/3 px-4 py-3 transition hover:border-mint/40">
                      <span className="min-w-0 truncate font-medium">{rec.title}</span>
                      <span className="flex shrink-0 gap-2">
                        <Pill tone="muted">{PRIORITIES[rec.priority]}</Pill>
                        <Pill tone={REC_TONE[rec.status]}>{REC_STATUSES[rec.status]}</Pill>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Változásnapló" icon={Clock}>
            <ol className="space-y-3">
              {[...finding.history].reverse().map((entry, index) => (
                <li key={`${entry.at}-${index}`} className="text-sm">
                  <p>{entry.action}</p>
                  <p className="text-xs text-white/40">{entry.by} · {formatStamp(new Date(entry.at))}</p>
                </li>
              ))}
            </ol>
          </Panel>
          <DeleteFindingButton id={finding.id} />
        </div>
      </div>
    </div>
  );
}
