"use server";

import { Binary, ObjectId } from "mongodb";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { AiError, aiAvailable, aiTranscribe } from "@/lib/ai";
import { MAX_FILE_BYTES } from "@/lib/files";
import type { FormState } from "@/lib/form";
import { MAX_LIBRARY_TEXT, extractLibraryText, library, libraryBlobs, libraryType, looksScanned, type LibraryDoc } from "@/lib/library";
import { requireUser } from "@/lib/session";

const snippetOf = (text: string) => text.replace(/\s+/g, " ").trim().slice(0, 240);

/** Szkennelt irat vagy kép szövegének felismerése AI-val; hibánál üres szöveg és magyarázat. */
async function recognize(buffer: Buffer, contentType: string, name: string) {
  if (!aiAvailable()) return { text: "", notice: "Szkennelt irat: a szövegfelismeréshez AI-kulcs kell a szerveren." };
  try {
    return { text: await aiTranscribe({ data: buffer, mimeType: contentType, fileName: name }) };
  } catch (error) {
    return { text: "", notice: `A szövegfelismerés most nem sikerült (${error instanceof AiError ? error.message : "ismeretlen hiba"}); a dokumentum oldalán újrafuttatható.` };
  }
}

export async function uploadLibraryFiles(_previous: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const files = formData.getAll("files").filter((item): item is File => item instanceof File && item.size > 0);
  if (files.length === 0) return { error: "Válaszd ki a feltöltendő dokumentumokat." };
  if (files.length > 10) return { error: "Egyszerre legfeljebb 10 dokumentum tölthető fel." };
  if (files.reduce((sum, file) => sum + file.size, 0) > MAX_FILE_BYTES) return { error: "A feltöltés összmérete legfeljebb 4 MB lehet." };

  const problems: string[] = [];
  const saved: string[] = [];
  for (const file of files) {
    const name = file.name.slice(0, 160);
    const type = libraryType(name);
    if (!type) {
      problems.push(`${name}: nem támogatott típus (PDF, Word, TXT vagy kép tölthető fel)`);
      continue;
    }
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const extracted = await extractLibraryText(buffer, name, type.kind);
      const scanned = (type.kind === "pdf" || type.kind === "image") && looksScanned(extracted.text, extracted.pages);
      const ocr = scanned ? await recognize(buffer, type.contentType, name) : undefined;
      const text = (ocr?.text || extracted.text).slice(0, MAX_LIBRARY_TEXT);
      const _id = new ObjectId();
      const doc: LibraryDoc = {
        _id,
        name,
        kind: type.kind,
        contentType: type.contentType,
        size: file.size,
        text,
        snippet: snippetOf(text),
        ...(extracted.pages && { pages: extracted.pages }),
        ...(ocr?.text && { ocr: true }),
        ...(ocr?.notice && { notice: ocr.notice }),
        uploadedAt: new Date(),
        uploadedBy: user.name,
      };
      // Előbb az eredeti, hogy a listában ne legyen „árva” tétel.
      await (await libraryBlobs()).insertOne({ _id, data: new Binary(buffer), contentType: type.contentType });
      await (await library()).insertOne(doc);
      saved.push(String(_id));
    } catch (error) {
      console.error("Dokumentum feldolgozási hiba:", (error as Error).name);
      problems.push(`${name}: nem olvasható (sérült vagy jelszóval védett?)`);
    }
  }

  refresh();
  if (!saved.length) return { error: problems.join(" · ") };
  return {
    ok: true,
    id: saved.length === 1 ? saved[0] : undefined,
    message: `${saved.length} dokumentum feltöltve.${problems.length ? ` Nem sikerült: ${problems.join(" · ")}` : ""}`,
  };
}

export async function deleteLibraryFile(id: string) {
  await requireUser();
  if (!ObjectId.isValid(id)) return;
  const _id = new ObjectId(id);
  const result = await (await library()).deleteOne({ _id });
  if (result.deletedCount) await (await libraryBlobs()).deleteOne({ _id });
  refresh();
  redirect("/dokumentumok");
}

/** Szövegfelismerés utólagos (újra)futtatása szkennelt PDF-en vagy képen. */
export async function recognizeLibraryFile(id: string): Promise<FormState> {
  await requireUser();
  if (!ObjectId.isValid(id)) return { error: "Ismeretlen dokumentum." };
  if (!aiAvailable()) return { error: "A szövegfelismeréshez AI-kulcs kell a szerveren." };
  const _id = new ObjectId(id);
  const [doc, blob] = await Promise.all([(await library()).findOne({ _id }, { projection: { name: 1, kind: 1 } }), (await libraryBlobs()).findOne({ _id })]);
  if (!doc || !blob) return { error: "A dokumentum nem található." };
  if (doc.kind !== "pdf" && doc.kind !== "image") return { error: "Szövegfelismerés csak PDF-en és képen futtatható." };
  const result = await recognize(Buffer.from(blob.data.buffer), blob.contentType, doc.name);
  if (!result.text) return { error: result.notice ?? "A dokumentumban nem található szöveg." };
  const text = result.text.slice(0, MAX_LIBRARY_TEXT);
  await (await library()).updateOne({ _id }, { $set: { text, snippet: snippetOf(text), ocr: true }, $unset: { notice: "" } });
  refresh();
  return { ok: true, message: "A szöveg felismerve." };
}
