"use client";

import { useMemo, useState, useTransition } from "react";
import { FileWarning, KeyRound, LoaderCircle, ScanSearch } from "lucide-react";
import { Feedback, Label, Select, buttonClass } from "@/components/ui";
import { findingsFromIssues, scanFile } from "@/lib/actions/findings";
import type { AuditFileOption, AuditOption } from "@/lib/findings-meta";

export function FindingScan({ audits, files, aiOn }: { audits: AuditOption[]; files: AuditFileOption[]; aiOn: boolean }) {
  const withFiles = useMemo(() => audits.filter((audit) => files.some((file) => file.auditId === audit.id)), [audits, files]);
  const [auditId, setAuditId] = useState(withFiles[0]?.id ?? "");
  const options = files.filter((file) => file.auditId === auditId);
  const [fileId, setFileId] = useState(options[0]?.id ?? "");
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<"ai" | "issues">();
  const [result, setResult] = useState<{ error?: string; message?: string }>({});

  if (withFiles.length === 0) {
    return (
      <p className="text-sm text-white/55">
        Még nincs feltöltött ellenőrzési fájl. Az „Ellenőri adatok” munkaterületen tölthetsz fel dokumentumot, utána itt tárhatod fel a hiányosságokat.
      </p>
    );
  }

  const selected = options.find((file) => file.id === fileId) ?? options[0];
  const run = (kind: "ai" | "issues") =>
    start(async () => {
      setBusy(kind);
      setResult({});
      setResult(await (kind === "ai" ? scanFile(selected.id) : findingsFromIssues(selected.id)));
      setBusy(undefined);
    });

  return (
    <div className="space-y-4">
      <Label label="Ellenőrzés">
        <Select
          value={auditId}
          onChange={(event) => {
            setAuditId(event.target.value);
            setFileId(files.find((file) => file.auditId === event.target.value)?.id ?? "");
          }}
        >
          {withFiles.map((audit) => (
            <option key={audit.id} value={audit.id}>
              {audit.name}
            </option>
          ))}
        </Select>
      </Label>
      <Label label="Fájl">
        <Select value={selected?.id ?? ""} onChange={(event) => setFileId(event.target.value)}>
          {options.map((file) => (
            <option key={file.id} value={file.id}>
              {file.name}
              {file.issueCount ? ` · ${file.issueCount} formai megjegyzés` : ""}
            </option>
          ))}
        </Select>
      </Label>

      {!aiOn && (
        <p className="flex gap-2 text-xs text-amber-200/90">
          <KeyRound size={14} aria-hidden className="mt-0.5 shrink-0" /> Az AI-s feltáráshoz GEMINI_API_KEY szükséges a szerveren.
        </p>
      )}
      <div className="grid gap-2">
        <button type="button" disabled={pending || !aiOn || !selected} onClick={() => run("ai")} className={buttonClass("primary")}>
          {busy === "ai" ? <LoaderCircle size={17} aria-hidden className="animate-spin" /> : <ScanSearch size={17} aria-hidden />}
          {busy === "ai" ? "Elemzés…" : "Feltárás AI-val"}
        </button>
        <button type="button" disabled={pending || !selected} onClick={() => run("issues")} className={buttonClass("secondary")}>
          {busy === "issues" ? <LoaderCircle size={17} aria-hidden className="animate-spin" /> : <FileWarning size={17} aria-hidden />}
          Formai hibák átvétele
        </button>
      </div>
      <Feedback error={result.error} message={result.message} />
      <p className="text-xs text-white/40">Az AI-s feltáráskor a fájl szövege az AI-szolgáltatóhoz (Google Gemini) kerül. A javaslatokat ember hagyja jóvá.</p>
    </div>
  );
}
