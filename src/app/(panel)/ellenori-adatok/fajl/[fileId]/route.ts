import { ObjectId } from "mongodb";
import { auditFileBlobs, auditFiles, previewKind } from "@/lib/audits";
import { requireUser } from "@/lib/session";

/**
 * Egy feltöltött ellenőri fájl eredetije. Csak belépve és csak a saját fájl érhető el (a gyűjtemények
 * felhasználónként szűrtek). Beágyazva (előnézet) csak PDF, kép és egyszerű szöveg jelenik meg; minden más,
 * illetve `?letoltes=1` esetén letöltésként érkezik.
 */
export async function GET(request: Request, { params }: { params: Promise<{ fileId: string }> }) {
  await requireUser();
  const { fileId } = await params;
  if (!ObjectId.isValid(fileId)) return new Response("Nem található.", { status: 404 });
  const _id = new ObjectId(fileId);
  const [file, blob] = await Promise.all([(await auditFiles()).findOne({ _id }, { projection: { name: 1 } }), (await auditFileBlobs()).findOne({ _id })]);
  if (!file || !blob) return new Response("Nem található.", { status: 404 });

  const download = new URL(request.url).searchParams.has("letoltes");
  const inline = !download && previewKind(blob.contentType) !== null;
  const asciiName = file.name.replace(/[^\x20-\x7e]+/g, "_").replace(/["\\]/g, "_");
  return new Response(new Uint8Array(blob.data.buffer), {
    headers: {
      "Content-Type": blob.contentType,
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(file.name)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
