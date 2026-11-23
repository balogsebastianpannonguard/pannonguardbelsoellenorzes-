"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, Check, CloudUpload, Copy, FileDown, Heading1, Heading2, Heading3, Italic, List,
  ListOrdered, LoaderCircle, Pilcrow, Printer, Quote, Redo2, RemoveFormatting, Strikethrough, Trash2, Underline, Undo2, type LucideIcon,
} from "lucide-react";
import { Letterhead, LETTERHEAD_HTML } from "@/components/letterhead";
import { buttonClass } from "@/components/ui";
import { deleteEditorDoc, saveEditorDoc } from "@/lib/actions/doc-ai";

/** Eszköztár-gomb: execCommand-parancs (a „block” a formatBlock-ot jelenti), és mikor számít aktívnak. */
type Tool = { icon: LucideIcon; label: string; command: string; value?: string; active?: string };

const BLOCKS = ["p", "h1", "h2", "h3", "blockquote"];
const GROUPS: Tool[][] = [
  [
    { icon: Undo2, label: "Visszavonás", command: "undo" },
    { icon: Redo2, label: "Újra", command: "redo" },
  ],
  [
    { icon: Pilcrow, label: "Normál szöveg", command: "formatBlock", value: "<p>", active: "p" },
    { icon: Heading1, label: "Főcím", command: "formatBlock", value: "<h1>", active: "h1" },
    { icon: Heading2, label: "Alcím", command: "formatBlock", value: "<h2>", active: "h2" },
    { icon: Heading3, label: "Kisebb cím", command: "formatBlock", value: "<h3>", active: "h3" },
    { icon: Quote, label: "Idézet", command: "formatBlock", value: "<blockquote>", active: "blockquote" },
  ],
  [
    { icon: Bold, label: "Félkövér (Ctrl+B)", command: "bold", active: "bold" },
    { icon: Italic, label: "Dőlt (Ctrl+I)", command: "italic", active: "italic" },
    { icon: Underline, label: "Aláhúzott (Ctrl+U)", command: "underline", active: "underline" },
    { icon: Strikethrough, label: "Áthúzott", command: "strikeThrough", active: "strikeThrough" },
    { icon: RemoveFormatting, label: "Formázás törlése", command: "removeFormat" },
  ],
  [
    { icon: List, label: "Felsorolás", command: "insertUnorderedList", active: "insertUnorderedList" },
    { icon: ListOrdered, label: "Számozott lista", command: "insertOrderedList", active: "insertOrderedList" },
  ],
  [
    { icon: AlignLeft, label: "Balra zárt", command: "justifyLeft" },
    { icon: AlignCenter, label: "Középre zárt", command: "justifyCenter" },
    { icon: AlignRight, label: "Jobbra zárt", command: "justifyRight" },
    { icon: AlignJustify, label: "Sorkizárt", command: "justifyFull" },
  ],
];

const exec = (command: string, value?: string) => document.execCommand(command, false, value);

/** A PannonGuard hivatalos szerkesztője: A4-es lap a cég fejlécével, formázás, automatikus mentés, nyomtatás/PDF, Word. */
export function PgEditor({ id, title: initialTitle, html, updatedAt }: { id: string; title: string; html: string; updatedAt: string }) {
  const router = useRouter();
  const bodyRef = useRef<HTMLDivElement>(null);
  const [title, setTitle] = useState(initialTitle);
  const [status, setStatus] = useState<{ state: "saved" | "dirty" | "saving" | "error"; at?: string; error?: string }>({ state: "saved", at: updatedAt });
  const [formats, setFormats] = useState<Record<string, boolean | string>>({});
  const [copied, setCopied] = useState(false);
  const [deleting, startDelete] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const titleRef = useRef(title);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.innerHTML = html || "<p><br></p>";
    exec("defaultParagraphSeparator", "p");
    // Csak az első betöltéskor; utána a szerkesztő maga a forrás.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = useCallback(async () => {
    clearTimeout(timer.current);
    setStatus({ state: "saving" });
    const result = await saveEditorDoc(id, titleRef.current, bodyRef.current?.innerHTML ?? "");
    setStatus(result.error ? { state: "error", error: result.error } : { state: "saved", at: result.savedAt });
  }, [id]);

  const changed = useCallback(() => {
    setStatus((current) => (current.state === "saving" ? current : { state: "dirty" }));
    clearTimeout(timer.current);
    timer.current = setTimeout(save, 1200);
  }, [save]);

  // Elhagyáskor a függő mentés lefut; a mentetlen változásra a böngésző figyelmeztet.
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (status.state === "dirty" || status.state === "saving") event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [status.state]);

  useEffect(() => {
    const update = () => {
      if (!bodyRef.current?.contains(document.getSelection()?.anchorNode ?? null)) return;
      setFormats({
        bold: document.queryCommandState("bold"),
        italic: document.queryCommandState("italic"),
        underline: document.queryCommandState("underline"),
        strikeThrough: document.queryCommandState("strikeThrough"),
        insertUnorderedList: document.queryCommandState("insertUnorderedList"),
        insertOrderedList: document.queryCommandState("insertOrderedList"),
        block: String(document.queryCommandValue("formatBlock")).toLowerCase(),
      });
    };
    document.addEventListener("selectionchange", update);
    return () => document.removeEventListener("selectionchange", update);
  }, []);

  const apply = (command: string, value?: string) => {
    bodyRef.current?.focus();
    exec(command, value);
    changed();
  };
  const isActive = (tool: Tool) => (tool.active ? (BLOCKS.includes(tool.active) ? formats.block === tool.active : Boolean(formats[tool.active])) : false);
  const fileName = (title.trim() || "dokumentum").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").slice(0, 60) || "dokumentum";

  function downloadWord() {
    const body = bodyRef.current?.innerHTML ?? "";
    const doc = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>${title.replace(/</g, "&lt;")}</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->
<style>@page{size:21cm 29.7cm;margin:2cm}body{font-family:Georgia,'Times New Roman',serif;font-size:11pt;color:#14182b;line-height:1.5}
h1{font-family:Arial,sans-serif;font-size:18pt}h2{font-family:Arial,sans-serif;font-size:14pt}h3{font-family:Arial,sans-serif;font-size:12pt}
table{border-collapse:collapse;width:100%}td,th{border:1px solid #9aa0aa;padding:4pt 6pt;vertical-align:top}th{background:#eef0f3}blockquote{border-left:3pt solid #34d399;margin-left:0;padding-left:10pt;color:#444}</style></head>
<body>${LETTERHEAD_HTML(window.location.origin)}<h1>${title.replace(/</g, "&lt;")}</h1>${body}</body></html>`;
    const url = URL.createObjectURL(new Blob(["﻿", doc], { type: "application/msword" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${fileName}.doc`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  async function copyAll() {
    const html = `<h1>${title.replace(/</g, "&lt;")}</h1>${bodyRef.current?.innerHTML ?? ""}`;
    const text = `${title}\n\n${bodyRef.current?.innerText ?? ""}`;
    try {
      await navigator.clipboard.write([new ClipboardItem({ "text/html": new Blob([html], { type: "text/html" }), "text/plain": new Blob([text], { type: "text/plain" }) })]);
    } catch {
      await navigator.clipboard.writeText(text).catch(() => undefined);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  const statusText =
    status.state === "saving" ? "Mentés…" : status.state === "dirty" ? "Módosítva" : status.state === "error" ? status.error : status.at ? `Mentve ${new Date(status.at).toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" })}` : "Mentve";

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-20 -mx-2 space-y-2 rounded-2xl border border-white/10 bg-ink-900/90 p-2 shadow-xl backdrop-blur-xl print:hidden lg:top-2">
        <div className="flex flex-wrap items-center gap-1">
          {GROUPS.map((group, index) => (
            <div key={index} className="flex items-center gap-0.5 border-r border-white/10 pr-1 last:border-0">
              {group.map((tool) => (
                <button
                  key={tool.label}
                  type="button"
                  title={tool.label}
                  aria-label={tool.label}
                  aria-pressed={tool.active ? isActive(tool) : undefined}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => apply(tool.command, tool.value)}
                  className={`grid size-9 place-items-center rounded-lg transition ${isActive(tool) ? "bg-mint/20 text-mint" : "text-white/70 hover:bg-white/8 hover:text-white"}`}
                >
                  <tool.icon size={17} aria-hidden />
                </button>
              ))}
            </div>
          ))}
          <span className={`ml-auto flex items-center gap-1.5 px-2 text-xs ${status.state === "error" ? "text-red-300" : "text-white/50"}`} role="status">
            {status.state === "saving" ? <LoaderCircle size={13} aria-hidden className="animate-spin" /> : status.state === "saved" ? <Check size={13} aria-hidden className="text-mint" /> : null}
            {statusText}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-white/8 px-1 pt-2">
          <button type="button" onClick={save} className={buttonClass("secondary", "sm")}>
            <CloudUpload size={15} aria-hidden /> Mentés
          </button>
          <button type="button" onClick={() => window.print()} className={buttonClass("primary", "sm")}>
            <Printer size={15} aria-hidden /> Nyomtatás / PDF
          </button>
          <button type="button" onClick={downloadWord} className={buttonClass("secondary", "sm")}>
            <FileDown size={15} aria-hidden /> Word letöltése
          </button>
          <button type="button" onClick={copyAll} className={buttonClass("secondary", "sm")}>
            {copied ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />} {copied ? "Másolva" : "Másolás"}
          </button>
          <button
            type="button"
            disabled={deleting}
            onClick={() => {
              if (!confirm("Biztosan törlöd ezt a szerkesztett dokumentumot?")) return;
              startDelete(async () => {
                await deleteEditorDoc(id);
                router.push("/szerkeszto");
              });
            }}
            className={`${buttonClass("ghost", "sm")} ml-auto text-red-200/80 hover:text-red-200`}
          >
            <Trash2 size={15} aria-hidden /> Törlés
          </button>
        </div>
      </div>

      <article className="pg-editor-page mx-auto w-full max-w-[52rem] rounded-2xl bg-white px-8 py-10 text-[#14182b] shadow-[0_30px_80px_-30px_rgb(0_0_0/0.8)] sm:px-14 sm:py-14 print:max-w-none print:rounded-none print:p-0 print:shadow-none">
        <Letterhead />
        <input
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            titleRef.current = event.target.value;
            changed();
          }}
          aria-label="Cím"
          placeholder="A dokumentum címe"
          className="mt-8 w-full border-0 bg-transparent p-0 font-display text-[1.7rem] leading-tight font-bold text-[#14182b] outline-none placeholder:text-[#14182b]/30"
        />
        <div
          ref={bodyRef}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label="A dokumentum szövege"
          spellCheck
          lang="hu"
          onInput={changed}
          onBlur={() => status.state === "dirty" && save()}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
              event.preventDefault();
              save();
            }
          }}
          className="pg-editor-body mt-5 min-h-[30rem] outline-none"
        />
      </article>
    </div>
  );
}
