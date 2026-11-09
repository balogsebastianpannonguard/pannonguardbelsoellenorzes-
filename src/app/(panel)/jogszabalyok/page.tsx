import type { Metadata } from "next";
import { Suspense } from "react";
import { BellRing, CalendarClock, CircleAlert, History, Plus, Scale, Sparkles } from "lucide-react";
import { AddLawForm, CheckAllButton, LawCard } from "@/components/legal-controls";
import { PageTitle } from "@/components/page-title";
import { Panel, Skeleton, Stat } from "@/components/ui";
import { aiAvailable } from "@/lib/ai";
import { dayKey, formatStamp } from "@/lib/dates";
import { listLaws } from "@/lib/legal";
import { requireUser } from "@/lib/session";
import { daysBetween } from "@/lib/tenders-shared";

export const metadata: Metadata = { title: "Jogszabályok" };

export default function LegalPage() {
  return (
    <div className="space-y-8">
      <PageTitle eyebrow="07 · Belső ellenőrzés" title="Jogszabályváltozások" accent="követése">
        A figyelt jogszabályok szövegét naponta összevetjük az előző állapottal. Változás esetén itt látod, mi módosult, és mi a teendő.
      </PageTitle>
      <Suspense fallback={<Skeleton className="h-[40rem]" />}>
        <Legal />
      </Suspense>
    </div>
  );
}

async function Legal() {
  await requireUser();
  const laws = await listLaws();
  const aiOn = aiAvailable();
  const today = dayKey(new Date());

  const changed = laws.filter((law) => law.state === "changed");
  const failed = laws.filter((law) => law.state === "error");
  const upcoming = laws.filter((law) => law.effectiveDate && daysBetween(today, law.effectiveDate) >= 0 && daysBetween(today, law.effectiveDate) <= 90);
  const lastChecked = laws.map((law) => law.checkedAt).filter((value): value is string => Boolean(value)).sort().at(-1);

  const timeline = laws
    .flatMap((law) => law.history.map((entry) => ({ ...entry, law: `${law.cite} – ${law.name}`, lawId: law.id })))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 40);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Figyelt jogszabály" value={laws.length} icon={Scale} tone="text-mint-bright" hint={lastChecked ? `Utolsó ellenőrzés: ${formatStamp(new Date(lastChecked))}` : "Még nem volt ellenőrzés"} />
        <Stat label="Változást észleltünk" value={changed.length} icon={BellRing} tone={changed.length ? "text-amber-300" : "text-white/70"} />
        <Stat label="Hatálybalépés 90 napon belül" value={upcoming.length} icon={CalendarClock} tone={upcoming.length ? "text-violet-bright" : "text-white/70"} />
        <Stat label="Ellenőrzési hiba" value={failed.length} icon={CircleAlert} tone={failed.length ? "text-red-300" : "text-white/70"} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <CheckAllButton />
        <p className="flex items-center gap-2 text-xs text-white/45">
          <Sparkles size={14} aria-hidden className={aiOn ? "text-mint" : "text-white/30"} />
          {aiOn ? "Változásnál AI-összefoglaló is készül." : "AI-összefoglaló nincs: ehhez GEMINI_API_KEY szükséges."}
        </p>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-4">
          {laws.map((law) => (
            <LawCard key={law.id} law={law} aiOn={aiOn} />
          ))}
        </div>
        <div className="space-y-6 xl:sticky xl:top-8">
          <Panel title="Új jogszabály figyelése" icon={Plus}>
            <AddLawForm />
          </Panel>
        </div>
      </div>

      <Panel title="Változások időrendben" icon={History}>
        {timeline.length === 0 ? (
          <p className="text-sm text-white/55">
            Még nem észleltünk változást. Az első ellenőrzés az alapállapotot rögzíti, a változásokat ehhez képest jelezzük.
          </p>
        ) : (
          <ol className="space-y-3">
            {timeline.map((entry) => (
              <li key={`${entry.lawId}-${entry.at}`} className="rounded-2xl border border-white/8 bg-white/3 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{entry.law}</p>
                  <time dateTime={entry.at} className="text-xs text-white/45">{formatStamp(new Date(entry.at))}</time>
                </div>
                <p className="mt-1.5 text-sm text-white/65">
                  {entry.summary ?? `${entry.added.length} új vagy módosult és ${entry.removed.length} elhagyott szövegrész.`}
                </p>
              </li>
            ))}
          </ol>
        )}
      </Panel>
    </div>
  );
}
