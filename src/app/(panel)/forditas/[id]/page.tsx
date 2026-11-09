import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, BookText } from "lucide-react";
import { PageTitle } from "@/components/page-title";
import { TranslateDisclaimer } from "@/components/translate-disclaimer";
import { TranslationTools } from "@/components/translate-tools";
import { Panel, Pill, Skeleton } from "@/components/ui";
import { formatStamp } from "@/lib/dates";
import { requireUser } from "@/lib/session";
import { getTranslation } from "@/lib/translations";

export const metadata: Metadata = { title: "Fordítás" };

export default function TranslationPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <div className="space-y-8">
      <Link href="/forditas" className="inline-flex items-center gap-1.5 text-sm text-white/55 hover:text-white">
        <ArrowLeft size={15} aria-hidden /> Fordítás
      </Link>
      <Suspense fallback={<Skeleton className="h-[34rem]" />}>
        <Detail params={params} />
      </Suspense>
    </div>
  );
}

async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }] = await Promise.all([params, requireUser()]);
  const doc = await getTranslation(id);
  if (!doc) notFound();

  return (
    <div className="space-y-6">
      <PageTitle eyebrow="Fordítás" title={doc.title}>
        {doc.sourceLanguage} → {doc.targetLanguage} · {doc.tone} hangnem · {formatStamp(doc.createdAt)} · {doc.createdBy}
      </PageTitle>
      <TranslationTools id={String(doc._id)} title={doc.title} translated={doc.translated} />
      <TranslateDisclaimer />

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title={<>Eredeti <Pill tone="muted">{doc.sourceLanguage}</Pill></>}>
          <div className="max-h-[36rem] overflow-y-auto text-sm leading-relaxed whitespace-pre-wrap text-white/70">{doc.original}</div>
        </Panel>
        <Panel title={<>Fordítás <Pill tone="ok">{doc.targetLanguage}</Pill></>}>
          <div className="max-h-[36rem] overflow-y-auto text-sm leading-relaxed whitespace-pre-wrap">{doc.translated}</div>
        </Panel>
      </div>

      <Panel title="Szakkifejezések" icon={BookText}>
        {doc.terms.length === 0 ? (
          <p className="text-sm text-white/55">Az AI nem jelölt meg külön szakkifejezést vagy bizonytalan részletet.</p>
        ) : (
          <>
            <p className="mb-3 text-xs text-white/45">A szakszavak és a bizonytalan fordítású részletek; ellenőrizd őket a végleges felhasználás előtt.</p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {doc.terms.map((term) => (
                <li key={term.source} className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/3 px-3 py-2 text-sm">
                  <span className="min-w-0 flex-1 truncate text-white/70">{term.source}</span>
                  <span aria-hidden className="text-mint">→</span>
                  <span className="min-w-0 flex-1 truncate font-medium">{term.target}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>
    </div>
  );
}
