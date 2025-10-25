import {
  writeBatch,
  doc,
  collection,
  serverTimestamp,
  increment,
} from "firebase/firestore";
import { db } from "./firebaseConfig";

/**
 * Saves a new purchase using a batch write to update
 * both 'purchases' and 'unique_items' collections atomically.
 * As defined in the project plan [cite: 164-173]
 */
export const handleSavePurchase = async (itemData, userId, appId) => {
  if (!userId || !appId) {
    throw new Error("User or App ID is missing.");
  }

  const { name, price, category } = itemData;

  // 1. Get a new write batch [cite: 165]
  const batch = writeBatch(db);

  // 2. Create a ref for the new purchase document [cite: 166]
  const purchasesPath = `/artifacts/${appId}/users/${userId}/purchases`;
  const newItemRef = doc(collection(db, purchasesPath));

  // 3. Set the new purchase document data [cite: 167]
  batch.set(newItemRef, {
    name: name.trim().toLowerCase(), // [cite: 158]
    displayName: name.trim(), // [cite: 158]
    price: parseFloat(price),
    category: category,
    purchaseDate: serverTimestamp(), // [cite: 158]
    userId: userId,
  });

  // 4. Create a ref for the unique_item document [cite: 168]
  // The ID is the lowercase name, as planned [cite: 161]
  const uniqueItemsPath = `/artifacts/${appId}/users/${userId}/unique_items`;
  const uniqueItemRef = doc(db, uniqueItemsPath, name.trim().toLowerCase());

  // 5. Set/update the unique_item document [cite: 169]
  batch.set(
    uniqueItemRef,
    {
      name: name.trim().toLowerCase(),
      displayName: name.trim(), // [cite: 162]
      category: category,
      lastPurchaseDate: serverTimestamp(), // [cite: 162]
      purchaseCount: increment(1), // Atomically increment count [cite: 170]
    },
    { merge: true } // This creates or updates (upsert) [cite: 171]
  );

  // 6. Commit the batch [cite: 172]
  await batch.commit();
};

// You can add handleBackupData and handleRestoreData here later
// based on your plan [cite: 174, 182]