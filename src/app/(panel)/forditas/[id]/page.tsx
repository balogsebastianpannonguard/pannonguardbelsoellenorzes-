import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { PageTitle } from "@/components/page-title";
import { TranslateDisclaimer } from "@/components/translate-disclaimer";
import { TranslationWorkbench } from "@/components/translate-tools";
import { TranslationChat } from "@/components/translate-chat";
import { aiAvailable } from "@/lib/ai";
import { Skeleton } from "@/components/ui";
import { formatStamp } from "@/lib/dates";
import { requireUser } from "@/lib/session";
import { getTranslation } from "@/lib/translations";

export const metadata: Metadata = { title: "Fordítás" };
export const maxDuration = 120;

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
        {doc.sourceLanguage} → {doc.targetLanguage} · {doc.tone} hangnem{doc.engine && <> · {doc.engine}</>} · {formatStamp(doc.createdAt)} · {doc.createdBy}
        {doc.editedAt && <> · kézzel javítva: {formatStamp(doc.editedAt)}</>}
      </PageTitle>
      <TranslateDisclaimer />
      <TranslationWorkbench
        id={String(doc._id)}
        title={doc.title}
        original={doc.original}
        sourceLanguage={doc.sourceLanguage}
        targetLanguage={doc.targetLanguage}
        translated={doc.translated}
        terms={JSON.parse(JSON.stringify(doc.terms ?? []))}
      />
      <TranslationChat id={String(doc._id)} aiOn={aiAvailable()} />
    </div>
  );
}
