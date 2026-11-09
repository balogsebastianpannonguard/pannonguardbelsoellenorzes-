"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Trash2, X } from "lucide-react";
import { buttonClass } from "@/components/ui";
import { deleteFinding, setFindingStatus } from "@/lib/actions/findings";

/** Javasolt megállapítás elfogadása vagy elvetése. */
export function ProposalButtons({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  const run = (status: string) =>
    start(async () => {
      const result = await setFindingStatus(id, status);
      setError(result.error);
    });
  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <div className="flex gap-2">
        <button type="button" disabled={pending} onClick={() => run("nyitott")} className={buttonClass("primary", "sm")}>
          <Check size={15} aria-hidden /> Elfogadás
        </button>
        <button type="button" disabled={pending} onClick={() => run("elvetett")} className={buttonClass("secondary", "sm")}>
          <X size={15} aria-hidden /> Elvetés
        </button>
      </div>
      {error && <p role="alert" className="text-xs text-red-300">{error}</p>}
    </div>
  );
}

export function QuickStatus({ id, status }: { id: string; status: string }) {
  const [pending, start] = useTransition();
  const next = status === "nyitott" ? { to: "folyamatban", label: "Folyamatba" } : status === "folyamatban" ? { to: "lezart", label: "Lezárás" } : { to: "nyitott", label: "Újranyitás" };
  return (
    <button type="button" disabled={pending} onClick={() => start(async () => void (await setFindingStatus(id, next.to)))} className={buttonClass("secondary", "sm")}>
      {next.label}
    </button>
  );
}

export function DeleteFindingButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className={buttonClass("danger", "sm")}
      onClick={() => {
        if (!confirm("Biztosan törlöd a megállapítást és a hozzá tartozó javaslatokat?")) return;
        start(async () => {
          await deleteFinding(id);
          router.push("/hianyossagok");
        });
      }}
    >
      <Trash2 size={15} aria-hidden /> Törlés
    </button>
  );
}
