"use client";

import { useActionState } from "react";
import { LoaderCircle, Plus, Save } from "lucide-react";
import { Feedback, Input, Label, Select, Textarea, buttonClass } from "@/components/ui";
import { createFinding, updateFinding } from "@/lib/actions/findings";
import { SEVERITIES, STATUSES, type AuditOption, type FindingRow } from "@/lib/findings-meta";
import type { FormState } from "@/lib/form";

export function FindingForm({ finding, audits }: { finding?: FindingRow; audits: AuditOption[] }) {
  const edit = Boolean(finding);
  const [state, action, pending] = useActionState<FormState, FormData>(edit ? updateFinding : createFinding, {});

  return (
    <form action={action} className="space-y-4">
      {finding && <input type="hidden" name="id" value={finding.id} />}
      <Label label="Cím">
        <Input name="title" required maxLength={160} defaultValue={finding?.title} placeholder="Pl. Hiányzó aláírás a leltárívon" />
      </Label>
      <Label label="Leírás">
        <Textarea name="description" required rows={4} maxLength={5000} defaultValue={finding?.description} />
      </Label>
      <Label label="Bizonyíték" hint="Idézet, hivatkozás vagy a lelet helye. Nem kötelező.">
        <Textarea name="evidence" rows={2} maxLength={3000} defaultValue={finding?.evidence} className="min-h-16" />
      </Label>
      <div className="grid gap-3 sm:grid-cols-2">
        <Label label="Súlyosság">
          <Select name="severity" defaultValue={finding?.severity ?? "kozepes"}>
            {Object.entries(SEVERITIES).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Label>
        {edit ? (
          <Label label="Állapot">
            <Select name="status" defaultValue={finding?.status}>
              {Object.entries(STATUSES).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Label>
        ) : (
          <Label label="Terület">
            <Input name="area" maxLength={80} placeholder="Nem kötelező" />
          </Label>
        )}
        {edit && (
          <Label label="Terület">
            <Input name="area" maxLength={80} defaultValue={finding?.area} placeholder="Nem kötelező" />
          </Label>
        )}
        <Label label="Felelős">
          <Input name="owner" maxLength={80} defaultValue={finding?.owner} placeholder="Nem kötelező" />
        </Label>
        <Label label="Határidő">
          <Input name="dueDate" type="date" defaultValue={finding?.dueDate} />
        </Label>
        <Label label="Ellenőrzés" className="sm:col-span-2">
          <Select name="auditId" defaultValue={finding?.auditId ?? ""}>
            <option value="">– nincs hozzárendelve –</option>
            {audits.map((audit) => (
              <option key={audit.id} value={audit.id}>
                {audit.name}
              </option>
            ))}
          </Select>
        </Label>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Feedback error={state.error} message={state.ok ? state.message : undefined} />
        <button type="submit" disabled={pending} className={buttonClass("primary")}>
          {pending ? <LoaderCircle size={17} aria-hidden className="animate-spin" /> : edit ? <Save size={17} aria-hidden /> : <Plus size={17} aria-hidden />}
          {edit ? "Mentés" : "Megállapítás felvétele"}
        </button>
      </div>
    </form>
  );
}
