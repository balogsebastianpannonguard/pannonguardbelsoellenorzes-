import { ShieldAlert } from "lucide-react";
import { Pill } from "@/components/ui";

export function TranslateDisclaimer() {
  return (
    <div className="flex gap-3 rounded-2xl border border-violet-bright/25 bg-violet/10 p-4 text-sm text-white/75">
      <ShieldAlert size={19} aria-hidden className="mt-0.5 shrink-0 text-violet-bright" />
      <p>
        <Pill tone="info">Figyelem</Pill> A gépi fordítás tájékoztató jellegű. Hivatalos célra (hatósági, bírósági, szerződéses
        felhasználás) emberi, szükség esetén hites fordítói ellenőrzés kell.
      </p>
    </div>
  );
}
