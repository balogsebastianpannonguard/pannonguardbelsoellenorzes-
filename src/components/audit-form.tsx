"use client";

import { useActionState } from "react";
import { LoaderCircle, Plus } from "lucide-react";
import { Feedback, Input, Label, Textarea, buttonClass } from "@/components/ui";
import { createAudit } from "@/lib/actions/audits";
import type { FormState } from "@/lib/form";
import { useKeepForm } from "@/components/use-keep-form";

export function AuditForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createAudit, {});
  const { ref: keepRef, onSubmit: keepSubmit } = useKeepForm(action, state, { resetOnOk: true });
  return (
    <form ref={keepRef} onSubmit={keepSubmit} className="space-y-4">
      <Label label="Az ellenőrzés neve">
        <Input name="name" required minLength={3} maxLength={140} placeholder="Pl. 2026. évi beszerzési ellenőrzés" />
      </Label>
      <div className="grid gap-4 sm:grid-cols-2">
        <Label label="Terület" hint="Nem kötelező">
          <Input name="area" maxLength={120} placeholder="Pl. Beszerzés" />
        </Label>
        <Label label="Felelős ellenőr" hint="Nem kötelező">
          <Input name="lead" maxLength={100} />
        </Label>
        <Label label="Vizsgált időszak kezdete">
          <Input name="periodFrom" type="date" />
        </Label>
        <Label label="Vizsgált időszak vége">
          <Input name="periodTo" type="date" />
        </Label>
      </div>
      <Label label="Megjegyzés" hint="Nem kötelező">
        <Textarea name="notes" maxLength={4000} className="min-h-20" />
      </Label>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Feedback error={state.error} message={state.ok ? state.message : undefined} />
        <button type="submit" disabled={pending} className={buttonClass("primary")}>
          {pending ? <LoaderCircle size={17} aria-hidden className="animate-spin" /> : <Plus size={17} aria-hidden />}
          Ellenőrzés létrehozása
        </button>
      </div>
    </form>
  );
}
