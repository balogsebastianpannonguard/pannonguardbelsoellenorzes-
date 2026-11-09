"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, KeyRound, LoaderCircle, Plus, Save, Sparkles, Trash2, X } from "lucide-react";
import { Feedback, Input, Label, Select, Textarea, buttonClass } from "@/components/ui";
import { createRecommendation, deleteRecommendation, generateRecommendation, setRecommendationStatus, updateRecommendation } from "@/lib/actions/recommendations";
import type { FormState } from "@/lib/form";
import { PRIORITIES, REC_STATUSES, type RecommendationRow } from "@/lib/recommendations-meta";

type FindingOption = { id: string; title: string };

/** AI-vázlat egy megállapításból; a vázlat elkészülte után a szerkesztő oldalra visz. */
export function RecommendationGenerate({ findingId, findings, aiOn }: { findingId?: string; findings?: FindingOption[]; aiOn: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [selected, setSelected] = useState(findingId ?? findings?.[0]?.id ?? "");
  const [error, setError] = useState<string>();

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {findings && (
          <Select value={selected} onChange={(event) => setSelected(event.target.value)} className="h-9 min-w-0 flex-1 text-sm" aria-label="Megállapítás">
            {findings.map((finding) => (
              <option key={finding.id} value={finding.id}>
                {finding.title}
              </option>
            ))}
          </Select>
        )}
        <button
          type="button"
          disabled={pending || !aiOn || !selected}
          onClick={() =>
            start(async () => {
              setError(undefined);
              const result = await generateRecommendation(selected);
              if (result.ok && result.id) router.push(`/javaslatok/${result.id}`);
              else setError(result.error);
            })
          }
          className={buttonClass("secondary", "sm")}
        >
          {pending ? <LoaderCircle size={15} aria-hidden className="animate-spin" /> : <Sparkles size={15} aria-hidden />}
          {pending ? "Vázlat készül…" : "Javaslat készítése AI-val"}
        </button>
      </div>
      {!aiOn && (
        <p className="flex gap-1.5 text-xs text-amber-200/90">
          <KeyRound size={13} aria-hidden className="mt-0.5 shrink-0" /> Az AI-vázlathoz GEMINI_API_KEY szükséges; kézzel is írhatsz javaslatot.
        </p>
      )}
      {error && <p role="alert" className="text-xs text-red-300">{error}</p>}
    </div>
  );
}

export function RecommendationForm({ recommendation, findings }: { recommendation?: RecommendationRow; findings?: FindingOption[] }) {
  const edit = Boolean(recommendation);
  const [state, action, pending] = useActionState<FormState, FormData>(edit ? updateRecommendation : createRecommendation, {});

  return (
    <form action={action} className="space-y-4">
      {recommendation && <input type="hidden" name="id" value={recommendation.id} />}
      {!edit && (
        <Label label="Megállapítás">
          <Select name="findingId" required defaultValue="">
            <option value="" disabled>Válassz megállapítást…</option>
            {findings?.map((finding) => (
              <option key={finding.id} value={finding.id}>
                {finding.title}
              </option>
            ))}
          </Select>
        </Label>
      )}
      <Label label="Cím">
        <Input name="title" required maxLength={160} defaultValue={recommendation?.title} />
      </Label>
      <Label label="Javaslat">
        <Textarea name="text" required rows={edit ? 9 : 5} maxLength={8000} defaultValue={recommendation?.text} />
      </Label>
      <div className="grid gap-3 sm:grid-cols-2">
        <Label label="Prioritás">
          <Select name="priority" defaultValue={recommendation?.priority ?? "kozepes"}>
            {Object.entries(PRIORITIES).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Select>
        </Label>
        {edit && (
          <Label label="Állapot">
            <Select name="status" defaultValue={recommendation?.status}>
              {Object.entries(REC_STATUSES).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          </Label>
        )}
        <Label label="Felelős">
          <Input name="owner" maxLength={80} defaultValue={recommendation?.owner} placeholder="Nem kötelező" />
        </Label>
        <Label label="Határidő">
          <Input name="dueDate" type="date" defaultValue={recommendation?.dueDate} />
        </Label>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Feedback error={state.error} message={state.ok ? state.message : undefined} />
        <button type="submit" disabled={pending} className={buttonClass("primary")}>
          {pending ? <LoaderCircle size={17} aria-hidden className="animate-spin" /> : edit ? <Save size={17} aria-hidden /> : <Plus size={17} aria-hidden />}
          {edit ? "Mentés" : "Javaslat felvétele"}
        </button>
      </div>
    </form>
  );
}

export function RecommendationDecision({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const set = (next: string) => start(async () => void (await setRecommendationStatus(id, next)));

  return (
    <div className="flex flex-wrap gap-2">
      {status !== "jovahagyva" && (
        <button type="button" disabled={pending} onClick={() => set("jovahagyva")} className={buttonClass("primary", "sm")}>
          <Check size={15} aria-hidden /> Jóváhagyás
        </button>
      )}
      {status !== "elutasitva" && (
        <button type="button" disabled={pending} onClick={() => set("elutasitva")} className={buttonClass("secondary", "sm")}>
          <X size={15} aria-hidden /> Elutasítás
        </button>
      )}
      {status !== "tervezet" && (
        <button type="button" disabled={pending} onClick={() => set("tervezet")} className={buttonClass("ghost", "sm")}>
          Vissza tervezetnek
        </button>
      )}
      <button
        type="button"
        disabled={pending}
        className={buttonClass("danger", "sm")}
        onClick={() => {
          if (!confirm("Biztosan törlöd a javaslatot?")) return;
          start(async () => {
            await deleteRecommendation(id);
            router.push("/javaslatok");
          });
        }}
      >
        <Trash2 size={15} aria-hidden /> Törlés
      </button>
    </div>
  );
}

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className={buttonClass("primary")}>
      Nyomtatás
    </button>
  );
}
