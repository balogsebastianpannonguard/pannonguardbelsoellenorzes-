import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, Pencil, Sparkles } from "lucide-react";
import { PageTitle } from "@/components/page-title";
import { RecommendationDecision, RecommendationForm } from "@/components/recommendation-actions";
import { Panel, Pill, Skeleton } from "@/components/ui";
import { formatStamp } from "@/lib/dates";
import { getRecommendationRow } from "@/lib/recommendations";
import { PRIORITIES, REC_STATUSES, REC_TONE } from "@/lib/recommendations-meta";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Javaslat" };

export default function RecommendationPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <div className="space-y-8">
      <Link href="/javaslatok" className="inline-flex items-center gap-1.5 text-sm text-white/55 hover:text-white">
        <ArrowLeft size={15} aria-hidden /> Javaslattétel
      </Link>
      <Suspense fallback={<Skeleton className="h-[34rem]" />}>
        <Detail params={params} />
      </Suspense>
    </div>
  );
}

async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }] = await Promise.all([params, requireUser()]);
  const rec = await getRecommendationRow(id);
  if (!rec) notFound();

  return (
    <div className="space-y-6">
      <PageTitle eyebrow="Javaslat" title={rec.title}>
        <span className="flex flex-wrap items-center gap-2">
          <Pill tone={REC_TONE[rec.status]}>{REC_STATUSES[rec.status]}</Pill>
          <Pill tone="muted">{PRIORITIES[rec.priority]} prioritás</Pill>
          {rec.source === "ai" && <Pill tone="info" icon={Sparkles}>AI-vázlat – ellenőrizd</Pill>}
          <span className="text-sm text-white/45">{rec.createdBy} · {formatStamp(new Date(rec.createdAt))}</span>
        </span>
      </PageTitle>
      <p className="text-sm text-white/55">
        Megállapítás: <Link href={`/hianyossagok/${rec.findingId}`} className="text-mint underline underline-offset-4">{rec.findingTitle}</Link>
      </p>
      <RecommendationDecision id={rec.id} status={rec.status} />
      <Panel title="Szerkesztés" icon={Pencil}>
        <RecommendationForm recommendation={rec} />
      </Panel>
    </div>
  );
}
