import { getDoc, runTransaction } from "firebase/firestore";

const MAX_COUNTER_CONFLICT_RETRIES = 3;

export async function runPublicationTransaction(db, counterRef, callback) {
  for (let retries = 0; ; retries += 1) {
    let readIndex;
    try {
      return await runTransaction(db, (transaction) => {
        // Firestore can retry this callback itself. Only its latest read proves a conflict.
        readIndex = undefined;
        return callback(transaction, (index) => {
          readIndex = Number.isSafeInteger(index) && index >= 0 ? index : undefined;
        });
      });
    } catch (error) {
      if ((error?.code !== "permission-denied" && error?.code !== "firestore/permission-denied") ||
          readIndex === undefined || retries >= MAX_COUNTER_CONFLICT_RETRIES) throw error;

      let fresh;
      try {
        fresh = await getDoc(counterRef);
      } catch {
        throw error;
      }
      const currentIndex = fresh.exists() ? fresh.data()?.lastIndex : undefined;
      if (fresh.metadata?.fromCache || !Number.isSafeInteger(currentIndex) || currentIndex <= readIndex) throw error;
      // Rules may reject a stale +1 before Firestore reports an aborted transaction.
      // Re-enter only when a fresh counter read proves another publisher advanced it.
    }
  }
}
