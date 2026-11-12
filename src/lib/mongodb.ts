import "server-only";
import { MongoClient, type Db } from "mongodb";

// A globális tárolás megakadályozza, hogy a dev szerver minden frissítésnél új kapcsolatot nyisson.
const store = globalThis as typeof globalThis & {
  pannonBelsoMongo?: Promise<MongoClient>;
};

function isConfigured(uri?: string): uri is string {
  return Boolean(uri) && !uri?.includes("<db_");
}

async function connect(uri: string) {
  const client = await new MongoClient(uri, {
    serverSelectionTimeoutMS: 5000,
    tls: true,
  }).connect();

  const db = client.db(process.env.MONGODB_DB);
  // A korábbi, az egész gyűjteményre egyedi irat-ujjlenyomat helyett felhasználónként egyedi kell.
  await db.collection("documents").dropIndex("sha256_1").catch(() => undefined);
  await Promise.all([
    db.collection("sessions").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db.collection("sessions").createIndex({ userId: 1 }),
    db.collection("login_throttle").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db.collection("audit_log").createIndex({ userId: 1, at: -1 }),
    db.collection("users").createIndex({ email: 1 }, { unique: true }),
    db.collection("tenders").createIndex({ deadline: 1 }),
    db.collection("datasets").createIndex({ createdAt: -1 }),
    db.collection("translations").createIndex({ createdAt: -1 }),
    db.collection("audits").createIndex({ createdAt: -1 }),
    db.collection("audit_files").createIndex({ auditId: 1, uploadedAt: -1 }),
    db.collection("findings").createIndex({ status: 1, createdAt: -1 }),
    db.collection("findings").createIndex({ auditId: 1 }),
    db.collection("recommendations").createIndex({ findingId: 1 }),
    db.collection("recommendations").createIndex({ createdAt: -1 }),
    db.collection("legal_laws").createIndex({ createdAt: 1 }),
    db.collection("assistant_usage").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db.collection("documents").createIndex({ ownerId: 1, sha256: 1 }, { unique: true }),
    ...OWNED.map((name) => db.collection(name).createIndex({ ownerId: 1 })),
    db.collection("legal_notes").createIndex({ ownerId: 1, lawId: 1 }, { unique: true }),
    db.collection("documents").createIndex({ createdAt: -1 }),
    db.collection("tickets").createIndex({ number: 1 }, { unique: true }),
    db.collection("tickets").createIndex({ createdAt: -1 }),
  ]);
  await assignOwners(db).catch((error) => console.error("Tulajdonos-hozzárendelési hiba:", (error as Error).name));
  return client;
}

/** A felhasználónként elkülönített gyűjtemények (lásd `lib/owner.ts`). */
const OWNED = ["tenders", "datasets", "translations", "audits", "audit_files", "audit_file_blobs", "findings", "recommendations", "legal_laws", "documents"];

/**
 * A felhasználónkénti elkülönítés előtti adatok gazdájának beállítása a felvevő neve vagy e-mail-címe alapján;
 * az ellenőri fájl az ellenőrzéséhez, a javaslat a megállapításához igazodik, ha a név nem egyértelmű.
 * Csak az `ownerId` nélküli dokumentumokat érinti, így minden indításkor biztonságosan lefuthat.
 */
async function assignOwners(db: Db) {
  const users = await db.collection<{ name: string; email: string }>("users").find({}, { projection: { name: 1, email: 1 } }).toArray();
  const byKey = new Map<string, string>();
  const names = new Map<string, number>();
  for (const user of users) names.set(user.name, (names.get(user.name) ?? 0) + 1);
  for (const user of users) {
    if (names.get(user.name) === 1) byKey.set(user.name, String(user._id));
    byKey.set(user.email, String(user._id));
  }
  const missing = { ownerId: { $exists: false } };
  for (const name of OWNED) {
    const collection = db.collection(name);
    const orphans = await collection.find(missing, { projection: { createdBy: 1, uploadedBy: 1 } }).limit(5000).toArray();
    for (const doc of orphans) {
      const ownerId = byKey.get(String(doc.createdBy ?? doc.uploadedBy ?? ""));
      if (ownerId) await collection.updateOne({ _id: doc._id, ...missing }, { $set: { ownerId } });
    }
  }
  for (const [child, parent, key] of [
    ["audit_files", "audits", "auditId"],
    ["recommendations", "findings", "findingId"],
  ] as const) {
    const orphans = await db.collection(child).find(missing, { projection: { [key]: 1 } }).limit(5000).toArray();
    for (const doc of orphans) {
      const owner = await db.collection(parent).findOne({ _id: doc[key] }, { projection: { ownerId: 1 } });
      if (owner?.ownerId) await db.collection(child).updateOne({ _id: doc._id, ...missing }, { $set: { ownerId: owner.ownerId } });
    }
  }
}

function getClient() {
  const uri = process.env.MONGODB_URI;
  if (!isConfigured(uri)) {
    throw new Error("A MONGODB_URI nincs kitöltve.");
  }

  store.pannonBelsoMongo ??= connect(uri).catch((error) => {
    store.pannonBelsoMongo = undefined;
    throw error;
  });
  return store.pannonBelsoMongo;
}

/** Az alrendszer saját adatbázisa. */
export async function getDb() {
  return (await getClient()).db(process.env.MONGODB_DB);
}

/** Az elosztó adatbázisa, ahol a meghívók vannak. */
export async function getInvitesDb() {
  const name = process.env.INVITES_DB;
  if (!name) throw new Error("Az INVITES_DB nincs kitöltve.");
  return (await getClient()).db(name);
}
