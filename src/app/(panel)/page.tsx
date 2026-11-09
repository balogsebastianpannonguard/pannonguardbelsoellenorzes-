import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  CircleAlert,
  CircleCheck,
  KeyRound,
  LogIn,
  MonitorSmartphone,
  PartyPopper,
  ShieldCheck,
  Siren,
  type LucideIcon,
} from "lucide-react";
import { PageTitle } from "@/components/page-title";
import { Panel, Pill, type Tone } from "@/components/ui";
import { formatShortDay, formatStamp, greeting } from "@/lib/dates";
import { MODULES } from "@/lib/modules";
import { loadActivity } from "@/lib/overview";
import { countActiveSessions, requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Áttekintés" };

type Control = { title: string; detail: string; refs: string; done: boolean };

// A felsorolt intézkedések a rendszerben ténylegesen megvalósított technikai védelmek;
// a hivatkozások az ISO/IEC 27001:2022 Annex A és az NIS2-irányelv 21. cikk (2) bekezdéséhez igazodnak.
function controls(mfaActive: boolean): Control[] {
  return [
    {
      title: "Többtényezős hitelesítés",
      detail: "Jelszó és időalapú (TOTP) kód a belépéshez, a kód csak egyszer használható.",
      refs: "ISO A.8.5 · NIS2 21(2)(j)",
      done: mfaActive,
    },
    {
      title: "Hozzáférés-kezelés",
      detail: "Csak meghívóval lehet fiókot nyitni; a visszavonás minden kérésnél azonnal érvényes.",
      refs: "ISO A.5.15, A.5.18 · NIS2 21(2)(i)",
      done: true,
    },
    {
      title: "Titkosítás és jelszóvédelem",
      detail: "Hitelesítő kulcsok AES-256-GCM-mel, jelszavak scrypt hash-sel tárolva.",
      refs: "ISO A.8.24 · NIS2 21(2)(h)",
      done: true,
    },
    {
      title: "Naplózás és nyomon követés",
      detail: "Regisztráció, belépés, hibás kód, zárolás és kijelentkezés naplózva, IP-vel és eszközzel.",
      refs: "ISO A.8.15 · NIS2 21(2)(b)",
      done: true,
    },
    {
      title: "Munkamenet- és brute force védelem",
      detail: "12 órás munkamenet, 60 perc tétlenség utáni lejárat, 8 hibás próbálkozás után zárolás.",
      refs: "ISO A.8.5, A.8.20 · NIS2 21(2)(g)",
      done: true,
    },
    {
      title: "Biztonságos webes környezet",
      detail: "CSP, HSTS, clickjacking- és MIME-védelem, noindex; élesben __Host- süti.",
      refs: "ISO A.8.26 · NIS2 21(2)(e)",
      done: true,
    },
    {
      title: "Adatkezelési cél és megőrzési idő",
      detail: "Az ellenőrzési adatok bevezetése előtt rögzítendő, és az adatkezelési tájékoztatóba kerül.",
      refs: "ISO A.5.34 · GDPR 30. cikk",
      done: false,
    },
    {
      title: "Incidenskezelési eljárás",
      detail: "A NIS2 szerinti korai jelzés (24 óra) felelőseinek és menetének írásba foglalása.",
      refs: "ISO A.5.24–A.5.26 · NIS2 23. cikk",
      done: false,
    },
  ];
}

export default function OverviewPage({ searchParams }: PageProps<"/">) {
  return (
    <Suspense fallback={<OverviewSkeleton />}>
      <Overview searchParams={searchParams} />
    </Suspense>
  );
}

async function Overview({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);
  const now = new Date();
  const [activity, sessions] = await Promise.all([
    loadActivity(user.session.userId, now),
    countActiveSessions(user.session.userId),
  ]);

  const list = controls(Boolean(user.totpEnabledAt));
  const done = list.filter((control) => control.done).length;
  const percent = Math.round((done / list.length) * 100);
  const maxDay = Math.max(1, ...activity.days.map((day) => day.success + day.failure));

  const cards: { label: string; value: string; note: string; icon: LucideIcon; tone: string; glow: string }[] = [
    {
      label: "Kétlépcsős azonosítás",
      value: user.totpEnabledAt ? "Aktív" : "Hiányzik",
      note: user.totpEnabledAt ? `${formatStamp(user.totpEnabledAt)} óta` : "Állítsd be a hitelesítőt",
      icon: ShieldCheck,
      tone: user.totpEnabledAt ? "text-mint-bright" : "text-amber-300",
      glow: "from-mint/20",
    },
    {
      label: "Aktív munkamenet",
      value: String(sessions),
      note: sessions === 1 ? "csak ez az eszköz" : "eszközön vagy belépve",
      icon: MonitorSmartphone,
      tone: "text-violet-bright",
      glow: "from-violet/25",
    },
    {
      label: "Belépés (30 nap)",
      value: String(activity.logins30),
      note: activity.previousLogin ? `Előző: ${formatStamp(activity.previousLogin)}` : "Ez az első belépésed",
      icon: LogIn,
      tone: "text-white",
      glow: "from-white/10",
    },
    {
      label: "Hibás kísérlet (30 nap)",
      value: String(activity.failures),
      note: activity.failures ? "Nézd át a Biztonság oldalt" : "Nincs gyanús esemény",
      icon: activity.failures ? CircleAlert : CircleCheck,
      tone: activity.failures ? "text-amber-300" : "text-emerald-300",
      glow: activity.failures ? "from-amber-400/15" : "from-emerald-400/15",
    },
  ];

  const R = 54;
  const C = 2 * Math.PI * R;

  return (
    <div className="space-y-8">
      {params.udv === "1" && (
        <div className="pg-rise flex items-center gap-4 rounded-2xl border border-mint/25 bg-linear-to-r from-mint/15 to-transparent p-5">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-mint/20 text-mint">
            <PartyPopper size={22} aria-hidden />
          </span>
          <div>
            <p className="font-semibold">A fiókod elkészült, a hitelesítő aktív.</p>
            <p className="text-sm text-white/60">Innentől a belépéshez a jelszavad és a telefonod kódja is kell.</p>
          </div>
        </div>
      )}

      <PageTitle eyebrow="Belső ellenőrzés" title={`${greeting(now)}, ${user.firstName}!`} accent="Itt a mai kép.">
        A fiókod állapota és a biztonsági alapintézkedések egy helyen. Az ellenőrzési modulok fokozatosan
        kerülnek ide.
      </PageTitle>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, note, icon: Icon, tone, glow }, index) => (
          <div
            key={label}
            className={`pg-card pg-rise relative overflow-hidden rounded-2xl bg-linear-to-br ${glow} to-transparent p-5`}
            style={{ animationDelay: `${index * 0.06}s` }}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm text-white/60">{label}</p>
              <Icon size={18} aria-hidden className={tone} />
            </div>
            <p className={`mt-3 font-display text-3xl font-semibold ${tone}`}>{value}</p>
            <p className="mt-1 truncate text-xs text-white/45">{note}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Panel title="Belépések az elmúlt 14 napban" icon={LogIn}>
          <div className="flex h-44 items-end gap-1.5 sm:gap-2" role="img" aria-label="Napi belépések oszlopdiagramja">
            {activity.days.map((day, index) => {
              const total = day.success + day.failure;
              return (
                <div key={day.day} className="group flex h-full min-w-0 flex-1 flex-col justify-end" title={`${day.day}: ${day.success} sikeres, ${day.failure} hibás`}>
                  <div
                    className="pg-bar flex flex-col justify-end overflow-hidden rounded-t-md"
                    style={{ height: `${total ? Math.max(8, (total / maxDay) * 100) : 3}%`, animationDelay: `${index * 0.035}s` }}
                  >
                    {day.failure > 0 && <span className="block bg-amber-400/80" style={{ flex: day.failure }} />}
                    <span
                      className={`block ${day.success ? "bg-linear-to-t from-mint to-violet-bright" : "bg-white/10"}`}
                      style={{ flex: Math.max(day.success, total ? 0 : 1) }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex gap-1.5 sm:gap-2">
            {activity.days.map((day, index) => (
              <span key={day.day} className="min-w-0 flex-1 truncate text-center text-[0.65rem] text-white/40">
                {index % 2 === 1 || index === 13 ? formatShortDay(day.day) : ""}
              </span>
            ))}
          </div>
          <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/50">
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-linear-to-t from-mint to-violet-bright" /> Sikeres belépés</span>
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-amber-400/80" /> Hibás jelszó vagy kód</span>
          </p>
        </Panel>

        <Panel title="Biztonsági alapállapot" icon={ShieldCheck}>
          <div className="relative mx-auto grid size-40 place-items-center">
            <svg viewBox="0 0 128 128" className="absolute inset-0 -rotate-90" aria-hidden>
              <circle cx="64" cy="64" r={R} fill="none" strokeWidth="10" className="stroke-white/8" />
              <circle
                cx="64"
                cy="64"
                r={R}
                fill="none"
                strokeWidth="10"
                strokeLinecap="round"
                stroke="url(#ring)"
                className="pg-ring"
                style={{ "--len": C, strokeDashoffset: C * (1 - percent / 100) } as React.CSSProperties}
                strokeDasharray={C}
              />
              <defs>
                <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#6ee7b7" />
                  <stop offset="1" stopColor="#a78bfa" />
                </linearGradient>
              </defs>
            </svg>
            <div className="text-center">
              <p className="font-display text-4xl font-semibold">{percent}%</p>
              <p className="text-xs text-white/50">{done} / {list.length} intézkedés</p>
            </div>
          </div>
          <p className="mt-5 text-center text-xs leading-relaxed text-white/50">
            A rendszerben megvalósított védelmek és a bevezetés előtt még rögzítendő teendők aránya.
          </p>
        </Panel>
      </div>

      <Panel
        title="ISO 27001 és NIS2 intézkedések"
        icon={KeyRound}
        action={<Pill tone="info">Technikai alapintézkedések</Pill>}
      >
        <ul className="grid gap-3 md:grid-cols-2">
          {list.map(({ title, detail, refs, done: ok }) => (
            <li
              key={title}
              className={`flex gap-3 rounded-2xl border p-4 ${ok ? "border-white/8 bg-white/3" : "border-amber-300/20 bg-amber-300/5"}`}
            >
              <span className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg ${ok ? "bg-mint/15 text-mint" : "bg-amber-300/15 text-amber-300"}`}>
                {ok ? <CircleCheck size={17} aria-hidden /> : <Siren size={17} aria-hidden />}
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{title}</p>
                  <Pill tone={(ok ? "ok" : "warning") satisfies Tone}>{ok ? "Működik" : "Teendő"}</Pill>
                </div>
                <p className="mt-1 text-sm text-white/55">{detail}</p>
                <p className="mt-1.5 text-[0.7rem] tracking-wide text-violet-bright/80">{refs}</p>
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      <section>
        <div className="mb-4 flex items-center gap-3">
          <h2 className="font-display text-lg font-semibold">Munkaterületek</h2>
          <Pill tone="muted">Fejlesztés alatt</Pill>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {MODULES.map(({ slug, number, icon: Icon, title, summary }) => (
            <Link
              key={slug}
              href={`/${slug}`}
              className="pg-card group rounded-2xl p-5 hover:bg-white/5"
            >
              <div className="flex items-center justify-between">
                <span className="grid size-10 place-items-center rounded-xl bg-violet/15 text-violet-bright transition-colors group-hover:bg-mint/15 group-hover:text-mint">
                  <Icon size={19} aria-hidden />
                </span>
                <span className="font-display text-xs text-white/30">{number}</span>
              </div>
              <p className="mt-4 font-semibold">{title}</p>
              <p className="mt-1 line-clamp-3 text-sm text-white/50">{summary}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="pg-skeleton h-3 w-32 rounded" />
        <div className="pg-skeleton h-10 w-96 max-w-full rounded-lg" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="pg-skeleton h-32 rounded-2xl" />
        ))}
      </div>
      <div className="pg-skeleton h-72 rounded-3xl" />
    </div>
  );
}
