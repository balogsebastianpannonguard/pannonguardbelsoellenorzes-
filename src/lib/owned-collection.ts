import "server-only";
import type { Collection, Document } from "mongodb";

/** A gyűjtemény felhasználói hatókörre szűkítése (a munkamenettől független, önállóan tesztelhető rész). */

const FILTERED = new Set([
  "find",
  "findOne",
  "countDocuments",
  "updateOne",
  "updateMany",
  "replaceOne",
  "deleteOne",
  "deleteMany",
  "findOneAndUpdate",
  "findOneAndDelete",
  "findOneAndReplace",
  "distinct",
]);
const BLOCKED = new Set(["bulkWrite", "watch", "drop", "rename", "initializeOrderedBulkOp", "initializeUnorderedBulkOp"]);

/**
 * A gyűjteményt úgy csomagolja be, hogy minden szűrőbe bekerüljön az `ownerId`, minden új dokumentum megkapja,
 * és a frissítés ne írhassa felül. A típus változatlan `Collection<T>`, így a hívó kód módosítás nélkül működik.
 */
export function ownedCollection<T extends Document>(collection: Collection<T>, ownerId: string): Collection<T> {
  return new Proxy(collection, {
    get(target, property, receiver) {
      const name = String(property);
      const original = Reflect.get(target, property, receiver);
      if (typeof original !== "function") return original;
      if (BLOCKED.has(name)) {
        return () => {
          throw new Error(`A(z) ${name} művelet felhasználói hatókörben nem engedélyezett.`);
        };
      }
      if (name === "estimatedDocumentCount") return () => target.countDocuments({ ownerId } as never);
      if (name === "insertOne") return (doc: T, options?: unknown) => target.insertOne({ ...doc, ownerId } as never, options as never);
      if (name === "insertMany") {
        return (docs: T[], options?: unknown) => target.insertMany(docs.map((doc) => ({ ...doc, ownerId })) as never, options as never);
      }
      if (name === "aggregate") {
        return (pipeline: Document[] = [], options?: unknown) => target.aggregate([{ $match: { ownerId } }, ...pipeline], options as never);
      }
      if (name === "distinct") {
        return (key: string, filter: Document = {}, options?: unknown) => target.distinct(key as never, { ...filter, ownerId } as never, options as never);
      }
      if (FILTERED.has(name)) {
        return (filter: Document = {}, ...rest: unknown[]) => {
          const update = rest[0] as Document | undefined;
          if (update && typeof update === "object" && !Array.isArray(update)) {
            for (const operator of ["$set", "$unset", "$setOnInsert", "$rename"]) {
              if (update[operator] && "ownerId" in update[operator]) throw new Error("Az ownerId nem módosítható.");
            }
          }
          return (original as (...args: unknown[]) => unknown).call(target, { ...filter, ownerId }, ...rest);
        };
      }
      return original.bind(target);
    },
  });
}
