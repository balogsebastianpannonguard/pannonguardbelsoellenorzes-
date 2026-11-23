"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Plus } from "lucide-react";
import { buttonClass } from "@/components/ui";
import { newEditorDoc } from "@/lib/actions/doc-ai";

export function NewEditorDocButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const result = await newEditorDoc();
          if (result.id) router.push(`/szerkeszto/${result.id}`);
        })
      }
      className={buttonClass("primary")}
    >
      {pending ? <LoaderCircle size={17} aria-hidden className="animate-spin" /> : <Plus size={17} aria-hidden />} Új dokumentum
    </button>
  );
}
