"use client";

import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { BookMarked, Plus, Search, Trash2 } from "lucide-react";
import { Feedback, Input, Panel, Select, buttonClass } from "@/components/ui";
import { deleteGlossaryEntry, saveGlossaryEntry } from "@/lib/actions/translate";
import type { FormState } from "@/lib/form";
import { LANGUAGES } from "@/lib/translations-meta";
import type { GlossaryRow } from "@/lib/translations";

/** A felhasználó szótára: a jóváhagyott szakszófordítások, amelyeket minden új fordítás kötelezően használ. */
export function GlossaryPanel({ entries }: { entries: GlossaryRow[] }) {
  const [state, action, saving] = useActionState<FormState, FormData>(saveGlossaryEntry, {});
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? entries.filter((entry) => `${entry.source} ${entry.target}`.toLowerCase().includes(needle)) : entries;
  }, [entries, query]);

  return (
    <Panel
      title={<>Szótár <span className="text-sm font-normal text-white/45">({entries.length})</span></>}
      icon={BookMarked}
      action={
        <button type="button" onClick={() => setOpen(!open)} className={buttonClass("secondary", "sm")}>
          <Plus size={15} aria-hidden /> Új kifejezés
        </button>
      }
    >
      <p className="mb-3 text-xs text-white/45">
        Az itt lévő fordításokat az AI minden új fordításban kötelezően használja. A fordítás oldalán a kifejezések
        javításakor automatikusan bekerülnek ide.
      </p>

      {open && (
        <form ref={formRef} action={action} className="mb-4 space-y-2 rounded-2xl border border-white/10 bg-white/3 p-3">
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_9rem]">
            <Input name="source" required maxLength={200} placeholder="Eredeti kifejezés" aria-label="Eredeti kifejezés" />
            <Input name="target" required maxLength={200} placeholder="Helyes fordítás" aria-label="Helyes fordítás" />
            <Select name="language" defaultValue="hu" aria-label="Célnyelv">
              {Object.entries(LANGUAGES).map(([code, name]) => (
                <option key={code} value={code}>
                  {name[0].toUpperCase() + name.slice(1)}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex items-center justify-between gap-3">
            <Feedback error={state.error} message={state.message} />
            <button type="submit" disabled={saving} className={buttonClass("primary", "sm")}>
              Mentés
            </button>
          </div>
        </form>
      )}

      {entries.length === 0 ? (
        <p className="text-sm text-white/55">Még üres. Egy fordításban javított szakszó „Mentés a szótárba” jelöléssel kerül ide.</p>
      ) : (
        <>
          {entries.length > 8 && (
            <label className="relative mb-3 block">
              <Search size={15} aria-hidden className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-white/35" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Keresés a szótárban…" className="pl-9" />
            </label>
          )}
          <ul className="max-h-96 space-y-1 overflow-y-auto">
            {shown.map((entry) => (
              <li key={entry.id} className="flex items-center gap-2 rounded-xl px-2 py-2 text-sm hover:bg-white/4">
                <span className="min-w-0 flex-1 truncate text-white/70" title={entry.source}>{entry.source}</span>
                <span aria-hidden className="text-mint">→</span>
                <span className="min-w-0 flex-1 truncate font-medium" title={entry.target}>{entry.target}</span>
                <span className="shrink-0 text-xs text-white/40">{entry.targetLanguage}</span>
                <button
                  type="button"
                  disabled={pending}
                  aria-label={`${entry.source} törlése a szótárból`}
                  onClick={() => {
                    if (confirm(`Törlöd a szótárból: „${entry.source} → ${entry.target}”?`)) start(async () => void (await deleteGlossaryEntry(entry.id)));
                  }}
                  className="grid size-8 shrink-0 place-items-center rounded-lg text-white/35 transition hover:bg-red-500/10 hover:text-red-300"
                >
                  <Trash2 size={14} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </Panel>
  );
}
