import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import type { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getSession } from "@/lib/session";
import { findUserById } from "@/lib/users";

/**
 * Tevékenységnapló (audit trail): ki, mikor, honnan, mit csinált az adatokkal, és mikor ment ki szöveg külső
 * szolgáltatóhoz. Csak hozzáfűzés történik – az alkalmazás egyetlen bejegyzést sem módosít és nem töröl.
 */
export const ACTIVITY = {
  "doc.upload": "Dokumentum feltöltése",
  "doc.download": "Dokumentum letöltése",
  "doc.delete": "Dokumentum törlése",
  "doc.ocr": "Szövegfelismerés",
  "doc.merge": "PDF-összefűzés (export)",
  "audit.create": "Ellenőrzés létrehozása",
  "audit.delete": "Ellenőrzés törlése",
  "auditfile.upload": "Ellenőri fájl feltöltése",
  "auditfile.download": "Ellenőri fájl letöltése",
  "auditfile.delete": "Ellenőri fájl törlése",
  "ai.task": "AI-feladat dokumentumon",
  "ai.summary": "Közös AI-összefoglaló",
  "translation.create": "Fordítás",
  "translation.edit": "Fordítás szerkesztése",
  "translation.delete": "Fordítás törlése",
  "glossary.save": "Szótárbejegyzés mentése",
  "glossary.delete": "Szótárbejegyzés törlése",
  "editor.create": "Szerkesztett dokumentum létrehozása",
  "editor.delete": "Szerkesztett dokumentum törlése",
  "editor.export": "Szerkesztett dokumentum exportja",
  "external.send": "Adatküldés külső szolgáltatónak",
} as const;
export type ActivityEvent = keyof typeof ACTIVITY;

export type ActivityEntry = {
  event: ActivityEvent;
  userId?: ObjectId;
  email: string;
  name: string;
  /** Az érintett adat (pl. dokumentum) – azonosító és név. */
  target?: { type: string; id?: string; name?: string };
  /** Kiegészítő adatok (pl. szolgáltató, karakterszám, nyelv). Dokumentumtartalom soha nem kerül ide. */
  detail?: Record<string, string | number>;
  ip: string;
  userAgent: string;
  at: Date;
};

export const activityLog = async () => (await getDb()).collection<ActivityEntry>("activity_log");

const actor = cache(async () => {
  const session = await getSession().catch(() => null);
  if (!session || session.stage !== "full") return null;
  const user = await findUserById(session.userId).catch(() => null);
  return user ? { userId: user._id, email: user.email, name: user.name } : null;
});

/** Bejegyzés a naplóba. Hiba esetén sem akasztja meg a műveletet. Bejelentkezés nélkül (időzített feladat) „rendszer”. */
export async function recordActivity(event: ActivityEvent, extra: { target?: ActivityEntry["target"]; detail?: ActivityEntry["detail"] } = {}) {
  try {
    const [who, requestHeaders] = await Promise.all([actor(), headers().catch(() => null)]);
    await (await activityLog()).insertOne({
      event,
      ...(who ?? { email: "rendszer", name: "Rendszer (időzített feladat)" }),
      ...(extra.target && { target: { ...extra.target, name: extra.target.name?.slice(0, 200) } }),
      ...(extra.detail && { detail: extra.detail }),
      ip: requestHeaders?.get("x-forwarded-for")?.split(",")[0].trim().slice(0, 64) ?? "–",
      userAgent: (requestHeaders?.get("user-agent") ?? "").slice(0, 200),
      at: new Date(),
    });
  } catch (error) {
    console.error("Tevékenységnapló-hiba:", (error as Error).name);
  }
}

/** Külső szolgáltatóhoz küldött adat naplózása: melyik szolgáltató, milyen célra, mennyi szöveg. */
export const recordExternalSend = (provider: string, purpose: string, chars: number) =>
  recordActivity("external.send", { detail: { szolgáltató: provider, cél: purpose, karakter: chars } });

export async function listActivity(userId: ObjectId, { event, limit = 500 }: { event?: string; limit?: number } = {}) {
  return (await activityLog())
    .find({ userId, ...(event && Object.hasOwn(ACTIVITY, event) ? { event: event as ActivityEvent } : {}) })
    .sort({ at: -1 })
    .limit(limit)
    .toArray();
}
