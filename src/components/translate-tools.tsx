"use client";

import { Fragment, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookMarked, BookText, Check, CircleHelp, Copy, Download, PencilLine, Plus, Save, Trash2, X } from "lucide-react";
import { Feedback, Input, Panel, Pill, Textarea, buttonClass } from "@/components/ui";
import { deleteTranslation, saveTranslatedText, updateTerm } from "@/lib/actions/translate";
import { segmentTerms } from "@/lib/translations-meta";
import type { TranslationTerm } from "@/lib/translations";

/** Vágólapra másolás; régebbi böngészőben vagy nem biztonságos környezetben rejtett szövegmezővel. */
async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = value;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
}

function CopyButton({ text, label = "Fordítás másolása", size = "sm" as const, primary = false }: { text: string; label?: string; size?: "sm" | "md"; primary?: boolean }) {
  const [state, setState] = useState<"idle" | "ok" | "error">("idle");
  return (
    <button
      type="button"
      className={buttonClass(primary ? "primary" : "secondary", size)}
      onClick={async () => {
        setState((await copyText(text)) ? "ok" : "error");
        setTimeout(() => setState("idle"), 1800);
      }}
    >
      {state === "ok" ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />}
      {state === "ok" ? "Másolva a vágólapra" : state === "error" ? "Nem sikerült másolni" : label}
    </button>
  );
}

type Props = {
  id: string;
  title: string;
  original: string;
  sourceLanguage: string;
  targetLanguage: string;
  translated: string;
  terms: TranslationTerm[];
};

type Editing = { index: number | null; source: string; current: string; value: string };

export function TranslationWorkbench(props: Props) {
  const router = useRouter();
  const [translated, setTranslated] = useState(props.translated);
  const [terms, setTerms] = useState(props.terms);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [remember, setRemember] = useState(true);
  const [textMode, setTextMode] = useState(false);
  const [draft, setDraft] = useState(props.translated);
  const [notice, setNotice] = useState<{ error?: string; message?: string }>({});
  const [pending, start] = useTransition();
  const termsRef = useRef<HTMLDivElement>(null);

  const segments = useMemo(() => segmentTerms(translated, terms.map((term) => term.target)), [translated, terms]);
  const uncertainCount = terms.filter((term) => term.uncertain).length;

  function openTerm(index: number) {
    const term = terms[index];
    setEditing({ index, source: term.source, current: term.target, value: term.target });
    setNotice({});
    requestAnimationFrame(() => termsRef.current?.querySelector(`[data-term="${index}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" }));
  }

  function openNew() {
    const selection = window.getSelection()?.toString().trim().slice(0, 200) ?? "";
    setEditing({ index: null, source: "", current: selection, value: "" });
    setNotice({});
    requestAnimationFrame(() => termsRef.current?.querySelector("[data-term=new]")?.scrollIntoView({ behavior: "smooth", block: "center" }));
  }

  function apply(value: string) {
    if (!editing) return;
    const next = value.trim();
    if (!next) return setNotice({ error: "Add meg a helyes fordítást." });
    if (!editing.source.trim()) return setNotice({ error: "Add meg az eredeti (forrásnyelvi) kifejezést." });
    start(async () => {
      const result = await updateTerm({ id: props.id, source: editing.source, current: editing.current, target: next, remember });
      if (result.error || !result.terms || result.translated === undefined) return setNotice({ error: result.error ?? "A mentés nem sikerült." });
      setTranslated(result.translated);
      setDraft(result.translated);
      setTerms(result.terms);
      setEditing(null);
      const where = result.replaced ? `${result.replaced} helyen javítva a szövegben` : editing.current ? "a szövegben nem találtam meg a régi alakot, kézzel javítsd" : "felvéve";
      setNotice({ message: `„${next}” – ${where}${remember ? ", és mentve a szótárba a következő fordításokhoz." : "."}` });
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <CopyButton text={translated} primary size="md" />
        <button
          type="button"
          className={buttonClass("secondary")}
          onClick={() => {
            const url = URL.createObjectURL(new Blob([translated], { type: "text/plain;charset=utf-8" }));
            const link = document.createElement("a");
            link.href = url;
            link.download = `${props.title.replace(/[^\p{L}\p{N}]+/gu, "-").slice(0, 50) || "forditas"}.txt`;
            link.click();
            // Azonnali visszavonásnál a Safari és a Firefox nem mindig tölti le a fájlt.
            setTimeout(() => URL.revokeObjectURL(url), 1500);
          }}
        >
          <Download size={15} aria-hidden /> TXT letöltése
        </button>
        <button
          type="button"
          disabled={pending}
          className={buttonClass("danger")}
          onClick={() => {
            if (!confirm("Biztosan törlöd ezt a fordítást?")) return;
            start(async () => {
              await deleteTranslation(props.id);
              router.push("/forditas");
            });
          }}
        >
          <Trash2 size={15} aria-hidden /> Törlés
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title={<>Eredeti <Pill tone="muted">{props.sourceLanguage}</Pill></>}>
          <div className="max-h-[36rem] overflow-y-auto text-sm leading-relaxed whitespace-pre-wrap text-white/70">{props.original}</div>
        </Panel>
        <Panel
          title={<>Fordítás <Pill tone="ok">{props.targetLanguage}</Pill></>}
          action={
            <div className="flex flex-wrap gap-2">
              {!textMode && <CopyButton text={translated} label="Másolás" />}
              <button
                type="button"
                className={buttonClass(textMode ? "ghost" : "secondary", "sm")}
                onClick={() => {
                  setDraft(translated);
                  setTextMode(!textMode);
                  setNotice({});
                }}
              >
                {textMode ? <X size={15} aria-hidden /> : <PencilLine size={15} aria-hidden />}
                {textMode ? "Mégse" : "Szöveg szerkesztése"}
              </button>
            </div>
          }
        >
          {textMode ? (
            <div className="space-y-3">
              <Textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={18} className="text-sm leading-relaxed" />
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={pending || draft.trim() === translated.trim()}
                  className={buttonClass("primary", "sm")}
                  onClick={() =>
                    start(async () => {
                      const result = await saveTranslatedText(props.id, draft);
                      if (result.error) return setNotice({ error: result.error });
                      setTranslated(draft.trim());
                      setTextMode(false);
                      setNotice({ message: "A javított fordítás elmentve." });
                    })
                  }
                >
                  <Save size={15} aria-hidden /> Mentés
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="max-h-[36rem] overflow-y-auto text-sm leading-relaxed whitespace-pre-wrap">
                {segments.map((segment, key) => {
                  if (segment.term === undefined) return <Fragment key={key}>{segment.text}</Fragment>;
                  const term = terms[segment.term];
                  const tone = term.uncertain
                    ? "decoration-amber-300 bg-amber-300/10 hover:bg-amber-300/20"
                    : term.fromGlossary
                      ? "decoration-mint bg-mint/8 hover:bg-mint/15"
                      : "decoration-white/30 hover:bg-white/8";
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => openTerm(segment.term!)}
                      title={term.uncertain ? `Bizonytalan fordítás – eredeti: ${term.source}. Kattints az alternatívákhoz.` : `Eredeti: ${term.source}. Kattints a módosításhoz.`}
                      className={`rounded-sm underline decoration-dotted decoration-2 underline-offset-4 transition ${tone}`}
                    >
                      {segment.text}
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/45">
                <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-amber-300" /> bizonytalan</span>
                <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-mint" /> szótárból</span>
                <span>Kattints egy kiemelt kifejezésre a javításhoz, vagy jelölj ki egy szót, és add hozzá lent.</span>
              </p>
            </>
          )}
        </Panel>
      </div>

      <div ref={termsRef}>
        <Panel
          title={<>Szakkifejezések {uncertainCount > 0 && <Pill tone="warning" icon={CircleHelp}>{uncertainCount} bizonytalan</Pill>}</>}
          icon={BookText}
          action={
            <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={openNew} className={buttonClass("secondary", "sm")}>
              <Plus size={15} aria-hidden /> Kifejezés javítása
            </button>
          }
        >
          <div className="mb-3 space-y-2">
            <Feedback error={notice.error} message={notice.message} />
            <p className="text-xs text-white/45">
              A bizonytalan fordítású kifejezéseknél az AI alternatívákat ajánl. A választott fordítás a szövegben mindenhol
              kicserélődik, és ha a szótárba mented, a következő fordításokban már automatikusan ezt használja a rendszer.
            </p>
          </div>

          {editing?.index === null && (
            <TermEditor
              key="new"
              data-term="new"
              editing={editing}
              setEditing={setEditing}
              remember={remember}
              setRemember={setRemember}
              pending={pending}
              onApply={apply}
              isNew
            />
          )}

          {terms.length === 0 && editing?.index !== null ? (
            <p className="text-sm text-white/55">Az AI nem jelölt meg szakkifejezést. A „Kifejezés javítása” gombbal bármelyik szót javíthatod.</p>
          ) : (
            <ul className="grid gap-2 md:grid-cols-2">
              {terms.map((term, index) =>
                editing?.index === index ? (
                  <li key={term.source} className="md:col-span-2">
                    <TermEditor
                      data-term={String(index)}
                      editing={editing}
                      setEditing={setEditing}
                      remember={remember}
                      setRemember={setRemember}
                      pending={pending}
                      onApply={apply}
                      term={term}
                    />
                  </li>
                ) : (
                  <li key={term.source} data-term={index}>
                    <button
                      type="button"
                      onClick={() => openTerm(index)}
                      className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition hover:bg-white/6 ${
                        term.uncertain ? "border-amber-300/30 bg-amber-300/5" : term.fromGlossary ? "border-mint/25 bg-mint/5" : "border-white/8 bg-white/3"
                      }`}
                    >
                      <span className="min-w-0 flex-1 truncate text-white/70" title={term.source}>{term.source}</span>
                      <span aria-hidden className="text-mint">→</span>
                      <span className="min-w-0 flex-1 truncate font-medium" title={term.target}>{term.target}</span>
                      {term.uncertain ? (
                        <Pill tone="warning">bizonytalan</Pill>
                      ) : term.fromGlossary ? (
                        <Pill tone="ok" icon={BookMarked}>szótár</Pill>
                      ) : null}
                      <PencilLine size={14} aria-hidden className="shrink-0 text-white/35" />
                    </button>
                  </li>
                ),
              )}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

function TermEditor({
  editing,
  setEditing,
  remember,
  setRemember,
  pending,
  onApply,
  term,
  isNew = false,
  ...rest
}: {
  editing: Editing;
  setEditing: (value: Editing | null) => void;
  remember: boolean;
  setRemember: (value: boolean) => void;
  pending: boolean;
  onApply: (value: string) => void;
  term?: TranslationTerm;
  isNew?: boolean;
  "data-term"?: string;
}) {
  const options = [...new Set([...(term?.alternatives ?? [])].filter((item) => item && item !== term?.target))];
  return (
    <div {...rest} className="mb-3 space-y-3 rounded-2xl border border-mint/30 bg-mint/5 p-4">
      {isNew ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-xs text-white/60">
            <span>Eredeti kifejezés (forrásnyelven)</span>
            <Input autoFocus value={editing.source} onChange={(event) => setEditing({ ...editing, source: event.target.value })} placeholder="pl. internal control" />
          </label>
          <label className="space-y-1 text-xs text-white/60">
            <span>Jelenlegi alak a fordításban (ezt cseréljük)</span>
            <Input value={editing.current} onChange={(event) => setEditing({ ...editing, current: event.target.value })} placeholder="pl. belső kontroll" />
          </label>
        </div>
      ) : (
        <div className="space-y-1">
          <p className="text-sm">
            <span className="text-white/55">{term?.source}</span> <span className="text-mint">→</span> <strong>{term?.target}</strong>
          </p>
          {term?.note && <p className="text-xs text-amber-200/80">{term.note}</p>}
        </div>
      )}

      {options.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-white/50">Javasolt alternatívák – kattints a cseréhez:</p>
          <div className="flex flex-wrap gap-2">
            {options.map((option) => (
              <button key={option} type="button" disabled={pending} onClick={() => onApply(option)} className={buttonClass("secondary", "sm")}>
                {option}
              </button>
            ))}
          </div>
        </div>
      )}

      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          onApply(editing.value);
        }}
      >
        <Input
          autoFocus={!isNew}
          value={editing.value}
          onChange={(event) => setEditing({ ...editing, value: event.target.value })}
          placeholder="Saját fordítás…"
          aria-label="Helyes fordítás"
        />
        <div className="flex gap-2">
          <button type="submit" disabled={pending} className={buttonClass("primary")}>
            <Check size={16} aria-hidden /> Alkalmaz
          </button>
          <button type="button" onClick={() => setEditing(null)} className={buttonClass("ghost")} aria-label="Mégse">
            <X size={16} aria-hidden />
          </button>
        </div>
      </form>

      <label className="flex items-center gap-2 text-xs text-white/65">
        <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} className="size-4 accent-emerald-400" />
        Mentés a szótárba – a jövőbeli fordításokban automatikusan ezt használja
      </label>
    </div>
  );
}
