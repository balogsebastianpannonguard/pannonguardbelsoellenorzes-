import "server-only";
import type { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { ownCollection } from "@/lib/owner";

/** A PannonGuard szerkesztő dokumentumai (AI-elemzések, összefoglalók, átszerkesztett iratok). */
export type EditorDoc = {
  _id: ObjectId;
  title: string;
  /** Szűrt HTML (lib/rich-text). */
  html: string;
  /** Miből készült (ha dokumentumból). */
  source?: { type: SourceType; id: string; name: string };
  /** Milyen AI-feladat eredménye (pl. „Elemzés”). */
  task?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
};

export type SourceType = "library" | "audit";

export const editorDocs = async () => ownCollection((await getDb()).collection<EditorDoc>("editor_documents"));
