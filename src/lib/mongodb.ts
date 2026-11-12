import "server-only";
import { MongoClient } from "mongodb";

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
    db.collection("documents").createIndex({ sha256: 1 }, { unique: true }),
    db.collection("documents").createIndex({ createdAt: -1 }),
    db.collection("tickets").createIndex({ number: 1 }, { unique: true }),
    db.collection("tickets").createIndex({ createdAt: -1 }),
  ]);
  return client;
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
