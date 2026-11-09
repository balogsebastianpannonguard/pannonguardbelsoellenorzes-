"use server";

import { randomUUID } from "node:crypto";
import { ObjectId } from "mongodb";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { DAY, text, type FormState } from "@/lib/form";
import { requireUser } from "@/lib/session";
import { tenders } from "@/lib/tenders";
import {
  ITEM_STATUS,
  ITEM_STATUS_KEYS,
  TENDER_STATUS,
  TENDER_STATUS_KEYS,
  type ItemStatus,
  type TenderStatus,
} from "@/lib/tenders-shared";

const LOG_LIMIT = 40;

const entry = (by: string, message: string) => ({ at: new Date(), by, text: message });
const logPush = (by: string, message: string) => ({ $each: [entry(by, message)], $slice: -LOG_LIMIT });

function readTender(formData: FormData) {
  const name = text(formData, "name", 160);
  const issuer = text(formData, "issuer", 160);
  const deadline = String(formData.get("deadline") ?? "");
  const owner = text(formData, "owner", 100);
  const status = String(formData.get("status") ?? "elokeszites") as TenderStatus;
  const note = String(formData.get("note") ?? "").replace(/\r\n/g, "\n").trim().slice(0, 2000);

  if (name.length < 3) return { error: "Adj nevet a pályázatnak (legalább 3 karakter)." } as const;
  if (!DAY.test(deadline) || Number.isNaN(Date.parse(`${deadline}T12:00:00Z`))) return { error: "Add meg a beadási határidőt." } as const;
  if (!TENDER_STATUS_KEYS.includes(status)) return { error: "Érvénytelen státusz." } as const;
  return { value: { name, issuer, deadline, owner, status, note } } as const;
}

export async function createTender(_previous: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = readTender(formData);
  if ("error" in parsed) return { error: parsed.error };

  const now = new Date();
  const _id = new ObjectId();
  await (await tenders()).insertOne({
    _id,
    ...parsed.value,
    items: [],
    log: [entry(user.name, "Pályázat felvéve")],
    createdAt: now,
    createdBy: user.name,
    updatedAt: now,
  });
  refresh();
  redirect(`/palyazatok/${_id}`);
}

export async function updateTender(_previous: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!ObjectId.isValid(id)) return { error: "Ismeretlen pályázat." };
  const parsed = readTender(formData);
  if ("error" in parsed) return { error: parsed.error };

  const collection = await tenders();
  const current = await collection.findOne({ _id: new ObjectId(id) });
  if (!current) return { error: "A pályázat nem található." };

  const changes: string[] = [];
  if (current.name !== parsed.value.name) changes.push("név");
  if (current.issuer !== parsed.value.issuer) changes.push("kiíró");
  if (current.deadline !== parsed.value.deadline) changes.push(`határidő (${current.deadline} → ${parsed.value.deadline})`);
  if (current.owner !== parsed.value.owner) changes.push("felelős");
  if (current.status !== parsed.value.status) {
    changes.push(`státusz (${TENDER_STATUS[current.status].label} → ${TENDER_STATUS[parsed.value.status].label})`);
  }
  if (current.note !== parsed.value.note) changes.push("megjegyzés");
  if (changes.length === 0) return { ok: true, message: "Nincs módosítás." };

  await collection.updateOne(
    { _id: current._id },
    { $set: { ...parsed.value, updatedAt: new Date() }, $push: { log: logPush(user.name, `Módosítva: ${changes.join(", ")}`) } },
  );
  refresh();
  return { ok: true, message: "Mentve." };
}

export async function deleteTender(id: string): Promise<FormState> {
  await requireUser();
  if (!ObjectId.isValid(id)) return { error: "Ismeretlen pályázat." };
  await (await tenders()).deleteOne({ _id: new ObjectId(id) });
  refresh();
  redirect("/palyazatok");
}

export async function addItem(_previous: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const tenderId = String(formData.get("tenderId") ?? "");
  const title = text(formData, "title", 160);
  const owner = text(formData, "owner", 100);
  const due = String(formData.get("due") ?? "");
  if (!ObjectId.isValid(tenderId)) return { error: "Ismeretlen pályázat." };
  if (title.length < 2) return { error: "Add meg a dokumentum nevét." };
  if (due && (!DAY.test(due) || Number.isNaN(Date.parse(`${due}T12:00:00Z`)))) return { error: "Érvénytelen határidő." };

  const result = await (await tenders()).updateOne(
    { _id: new ObjectId(tenderId), "items.99": { $exists: false } },
    {
      $push: {
        items: { id: randomUUID(), title, owner, ...(due && { due }), status: "hianyzik" as ItemStatus },
        log: logPush(user.name, `Dokumentum hozzáadva: ${title}`),
      },
      $set: { updatedAt: new Date() },
    },
  );
  if (result.matchedCount === 0) return { error: "A pályázat nem található, vagy elérte a 100 dokumentumos korlátot." };
  refresh();
  return { ok: true, message: "Hozzáadva." };
}

export async function setItemStatus(tenderId: string, itemId: string, status: string): Promise<FormState> {
  const user = await requireUser();
  if (!ObjectId.isValid(tenderId) || typeof itemId !== "string" || itemId.length > 64) return { error: "Ismeretlen tétel." };
  if (!ITEM_STATUS_KEYS.includes(status as ItemStatus)) return { error: "Érvénytelen állapot." };

  const collection = await tenders();
  const tender = await collection.findOne({ _id: new ObjectId(tenderId) }, { projection: { items: 1 } });
  const item = tender?.items.find((candidate) => candidate.id === itemId);
  if (!tender || !item) return { error: "A tétel nem található." };
  if (item.status === status) return { ok: true };

  await collection.updateOne(
    { _id: tender._id, "items.id": itemId },
    {
      $set: { "items.$.status": status as ItemStatus, updatedAt: new Date() },
      $push: { log: logPush(user.name, `${item.title}: ${ITEM_STATUS[item.status].label} → ${ITEM_STATUS[status as ItemStatus].label}`) },
    },
  );
  refresh();
  return { ok: true };
}

export async function deleteItem(tenderId: string, itemId: string): Promise<FormState> {
  const user = await requireUser();
  if (!ObjectId.isValid(tenderId) || typeof itemId !== "string" || itemId.length > 64) return { error: "Ismeretlen tétel." };

  const collection = await tenders();
  const tender = await collection.findOne({ _id: new ObjectId(tenderId) }, { projection: { items: 1 } });
  const item = tender?.items.find((candidate) => candidate.id === itemId);
  if (!tender || !item) return { error: "A tétel nem található." };

  await collection.updateOne(
    { _id: tender._id },
    { $pull: { items: { id: itemId } }, $set: { updatedAt: new Date() }, $push: { log: logPush(user.name, `Dokumentum törölve: ${item.title}`) } },
  );
  refresh();
  return { ok: true };
}
