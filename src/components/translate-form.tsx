"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, KeyRound, Languages, LoaderCircle, UploadCloud } from "lucide-react";
import { Feedback, Label, Select, Textarea, buttonClass } from "@/components/ui";
import { translateDocument } from "@/lib/actions/translate";
import type { FormState } from "@/lib/form";
import { LANGUAGES, TONES } from "@/lib/translations-meta";

export function TranslateForm({ aiOn }: { aiOn: boolean }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<FormState, FormData>(translateDocument, {});
  const [fileName, setFileName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.ok && state.id) router.push(`/forditas/${state.id}`);
  }, [state, router]);

  return (
    <form action={action} className="space-y-4">
      {!aiOn && (
        <div className="flex gap-3 rounded-2xl border border-amber-300/25 bg-amber-300/8 p-4 text-sm text-amber-100">
          <KeyRound size={18} aria-hidden className="mt-0.5 shrink-0 text-amber-300" />
          <p>
            A fordítás AI-t használ, de a szerveren nincs beállítva a <strong>GEMINI_API_KEY</strong>. Add meg a kulcsot a
            környezeti változók között, és utána a küldés működni fog.
          </p>
        </div>
      )}
      <Label label="Fordítandó szöveg" hint="Másold be a szöveget, vagy tölts fel dokumentumot lent. Legfeljebb 30 000 karakter.">
        <Textarea name="source" rows={9} placeholder="Ide írhatod vagy másolhatod a szöveget…" />
      </Label>

      <label
        className={`flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed px-4 py-4 transition ${
          fileName ? "border-mint/40 bg-mint/5" : "border-white/15 hover:border-white/30"
        }`}
      >
        <UploadCloud size={22} aria-hidden className="shrink-0 text-mint" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{fileName || "Dokumentum feltöltése (PDF, Word, TXT)"}</span>
          <span className="block text-xs text-white/45">Ha fájlt választasz, az felülírja a beírt szöveget. Legfeljebb 4 MB.</span>
        </span>
        <input
          ref={inputRef}
          name="file"
          type="file"
          accept=".pdf,.docx,.txt"
          className="sr-only"
          onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")}
        />
        {fileName && (
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              if (inputRef.current) inputRef.current.value = "";
              setFileName("");
            }}
            className="text-xs text-white/50 underline hover:text-white"
          >
            Eltávolítás
          </button>
        )}
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <Label label="Célnyelv" hint="A forrásnyelvet az AI felismeri.">
          <Select name="target" defaultValue="hu">
            {Object.entries(LANGUAGES).map(([code, name]) => (
              <option key={code} value={code}>
                {name[0].toUpperCase() + name.slice(1)}
              </option>
            ))}
          </Select>
        </Label>
        <Label label="Hangnem">
          <Select name="tone" defaultValue="hivatalos">
            {Object.entries(TONES).map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </Select>
        </Label>
      </div>

      <p className="text-xs text-white/45">A szöveg a fordításhoz az AI-szolgáltatóhoz (Google Gemini) kerül feldolgozásra.</p>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Feedback error={state.error} />
        <button type="submit" disabled={pending || !aiOn} className={buttonClass("primary")}>
          {pending ? <LoaderCircle size={17} aria-hidden className="animate-spin" /> : fileName ? <FileUp size={17} aria-hidden /> : <Languages size={17} aria-hidden />}
          {pending ? "Fordítás…" : "Fordítás"}
        </button>
      </div>
    </form>
  );
}
