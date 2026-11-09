"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { CalendarClock, LoaderCircle, Plus, Save, Trash2, UserRound } from "lucide-react";
import { Feedback, Input, Label, Select, Textarea, buttonClass } from "@/components/ui";
import {
  addItem,
  createTender,
  deleteItem,
  deleteTender,
  setItemStatus,
  updateTender,
} from "@/lib/actions/tenders";
import type { FormState } from "@/lib/form";
import {
  ITEM_STATUS,
  ITEM_STATUS_KEYS,
  TENDER_STATUS,
  TENDER_STATUS_KEYS,
  daysBetween,
  type ItemStatus,
  type TenderItemView,
  type TenderView,
} from "@/lib/tenders-shared";

export function TenderForm({ tender }: { tender?: TenderView }) {
  const [state, action, pending] = useActionState<FormState, FormData>(tender ? updateTender : createTender, {});

  return (
    <form action={action} className="space-y-4">
      {tender && <input type="hidden" name="id" value={tender.id} />}
      <Label label="Pályázat neve">
        <Input name="name" required minLength={3} maxLength={160} defaultValue={tender?.name} placeholder="Pl. Digitális fejlesztési pályázat" />
      </Label>
      <Label label="Kiíró">
        <Input name="issuer" maxLength={160} defaultValue={tender?.issuer} placeholder="Nem kötelező" />
      </Label>
      <div className="grid gap-3 sm:grid-cols-2">
        <Label label="Beadási határidő">
          <Input name="deadline" type="date" required defaultValue={tender?.deadline} />
        </Label>
        <Label label="Státusz">
          <Select name="status" defaultValue={tender?.status ?? "elokeszites"}>
            {TENDER_STATUS_KEYS.map((key) => (
              <option key={key} value={key}>
                {TENDER_STATUS[key].label}
              </option>
            ))}
          </Select>
        </Label>
      </div>
      <Label label="Felelős">
        <Input name="owner" maxLength={100} defaultValue={tender?.owner} placeholder="Nem kötelező" />
      </Label>
      <Label label="Megjegyzés">
        <Textarea name="note" maxLength={2000} defaultValue={tender?.note} className="min-h-24" placeholder="Nem kötelező" />
      </Label>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Feedback error={state.error} message={state.ok ? state.message : undefined} />
        <button type="submit" disabled={pending} className={buttonClass("primary")}>
          {pending ? <LoaderCircle size={17} aria-hidden className="animate-spin" /> : tender ? <Save size={17} aria-hidden /> : <Plus size={17} aria-hidden />}
          {tender ? "Mentés" : "Pályázat felvétele"}
        </button>
      </div>
    </form>
  );
}

export function ItemForm({ tenderId }: { tenderId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<FormState, FormData>(async (previous, formData) => {
    const result = await addItem(previous, formData);
    if (result.ok) formRef.current?.reset();
    return result;
  }, {});

  return (
    <form ref={formRef} action={action} className="space-y-3 rounded-2xl border border-dashed border-white/12 p-4">
      <input type="hidden" name="tenderId" value={tenderId} />
      <p className="text-sm font-semibold">Új dokumentum</p>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_9.5rem]">
        <Input name="title" required minLength={2} maxLength={160} placeholder="Dokumentum neve" aria-label="Dokumentum neve" />
        <Input name="owner" maxLength={100} placeholder="Felelős" aria-label="Felelős" />
        <Input name="due" type="date" aria-label="Határidő" />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Feedback error={state.error} message={state.ok ? state.message : undefined} />
        <button type="submit" disabled={pending} className={buttonClass("secondary", "sm")}>
          {pending ? <LoaderCircle size={15} aria-hidden className="animate-spin" /> : <Plus size={15} aria-hidden />}
          Hozzáadás
        </button>
      </div>
    </form>
  );
}

const SELECT_TONE: Record<ItemStatus, string> = {
  hianyzik: "text-red-200",
  folyamatban: "text-amber-200",
  kesz: "text-emerald-200",
};

export function ItemRow({ tenderId, item, today }: { tenderId: string; item: TenderItemView; today: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const overdue = item.status !== "kesz" && item.due !== undefined && daysBetween(today, item.due) < 0;

  const run = (job: () => Promise<FormState>) =>
    startTransition(async () => {
      const result = await job();
      setError(result.error);
    });

  return (
    <li className={`flex flex-wrap items-center gap-3 rounded-2xl border p-3.5 ${overdue ? "border-red-400/25 bg-red-500/5" : "border-white/8 bg-white/3"} ${pending ? "opacity-60" : ""}`}>
      <div className="min-w-0 flex-1 basis-56">
        <p className={`font-medium ${item.status === "kesz" ? "text-white/55 line-through decoration-white/25" : ""}`}>{item.title}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-white/45">
          {item.owner && (
            <span className="inline-flex items-center gap-1">
              <UserRound size={12} aria-hidden /> {item.owner}
            </span>
          )}
          {item.due && (
            <span className={`inline-flex items-center gap-1 ${overdue ? "font-semibold text-red-300" : ""}`}>
              <CalendarClock size={12} aria-hidden /> {item.due}
              {overdue && " · lejárt"}
            </span>
          )}
        </p>
        {error && <p role="alert" className="mt-1 text-xs text-red-300">{error}</p>}
      </div>
      <select
        aria-label={`${item.title} állapota`}
        value={item.status}
        disabled={pending}
        onChange={(event) => run(() => setItemStatus(tenderId, item.id, event.target.value))}
        className={`pg-field pg-input h-9 rounded-lg px-2.5 text-sm font-semibold [&>option]:bg-ink-900 [&>option]:text-white ${SELECT_TONE[item.status]}`}
      >
        {ITEM_STATUS_KEYS.map((key) => (
          <option key={key} value={key}>
            {ITEM_STATUS[key].label}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={pending}
        aria-label={`${item.title} törlése`}
        title="Törlés"
        onClick={() => {
          if (window.confirm(`Biztosan törlöd: ${item.title}?`)) run(() => deleteItem(tenderId, item.id));
        }}
        className="grid size-9 place-items-center rounded-lg text-white/45 transition hover:bg-red-500/10 hover:text-red-300"
      >
        <Trash2 size={16} aria-hidden />
      </button>
    </li>
  );
}

export function DeleteTenderButton({ id, name }: { id: string; name: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (window.confirm(`Biztosan törlöd a pályázatot és minden adatát?\n\n${name}`)) {
          startTransition(async () => {
            await deleteTender(id);
          });
        }
      }}
      className={`${buttonClass("danger", "sm")} w-full`}
    >
      {pending ? <LoaderCircle size={15} aria-hidden className="animate-spin" /> : <Trash2 size={15} aria-hidden />}
      Pályázat törlése
    </button>
  );
}
