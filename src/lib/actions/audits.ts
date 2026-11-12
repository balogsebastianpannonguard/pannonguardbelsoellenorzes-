"use server";

import { ObjectId } from "mongodb";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { Binary } from "mongodb";
import { AiError, aiAvailable, aiTranscribe } from "@/lib/ai";
import {
  analyzeTable,
  analyzeText,
  auditFileBlobs,
  auditFiles,
  audits,
  contentTypeOf,
  isImageFile,
  MAX_STORED_TEXT,
  needsOcr,
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
  const fileIds = (await (await auditFiles()).find({ auditId }, { projection: { _id: 1 } }).toArray()).map((file) => file._id);
  if (fileIds.length) await (await auditFileBlobs()).deleteMany({ _id: { $in: fileIds } });
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
      const contentType = contentTypeOf(name);
      const base = { auditId: new ObjectId(auditId), name, size: file.size, uploadedAt: new Date(), uploadedBy: user.name, stored: true, contentType };

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
      } else if (isTextFile(name) || isImageFile(name)) {
        const extracted = isImageFile(name) ? { text: "", pages: undefined } : await extractDocumentText(buffer, name);
        const scanned = (name.toLowerCase().endsWith(".pdf") || isImageFile(name)) && needsOcr(extracted.text, extracted.pages);
        const ocrText = scanned ? await recognize(buffer, contentType, name) : undefined;
        const finalText = ocrText?.text || extracted.text;
        doc = {
          ...base,
          kind: "text",
          text: finalText.slice(0, MAX_STORED_TEXT),
          ocr: Boolean(ocrText?.text),
          issues: sortIssues([...analyzeText(finalText, name, extracted.pages, Boolean(ocrText?.text)), ...(ocrText?.issue ? [ocrText.issue] : [])]),
        };
      } else {
        problems.push(`${name}: nem támogatott fájltípus`);
        continue;
      }
      const _id = new ObjectId();
      // Előbb az eredeti fájl, hogy a nyilvántartásban ne legyen „árva” tétel.
      await (await auditFileBlobs()).insertOne({ _id, data: new Binary(buffer), contentType });
      await collection.insertOne({ _id, ...doc });
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
  const result = await (await auditFiles()).deleteOne({ _id: new ObjectId(id) });
  if (result.deletedCount) await (await auditFileBlobs()).deleteOne({ _id: new ObjectId(id) });
  refresh();
}

/** Szkennelt PDF vagy kép szövegének felismerése; a hibát tájékoztató tételként adja vissza, nem dob. */
async function recognize(buffer: Buffer, contentType: string, name: string) {
  if (!aiAvailable()) {
    return { text: "", issue: { level: "warning" as const, message: "A szövegfelismeréshez (OCR) AI-kulcs kell (GEMINI_API_KEY); beállítás után a fájl oldalán újrafuttatható." } };
  }
  try {
    return { text: await aiTranscribe({ data: buffer, mimeType: contentType, fileName: name }) };
  } catch (error) {
    const reason = error instanceof AiError ? error.message : "ismeretlen hiba";
    return { text: "", issue: { level: "warning" as const, message: `A szövegfelismerés most nem sikerült (${reason}); a fájl oldalán újrafuttatható.` } };
  }
}

/** Szövegfelismerés (OCR) utólagos futtatása egy már feltöltött, szkennelt fájlon. */
export async function recognizeAuditFile(id: string): Promise<FormState> {
  await requireUser();
  if (!ObjectId.isValid(id)) return { error: "Ismeretlen fájl." };
  if (!aiAvailable()) return { error: "A szövegfelismeréshez AI-kulcs kell (GEMINI_API_KEY)." };
  const _id = new ObjectId(id);
  const [file, blob] = await Promise.all([(await auditFiles()).findOne({ _id }, { projection: { name: 1 } }), (await auditFileBlobs()).findOne({ _id })]);
  if (!file) return { error: "A fájl nem található." };
  if (!blob) return { error: "Az eredeti fájl nincs meg (a tárolás bevezetése előtt töltötték fel). Töltsd fel újra." };
  const result = await recognize(Buffer.from(blob.data.buffer), blob.contentType, file.name);
  if (!result.text) return { error: result.issue?.message ?? "A fájlban nem található szöveg." };
  await (await auditFiles()).updateOne(
    { _id },
    { $set: { text: result.text.slice(0, MAX_STORED_TEXT), ocr: true, issues: sortIssues(analyzeText(result.text, file.name, undefined, true)) } },
  );
  refresh();
  return { ok: true, message: "A szöveg felismerve, az ellenőrzés frissítve." };
}
