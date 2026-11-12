"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Bug, Home, RotateCcw, TriangleAlert } from "lucide-react";
import { PAJZS_TICKET_EVENT, type PajzsTicketDetail } from "@/components/pajzs/pajzs";

/** A panel oldalainak hibaoldala: újrapróbálás, és egy kattintással kitöltött hibabejelentés Pajzsnál. */
export default function PanelError({ error, retry }: { error: unknown; retry: () => void }) {
  const digest = error instanceof Error ? (error as Error & { digest?: string }).digest : undefined;
  const message = error instanceof Error ? error.message : String(error ?? "");

  useEffect(() => {
    console.error(error);
  }, [error]);

  function report() {
    const detail: PajzsTicketDetail = {
      text: "Hibaoldal jelent meg ezen az oldalon. Mit csináltam előtte: ",
      diagnostics: [`Hibaoldal${digest ? ` · azonosító: ${digest}` : ""}${message && !digest ? ` · ${message}` : ""}`],
    };
    window.dispatchEvent(new CustomEvent(PAJZS_TICKET_EVENT, { detail }));
  }

  return (
    <div className="pg-rise mx-auto max-w-xl py-10 text-center">
      <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-red-500/12 text-red-300 ring-1 ring-red-400/30">
        <TriangleAlert size={30} aria-hidden />
      </span>
      <h1 className="mt-5 font-display text-2xl font-semibold">Valami elakadt ezen az oldalon</h1>
      <p className="mt-2 text-sm leading-relaxed text-white/60">
        A műveletet nem sikerült befejezni. Az adataid biztonságban vannak; próbáld újra, és ha ismét előjön, jelentsd be egy kattintással, a
        fejlesztő a hiba azonosítójával együtt azonnal megkapja.
      </p>
      {digest && (
        <p className="mt-3 text-xs text-white/40">
          Hibaazonosító: <span className="rounded-md bg-white/6 px-2 py-0.5 font-mono text-white/70">{digest}</span>
        </p>
      )}
      <div className="mt-7 flex flex-wrap justify-center gap-2">
        <button type="button" onClick={() => retry()} className="pg-button flex h-11 items-center gap-2 rounded-xl px-5 text-sm font-semibold">
          <RotateCcw size={16} aria-hidden /> Újrapróbálás
        </button>
        <button type="button" onClick={report} className="flex h-11 items-center gap-2 rounded-xl border border-mint/40 px-5 text-sm font-semibold text-mint transition hover:bg-mint/10">
          <Bug size={16} aria-hidden /> Hiba bejelentése
        </button>
        <Link href="/" className="flex h-11 items-center gap-2 rounded-xl border border-white/12 px-5 text-sm text-white/70 transition hover:border-white/30 hover:text-white">
          <Home size={16} aria-hidden /> Áttekintés
        </Link>
      </div>
    </div>
  );
}
