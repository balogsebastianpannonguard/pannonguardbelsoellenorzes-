import "server-only";
import { cache } from "react";
import type { Collection, Document } from "mongodb";
import { ownedCollection } from "@/lib/owned-collection";
import { requireUser } from "@/lib/session";

/**
 * Felhasználónkénti adatelkülönítés. Minden munkaterületi gyűjtemény (pályázatok, adatállományok, fordítások,
 * ellenőrzések, ellenőri fájlok, megállapítások, javaslatok, egyéni jogszabályok, iratok) dokumentuma `ownerId`
 * mezőt kap, és a lekérdezések automatikusan a belépett felhasználóra szűkülnek: mindenki csak a saját adatait
 * látja és módosíthatja, mintha egyedül használná a rendszert.
 */

/** A belépett felhasználó azonosítója; kérésenként egyszer olvassa ki a munkamenetet. */
export const currentOwnerId = cache(async () => (await requireUser()).id);

/** A belépett felhasználó hatókörébe szűkített gyűjtemény. */
export async function ownCollection<T extends Document>(collection: Collection<T>) {
  return ownedCollection(collection, await currentOwnerId());
}
