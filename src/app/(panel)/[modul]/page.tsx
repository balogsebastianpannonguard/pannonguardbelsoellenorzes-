import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, Hammer } from "lucide-react";
import { PageTitle } from "@/components/page-title";
import { Panel, Pill } from "@/components/ui";
import { MODULES, moduleBySlug } from "@/lib/modules";

export function generateStaticParams() {
  return MODULES.map(({ slug }) => ({ modul: slug }));
}

export async function generateMetadata({ params }: PageProps<"/[modul]">): Promise<Metadata> {
  const { modul } = await params;
  return { title: moduleBySlug(modul)?.title ?? "Nem található" };
}

export default async function ModulePage({ params }: PageProps<"/[modul]">) {
  const { modul } = await params;
  const current = moduleBySlug(modul);
  if (!current) notFound();
  const Icon = current.icon;

  return (
    <div className="space-y-8">
      <Link href="/" className="pg-rise inline-flex items-center gap-1.5 text-sm text-white/55 hover:text-white">
        <ArrowLeft size={15} aria-hidden /> Áttekintés
      </Link>

      <PageTitle eyebrow={`${current.number} · Belső ellenőrzés`} title={current.title}>
        {current.summary}
      </PageTitle>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Panel title="Mire használható" icon={Icon}>
          <ul className="space-y-3">
            {current.goals.map((goal) => (
              <li key={goal} className="flex gap-3 text-sm text-white/75">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-mint/15 text-mint">
                  <Check size={12} aria-hidden />
                </span>
                {goal}
              </li>
            ))}
          </ul>
        </Panel>

        <Panel>
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-violet/20 text-violet-bright">
              <Hammer size={21} aria-hidden />
            </span>
            <div>
              <p className="font-semibold">Állapot</p>
              <Pill tone="info">Tervezett</Pill>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-white/55">
            Ez a munkaterület már szerepel a rendszerben, de a működése még fejlesztés alatt áll. A
            fentiek a tervezett képességek, nem a jelenlegi funkciók.
          </p>
        </Panel>
      </div>
    </div>
  );
}
