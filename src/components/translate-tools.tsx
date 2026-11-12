"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Download, Trash2 } from "lucide-react";
import { buttonClass } from "@/components/ui";
import { deleteTranslation } from "@/lib/actions/translate";

export function TranslationTools({ id, title, translated }: { id: string; title: string; translated: string }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        className={buttonClass("secondary", "sm")}
        onClick={async () => {
          await navigator.clipboard.writeText(translated);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        }}
      >
        {copied ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />}
        {copied ? "Másolva" : "Fordítás másolása"}
      </button>
      <button
        type="button"
        className={buttonClass("secondary", "sm")}
        onClick={() => {
          const url = URL.createObjectURL(new Blob([translated], { type: "text/plain;charset=utf-8" }));
          const link = document.createElement("a");
          link.href = url;
          link.download = `${title.replace(/[^\p{L}\p{N}]+/gu, "-").slice(0, 50) || "forditas"}.txt`;
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
        className={buttonClass("danger", "sm")}
        onClick={() => {
          if (!confirm("Biztosan törlöd ezt a fordítást?")) return;
          start(async () => {
            await deleteTranslation(id);
            router.push("/forditas");
          });
        }}
      >
        <Trash2 size={15} aria-hidden /> Törlés
      </button>
    </div>
  );
}
