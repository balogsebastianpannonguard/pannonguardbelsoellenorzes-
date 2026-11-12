"use server";

import { refresh } from "next/cache";
import { DAY, text, type FormState } from "@/lib/form";
import { BASE_LAWS, acknowledgeChange, checkAllLaws, checkLaw, insertCustomLaw, lawExists, removeCustomLaw, saveMeta, validLawUrl } from "@/lib/legal";
import { requireUser } from "@/lib/session";

const ID = /^[a-z0-9]{2,24}$/;

export async function addLaw(_previous: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const name = text(formData, "name", 160);
  const cite = text(formData, "cite", 120);
  const url = text(formData, "url", 300);
  const why = text(formData, "why", 400);

  if (name.length < 3) return { error: "Add meg a jogszabály nevét." };
  if (cite.length < 3) return { error: "Add meg a hivatkozást (pl. 2012. évi I. törvény)." };
  if (!validLawUrl(url)) return { error: "A cím a Nemzeti Jogszabálytár (https://njt.jog.gov.hu/…) oldalára mutasson." };

  const id = await insertCustomLaw({ name, cite, url, why }, user.name);
  // Az alapállapot azonnal rögzül, így az első tényleges változás már észlelhető.
  await checkLaw(id).catch(() => undefined);
  refresh();
  return { ok: true, message: "Felvéve és ellenőrizve.", id };
}

export async function deleteLaw(id: string): Promise<FormState> {
  await requireUser();
  if (BASE_LAWS.some((law) => law.id === id)) return { error: "Az alapkészlet jogszabályai nem törölhetők." };
  if (!(await removeCustomLaw(id))) return { error: "A jogszabály nem található." };
  refresh();
  return { ok: true };
}

export async function checkOne(id: string): Promise<FormState> {
  await requireUser();
  if (typeof id !== "string" || !ID.test(id) || !(await lawExists(id))) return { error: "Ismeretlen jogszabály." };
  await checkLaw(id);
  refresh();
  return { ok: true };
}

export async function acknowledgeLaw(id: string): Promise<FormState> {
  await requireUser();
  if (typeof id !== "string" || !ID.test(id) || !(await lawExists(id))) return { error: "Ismeretlen jogszabály." };
  await acknowledgeChange(id);
  refresh();
  return { ok: true };
}

export async function checkEverything(): Promise<FormState> {
  await requireUser();
  await checkAllLaws();
  refresh();
  return { ok: true };
}

export async function saveLawMeta(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  const note = String(formData.get("note") ?? "").replace(/\r\n/g, "\n").trim().slice(0, 1000);
  const effectiveDate = String(formData.get("effectiveDate") ?? "");

  if (!ID.test(id) || !(await lawExists(id))) return { error: "Ismeretlen jogszabály." };
  if (effectiveDate && (!DAY.test(effectiveDate) || Number.isNaN(Date.parse(`${effectiveDate}T12:00:00Z`)))) {
    return { error: "Érvénytelen hatálybalépési dátum." };
  }
  await saveMeta(id, note, effectiveDate);
  refresh();
  return { ok: true, message: "Mentve." };
}
