"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, BookMarked, Copy, Languages, MessagesSquare, ShieldCheck, Sparkles, WandSparkles, X } from "lucide-react";

/** A „Pajzs 0.1” újdonság-ablak: felhasználónként (böngészőnként) egyszer, és csak a kiadás utáni napokban jelenik meg. */
const RELEASE = "pajzs-0.1";
const SHOW_UNTIL = new Date("2026-11-26T23:59:59+01:00");
const STORAGE_KEY = `pg-whats-new:${RELEASE}`;

const ITEMS: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Languages, title: "Profi fordítás 7 nyelven", text: "Pontosabb, természetesebb szöveg, a formázás megtartásával – a szakszavak ellenőrzésével." },
  { icon: WandSparkles, title: "Bizonytalan szakszavak jelölése", text: "A kétes kifejezések kiemelve, alternatívákkal – egy kattintással cserélhetők." },
  { icon: BookMarked, title: "Saját szótár", text: "A javított szakszót megjegyzi, és a következő fordításokban már magától azt használja." },
  { icon: MessagesSquare, title: "Kérdezz a fordításról", text: "Összefoglaló, magyarázat, közérthetőbb átírás vagy ellenőrzés – közvetlenül a fordítás mellett." },
  { icon: Copy, title: "Másolás egy gombbal", text: "A teljes fordítás kijelölés nélkül a vágólapra kerül, és helyben is szerkeszthető." },
  { icon: ShieldCheck, title: "Gyorsabb, megbízhatóbb AI", text: "Új AI-motor (Claude) tartalékrendszerrel: ha valami kiesik, egy másik AI azonnal átveszi." },
];

export function WhatsNew() {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (Date.now() > SHOW_UNTIL.getTime()) return;
    let seen = false;
    try {
      seen = localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      // Tiltott tárolónál is megjelenik; bezárás után az adott oldalbetöltésen belül nem jön vissza.
    }
    if (seen) return;
    const timer = setTimeout(() => setOpen(true), 700);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && dismiss();
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open]);

  function dismiss() {
    setOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // nincs tároló: csak most zárjuk be
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto p-4 print:hidden" role="dialog" aria-modal="true" aria-labelledby="whats-new-title">
      <button type="button" aria-label="Bezárás" onClick={dismiss} className="pg-wn-fade absolute inset-0 cursor-default bg-ink-950/75 backdrop-blur-md" />

      <div className="pg-wn-pop relative w-full max-w-2xl">
        {/* izzó, forgó keret */}
        <div aria-hidden className="pg-wn-ring absolute -inset-px rounded-[2rem] opacity-80" />
        <div aria-hidden className="absolute -top-24 left-1/2 size-72 -translate-x-1/2 rounded-full bg-mint/25 blur-3xl" />

        <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-ink-900/95 shadow-2xl shadow-black/60">
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgb(52_211_153/0.18),transparent_60%)]" />
          {Array.from({ length: 14 }).map((_, index) => (
            <span
              key={index}
              aria-hidden
              className="pg-wn-spark pointer-events-none absolute size-1 rounded-full bg-mint-bright"
              style={{ left: `${(index * 37) % 100}%`, top: `${(index * 53) % 45}%`, animationDelay: `${(index % 7) * 0.45}s` }}
            />
          ))}

          <button
            ref={closeRef}
            type="button"
            onClick={dismiss}
            aria-label="Bezárás"
            className="absolute top-4 right-4 z-10 grid size-9 place-items-center rounded-full text-white/50 transition hover:bg-white/10 hover:text-white"
          >
            <X size={18} aria-hidden />
          </button>

          <div className="relative px-6 pt-9 pb-6 text-center sm:px-10">
            <div className="pg-wn-float mx-auto grid size-20 place-items-center rounded-3xl bg-gradient-to-br from-mint/25 to-violet/25 ring-1 ring-white/15">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="" className="size-14 object-contain drop-shadow-[0_6px_20px_rgb(52_211_153/0.45)]" />
            </div>
            <p className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-mint/12 px-3 py-1 text-xs font-semibold tracking-[0.2em] text-mint uppercase ring-1 ring-mint/25">
              <Sparkles size={13} aria-hidden /> Új verzió
            </p>
            <h2 id="whats-new-title" className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl">
              <span className="pg-accent-text">Pajzs 0.1</span> kész lett!
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-white/60">
              Megújult a fordítás és az AI-asszisztens. Íme, miben lett jobb a Belső ellenőrzés:
            </p>
          </div>

          <ul className="relative grid gap-2.5 px-6 sm:grid-cols-2 sm:px-8">
            {ITEMS.map((item, index) => (
              <li
                key={item.title}
                className="pg-wn-item flex gap-3 rounded-2xl border border-white/8 bg-white/[0.035] p-3.5 transition hover:border-mint/30 hover:bg-white/[0.06]"
                style={{ animationDelay: `${0.15 + index * 0.07}s` }}
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-mint/12 text-mint ring-1 ring-mint/20">
                  <item.icon size={19} aria-hidden />
                </span>
                <span className="min-w-0 text-left">
                  <span className="block text-sm font-semibold">{item.title}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-white/55">{item.text}</span>
                </span>
              </li>
            ))}
          </ul>

          <div className="relative flex flex-col-reverse items-stretch gap-2 px-6 pt-6 pb-7 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <button type="button" onClick={dismiss} className="h-11 rounded-xl px-4 text-sm font-medium text-white/60 transition hover:bg-white/6 hover:text-white">
              Később
            </button>
            <Link
              href="/forditas"
              onClick={dismiss}
              className="pg-button group inline-flex h-12 items-center justify-center gap-2 rounded-xl px-6 font-semibold"
            >
              Kipróbálom a fordítást
              <ArrowRight size={18} aria-hidden className="transition group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
