"use server";

import { ObjectId } from "mongodb";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import {
  analyzeTable,
  analyzeText,
  auditFiles,
  audits,
  MAX_STORED_TEXT,
  sortIssues,
  tableText,
  type AuditFileDoc,
} from "@/lib/audits";
import { extractDocumentText, isTableFile, isTextFile, MAX_FILE_BYTES, parseTable } from "@/lib/files";
import { DAY, longText, text, type FormState } from "@/lib/form";
import { requireUser } from "@/lib/session";

export async function createAudit(_previous: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const name = text(formData, "name", 140);
  const area = text(formData, "area", 120);
  const periodFrom = text(formData, "periodFrom", 10);
  const periodTo = text(formData, "periodTo", 10);
  const lead = text(formData, "lead", 100);
  const notes = longText(formData, "notes", 4000);

  if (name.length < 3) return { error: "Adj nevet az ellenőrzésnek (legalább 3 karakter)." };
  if (periodFrom && !DAY.test(periodFrom)) return { error: "Érvénytelen kezdő dátum." };
  if (periodTo && !DAY.test(periodTo)) return { error: "Érvénytelen záró dátum." };
  if (periodFrom && periodTo && periodFrom > periodTo) return { error: "A záró dátum nem lehet a kezdő előtt." };

  const id = new ObjectId();
  await (await audits()).insertOne({
    _id: id,
    name,
    ...(area && { area }),
    ...(periodFrom && { periodFrom }),
    ...(periodTo && { periodTo }),
    ...(lead && { lead }),
    ...(notes && { notes }),
    createdAt: new Date(),
    createdBy: user.name,
  });
  refresh();
  redirect(`/ellenori-adatok/${id}`);
}

export async function deleteAudit(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!ObjectId.isValid(id)) return;
  const auditId = new ObjectId(id);
  await (await auditFiles()).deleteMany({ auditId });
  await (await audits()).deleteOne({ _id: auditId });
  refresh();
  redirect("/ellenori-adatok");
}

export async function uploadAuditFiles(_previous: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const auditId = String(formData.get("auditId") ?? "");
  if (!ObjectId.isValid(auditId)) return { error: "Ismeretlen ellenőrzés." };
  if (!(await (await audits()).findOne({ _id: new ObjectId(auditId) }, { projection: { _id: 1 } }))) {
    return { error: "Az ellenőrzés nem található." };
  }

  const files = formData.getAll("files").filter((item): item is File => item instanceof File && item.size > 0);
  if (files.length === 0) return { error: "Válaszd ki a feltöltendő fájlokat." };
  if (files.length > 8) return { error: "Egyszerre legfeljebb 8 fájl tölthető fel." };
  if (files.some((file) => file.size > MAX_FILE_BYTES) || files.reduce((sum, file) => sum + file.size, 0) > MAX_FILE_BYTES) {
    return { error: "A feltöltés összmérete legfeljebb 4 MB lehet." };
  }

  const collection = await auditFiles();
  const problems: string[] = [];
  let saved = 0;

  for (const file of files) {
    const name = file.name.slice(0, 160);
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      let doc: Omit<AuditFileDoc, "_id">;
      const base = { auditId: new ObjectId(auditId), name, size: file.size, uploadedAt: new Date(), uploadedBy: user.name };

      if (isTableFile(name)) {
        try {
          const table = await parseTable(buffer, name);
          doc = { ...base, kind: "table", text: tableText(table.headers, table.rows), issues: analyzeTable(table.headers, table.rows, table.truncated) };
        } catch (error) {
          const message = error instanceof Error ? error.message : "";
          if (!message.startsWith("A táblázatban")) throw error;
          // A hiányos táblázat is bekerül a nyilvántartásba, a hibával együtt.
          doc = { ...base, kind: "table", text: "", issues: [{ level: "error", message }] };
        }
      } else if (isTextFile(name)) {
        const extracted = await extractDocumentText(buffer, name);
        doc = {
          ...base,
          kind: "text",
          text: extracted.text.slice(0, MAX_STORED_TEXT),
          issues: sortIssues(analyzeText(extracted.text, name, extracted.pages)),
        };
      } else {
        problems.push(`${name}: nem támogatott fájltípus`);
        continue;
      }
      await collection.insertOne({ _id: new ObjectId(), ...doc });
      saved += 1;
    } catch (error) {
      console.error("Ellenőri fájl feldolgozási hiba:", (error as Error).name);
      problems.push(`${name}: nem dolgozható fel (sérült vagy jelszóval védett?)`);
    }
  }

  refresh();
  if (saved === 0) return { error: problems.join(" · ") };
  return {
    ok: true,
    message: `${saved} fájl feltöltve és ellenőrizve.${problems.length ? ` Nem sikerült: ${problems.join(" · ")}` : ""}`,
  };
}

export async function deleteAuditFile(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!ObjectId.isValid(id)) return;
  await (await auditFiles()).deleteOne({ _id: new ObjectId(id) });
  refresh();
}
