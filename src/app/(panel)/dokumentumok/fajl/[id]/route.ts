import { ObjectId } from "mongodb";
import { library, libraryBlobs } from "@/lib/library";
import { requireUser } from "@/lib/session";

/**
 * Egy feltöltött dokumentum eredetije – csak belépve, csak a saját dokumentum. Beágyazva csak PDF, kép és sima
 * szöveg jelenik meg; minden más, illetve `?letoltes=1` esetén letöltésként érkezik.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  if (!ObjectId.isValid(id)) return new Response("Nem található.", { status: 404 });
  const _id = new ObjectId(id);
  const [doc, blob] = await Promise.all([(await library()).findOne({ _id }, { projection: { name: 1 } }), (await libraryBlobs()).findOne({ _id })]);
  if (!doc || !blob) return new Response("Nem található.", { status: 404 });

  const download = new URL(request.url).searchParams.has("letoltes");
  const viewable = blob.contentType === "application/pdf" || blob.contentType.startsWith("image/") || blob.contentType.startsWith("text/plain");
  const asciiName = doc.name.replace(/[^\x20-\x7e]+/g, "_").replace(/["\\]/g, "_");
  return new Response(new Uint8Array(blob.data.buffer), {
    headers: {
      "Content-Type": blob.contentType,
      "Content-Disposition": `${!download && viewable ? "inline" : "attachment"}; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(doc.name)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
