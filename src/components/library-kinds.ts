import { FileImage, FileText, FileType2, type LucideIcon } from "lucide-react";
import type { LibraryKind } from "@/lib/library";

/** A dokumentumtípusok címkéje, ikonja és színe. */
export const KIND_LABEL: Record<LibraryKind, { label: string; icon: LucideIcon; tone: string }> = {
  pdf: { label: "PDF", icon: FileType2, tone: "bg-red-400/12 text-red-200 ring-red-300/25" },
  docx: { label: "Word", icon: FileText, tone: "bg-sky-400/12 text-sky-200 ring-sky-300/25" },
  doc: { label: "Word (.doc)", icon: FileText, tone: "bg-sky-400/12 text-sky-200 ring-sky-300/25" },
  txt: { label: "Szöveg", icon: FileText, tone: "bg-white/8 text-white/70 ring-white/15" },
  image: { label: "Kép", icon: FileImage, tone: "bg-violet/20 text-violet-bright ring-violet-bright/25" },
};
