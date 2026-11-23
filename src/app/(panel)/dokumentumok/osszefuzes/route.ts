import { ObjectId } from "mongodb";
import { recordActivity } from "@/lib/activity";
import { library, libraryBlobs } from "@/lib/library";
import { mergeDocuments } from "@/lib/pdf-merge";
import { requireUser } from "@/lib/session";

export const maxDuration = 60;

/** A kijelölt dokumentumok (`?ids=a,b,c`, ebben a sorrendben) egy PDF-be fűzve, letöltésként. */
export async function GET(request: Request) {
  await requireUser();
  const ids = (new URL(request.url).searchParams.get("ids") ?? "").split(",").filter((id) => ObjectId.isValid(id)).slice(0, 30);
  if (!ids.length) return new Response("Jelölj ki legalább egy dokumentumot.", { status: 400 });
  const objectIds = ids.map((id) => new ObjectId(id));
  const [docs, blobs] = await Promise.all([
    (await library()).find({ _id: { $in: objectIds } }, { projection: { name: 1, kind: 1, text: 1 } }).toArray(),
    (await libraryBlobs()).find({ _id: { $in: objectIds } }).toArray(),
  ]);
  const items = ids.flatMap((id) => {
    const doc = docs.find((item) => String(item._id) === id);
    const blob = blobs.find((item) => String(item._id) === id);
    return doc && blob ? [{ doc, data: Buffer.from(blob.data.buffer) }] : [];
  });
  if (!items.length) return new Response("A kijelölt dokumentumok nem találhatók.", { status: 404 });

  const pdf = await mergeDocuments(items);
  await recordActivity("doc.merge", { target: { type: "dokumentumok", name: items.map((item) => item.doc.name).join(", ") }, detail: { darab: items.length } });
  const stamp = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Budapest" });
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="pannonguard-dokumentumok-${stamp}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
