import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, History, Languages } from "lucide-react";
import { PageTitle } from "@/components/page-title";
import { TranslateDisclaimer } from "@/components/translate-disclaimer";
import { TranslateForm } from "@/components/translate-form";
import { Empty, Panel, Skeleton } from "@/components/ui";
import { aiAvailable } from "@/lib/ai";
import { formatStamp } from "@/lib/dates";
import { requireUser } from "@/lib/session";
import { listTranslations } from "@/lib/translations";

export const metadata: Metadata = { title: "Fordítás" };
export const maxDuration = 120;

export default function TranslatePage() {
  return (
    <div className="space-y-8">
      <PageTitle eyebrow="03 · Belső ellenőrzés" title="Idegen nyelvű okiratok" accent="fordítása.">
        Illessz be szöveget vagy tölts fel dokumentumot: a rendszer felismeri a nyelvet, lefordítja, és az eredetit a
        fordítás mellett megtartja az összevetéshez.
      </PageTitle>
      <Suspense fallback={<Skeleton className="h-[34rem]" />}>
        <Translate />
      </Suspense>
    </div>
  );
}

async function Translate() {
  await requireUser();
  const history = await listTranslations();

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-6">
        <Panel title="Új fordítás" icon={Languages}>
          <TranslateForm aiOn={aiAvailable()} />
        </Panel>
        <TranslateDisclaimer />
      </div>

      <Panel title="Előzmények" icon={History}>
        {history.length === 0 ? (
          <Empty icon={Languages} title="Még nincs fordítás" text="Az elkészült fordítások itt jelennek meg." />
        ) : (
          <ul className="space-y-1">
            {history.map((item) => (
              <li key={item.id}>
                <Link href={`/forditas/${item.id}`} className="group flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-white/5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.title}</p>
                    <p className="truncate text-xs text-white/45">
                      {item.sourceLanguage} → {item.targetLanguage} · {formatStamp(new Date(item.createdAt))} · {item.createdBy}
                    </p>
                  </div>
                  <ArrowRight size={15} aria-hidden className="shrink-0 text-white/30 transition group-hover:translate-x-0.5 group-hover:text-mint" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
