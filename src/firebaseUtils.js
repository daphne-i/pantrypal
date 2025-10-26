import {
  writeBatch,
  doc,
  collection,
  serverTimestamp,
  increment,
  Timestamp,
  getDocs,
  query,
  where,
  getDoc,
  setDoc,
  deleteDoc,
  updateDoc,
  arrayUnion, // Import arrayUnion
} from "firebase/firestore";
import { db } from "./firebaseConfig";
import toast from 'react-hot-toast';
import { formatCurrency, formatDate } from './utils';

// --- Helper to parse date string ---
// (Keep as is)
function getTimestampFromDateString(dateString) {
    if (typeof dateString !== 'string' || !dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        console.warn("Invalid date string, falling back to server timestamp:", dateString);
        return serverTimestamp();
    }
    const parts = dateString.split('-').map(Number);
    const localDate = new Date(parts[0], parts[1] - 1, parts[2]);
    if (isNaN(localDate.getTime())) {
        console.warn("Invalid date created, falling back to server timestamp:", dateString);
        return serverTimestamp();
    }
    return Timestamp.fromDate(localDate);
}

// --- Save Bill ---
// (Keep as is)
export const handleSaveBill = async (billData, userId, appId) => {
  if (!userId || !appId) {
    throw new Error("User or App ID is missing.");
  }
  const { shopName, purchaseDate, totalBill } = billData;
  const billsPath = `/artifacts/${appId}/users/${userId}/bills`;
  const newBillRef = doc(collection(db, billsPath));
  const purchaseTimestamp = getTimestampFromDateString(purchaseDate);
  await setDoc(newBillRef, {
    shopName: shopName.trim(),
    purchaseDate: purchaseTimestamp,
    totalBill: totalBill !== '' && !isNaN(parseFloat(totalBill)) ? parseFloat(totalBill) : null,
    itemCount: 0,
    createdAt: serverTimestamp(),
    userId: userId,
  });
  return newBillRef.id;
};

// --- Update Bill ---
// (Keep as is)
export const handleUpdateBill = async (billId, billData, userId, appId) => {
    if (!userId || !appId || !billId) {
      throw new Error("Missing ID for bill update.");
    }
    const { shopName, purchaseDate, totalBill } = billData;
    const billPath = `/artifacts/${appId}/users/${userId}/bills`;
    const billRef = doc(db, billPath, billId);
    const purchaseTimestamp = getTimestampFromDateString(purchaseDate);
    await updateDoc(billRef, {
      shopName: shopName.trim(),
      purchaseDate: purchaseTimestamp,
      totalBill: totalBill !== '' && !isNaN(parseFloat(totalBill)) ? parseFloat(totalBill) : null,
    });
};


// --- Save Items ---
// MODIFIED: Manage priceHistory array
export const handleSaveItems = async (items, billId, billDate, userId, appId) => {
  if (!userId || !appId || !billId || !items || items.length === 0) {
    throw new Error("Missing required data to save items.");
  }

  const purchaseTimestamp = getTimestampFromDateString(billDate);
  const MAX_HISTORY_LENGTH = 5; // Keep the last 5 prices

  const MAX_WRITES_PER_BATCH = 500;
  let batch = writeBatch(db);
  let writeCount = 0;
  const purchasesPath = `/artifacts/${appId}/users/${userId}/purchases`;
  const uniqueItemsPath = `/artifacts/${appId}/users/${userId}/unique_items`;
  const billPath = `/artifacts/${appId}/users/${userId}/bills`;
  const billRef = doc(db, billPath, billId);

  // Pre-fetch existing unique items to update history correctly within the batch
  // Note: This adds read operations but simplifies batch logic.
  const uniqueItemRefsToFetch = items.map(item => doc(db, uniqueItemsPath, item.name.trim().toLowerCase()));
  const uniqueItemSnapshots = await Promise.all(uniqueItemRefsToFetch.map(ref => getDoc(ref)));
  const existingUniqueItems = new Map();
  uniqueItemSnapshots.forEach(snap => {
      if (snap.exists()) {
          existingUniqueItems.set(snap.id, snap.data());
      }
  });


  const commitBatch = async () => {
    await batch.commit();
    batch = writeBatch(db);
    writeCount = 0;
  };

  for (const item of items) {
    // 1. Save the individual purchase item
    const newItemRef = doc(collection(db, purchasesPath));
    batch.set(newItemRef, {
      billId: billId,
      name: item.name.trim().toLowerCase(),
      displayName: item.name.trim(),
      quantity: item.quantity,
      unit: item.unit,
      price: item.price,
      category: item.category,
      purchaseDate: purchaseTimestamp,
      createdAt: serverTimestamp(),
      userId: userId,
    });
    writeCount++;

    // 2. Update the unique item with price history
    const uniqueItemName = item.name.trim().toLowerCase();
    const uniqueItemRef = doc(db, uniqueItemsPath, uniqueItemName);

    // Get existing history or initialize
    const existingData = existingUniqueItems.get(uniqueItemName);
    const currentHistory = existingData?.priceHistory || [];

    // Create new history entry
    const newHistoryEntry = { price: item.price, date: purchaseTimestamp };

    // Prepend new entry and limit history size
    const updatedHistory = [newHistoryEntry, ...currentHistory].slice(0, MAX_HISTORY_LENGTH);

    // Data for unique item update
    const uniqueItemData = {
        name: uniqueItemName,
        displayName: item.name.trim(),
        category: item.category,
        lastPurchaseDate: purchaseTimestamp, // Still track the absolute last purchase
        purchaseCount: increment(1),
        priceHistory: updatedHistory, // Store the array
        isMarkedForShopping: false
        // Removed lastPrice field
    };

    batch.set( uniqueItemRef, uniqueItemData, { merge: true } ); // Use merge:true to create if not exists
    writeCount++;

    // Commit batch if nearing limit
    if (writeCount >= MAX_WRITES_PER_BATCH - 1) { // Leave room for bill update
      await commitBatch();
    }
  }

  // 3. Update the item count on the bill
  batch.update(billRef, { itemCount: increment(items.length) });
  writeCount++;

  // 4. Commit any remaining writes
  if (writeCount > 0) {
    await batch.commit();
  }
};

// --- Delete Single Item ---
// (Keep as is)
export const handleDeleteItem = async (purchaseId, billId, itemData, userId, appId) => {
    if (!userId || !appId || !purchaseId || !billId || !itemData) {
        throw new Error("Missing data for item deletion.");
    }
    const batch = writeBatch(db);
    const purchasePath = `/artifacts/${appId}/users/${userId}/purchases`;
    const purchaseRef = doc(db, purchasePath, purchaseId);
    batch.delete(purchaseRef);
    const billPath = `/artifacts/${appId}/users/${userId}/bills`;
    const billRef = doc(db, billPath, billId);
    batch.update(billRef, { itemCount: increment(-1) });
    const uniqueItemsPath = `/artifacts/${appId}/users/${userId}/unique_items`;
    const uniqueItemName = itemData.name.trim().toLowerCase();
    const uniqueItemRef = doc(db, uniqueItemsPath, uniqueItemName);
    batch.update(uniqueItemRef, { purchaseCount: increment(-1) });
    // Note: We don't remove from priceHistory on deletion to keep historical data
    await batch.commit();
};

// --- Update Single Item ---
// MODIFIED: Only update basic info, not price history here
export const handleUpdateItem = async (purchaseId, oldData, newData, userId, appId) => {
    if (!userId || !appId || !purchaseId || !oldData || !newData) {
        throw new Error("Missing data for item update.");
    }

    const batch = writeBatch(db);
    const purchasesPath = `/artifacts/${appId}/users/${userId}/purchases`;
    const uniqueItemsPath = `/artifacts/${appId}/users/${userId}/unique_items`;

    // 1. Update the 'purchase' document itself
    const purchaseRef = doc(db, purchasesPath, purchaseId);
    batch.update(purchaseRef, {
        name: newData.name.trim().toLowerCase(),
        displayName: newData.name.trim(),
        quantity: newData.quantity,
        unit: newData.unit,
        price: newData.price, // Update price on the individual purchase record
        category: newData.category,
    });

    const newUniqueItemName = newData.name.trim().toLowerCase();
    const oldUniqueItemName = oldData.name.trim().toLowerCase();

    // 2. Handle 'unique_items' collection ONLY IF name changed
    // We are NOT updating priceHistory or lastPurchaseDate here.
    if (newUniqueItemName !== oldUniqueItemName) {
        // --- Name Changed ---
        // A. Decrement old unique item count (keep its history)
        const oldItemRef = doc(db, uniqueItemsPath, oldUniqueItemName);
        batch.update(oldItemRef, { purchaseCount: increment(-1) });

        // B. Increment/set new unique item count
        // Fetch existing new item to preserve its history if it exists
        const newItemRef = doc(db, uniqueItemsPath, newUniqueItemName);
        const newItemSnap = await getDoc(newItemRef);
        const existingNewItemData = newItemSnap.exists() ? newItemSnap.data() : {};

        batch.set(newItemRef, {
            ...existingNewItemData, // Spread existing data first
            name: newUniqueItemName,
            displayName: newData.name.trim(),
            category: newData.category,
            purchaseCount: increment(1),
            // Preserve existing priceHistory, lastPurchaseDate, isMarkedForShopping
            // These will be updated correctly on the *next* save via handleSaveItems
        }, { merge: true });

    } else {
        // --- Name Did NOT Change ---
        // Only update displayName and category if they differ.
        const uniqueItemRef = doc(db, uniqueItemsPath, newUniqueItemName);
        const uniqueItemSnap = await getDoc(uniqueItemRef);
        if (uniqueItemSnap.exists()) {
             const uniqueData = uniqueItemSnap.data();
             const updates = {};
             if (uniqueData.displayName !== newData.name.trim()) {
                 updates.displayName = newData.name.trim();
             }
             if (uniqueData.category !== newData.category) {
                 updates.category = newData.category;
             }
             if (Object.keys(updates).length > 0) {
                 batch.update(uniqueItemRef, updates);
             }
        }
        // No update to priceHistory or lastPurchaseDate needed here
    }

    await batch.commit();
};

// --- Delete Entire Bill ---
// (Keep as is)
export const handleDeleteBill = async (billId, userId, appId) => {
    if (!userId || !appId || !billId) {
      throw new Error("Missing ID for bill deletion.");
    }
    const MAX_WRITES_PER_BATCH = 500;
    let batch = writeBatch(db);
    let writeCount = 0;
    const commitBatch = async () => {
        await batch.commit();
        batch = writeBatch(db);
        writeCount = 0;
        console.log("Committed batch during bill deletion.");
    };
    const addDelete = async (docRef) => {
        batch.delete(docRef);
        writeCount++;
        if (writeCount >= MAX_WRITES_PER_BATCH) {
            await commitBatch();
        }
    };
    const purchasesPath = `/artifacts/${appId}/users/${userId}/purchases`;
    const purchasesQuery = query(collection(db, purchasesPath), where("billId", "==", billId));
    const purchasesSnap = await getDocs(purchasesQuery);
    const uniqueItemsToUpdate = new Map();
    for (const purchaseDoc of purchasesSnap.docs) {
        await addDelete(purchaseDoc.ref);
        const purchaseData = purchaseDoc.data();
        const uniqueItemName = purchaseData.name?.trim().toLowerCase();
        if (uniqueItemName) {
            uniqueItemsToUpdate.set(uniqueItemName, (uniqueItemsToUpdate.get(uniqueItemName) || 0) + 1);
        }
    }
    const uniqueItemsPath = `/artifacts/${appId}/users/${userId}/unique_items`;
    for (const [name, count] of uniqueItemsToUpdate.entries()) {
        const uniqueItemRef = doc(db, uniqueItemsPath, name);
        batch.update(uniqueItemRef, { purchaseCount: increment(-count) });
        writeCount++;
         if (writeCount >= MAX_WRITES_PER_BATCH -1) {
             await commitBatch();
         }
    }
    const billPath = `/artifacts/${appId}/users/${userId}/bills`;
    const billRef = doc(db, billPath, billId);
    await addDelete(billRef);
    if (writeCount > 0) {
        console.log(`Committing final ${writeCount} deletes for bill ${billId}`);
        await batch.commit();
    }
};


// --- Backup Function ---
// (Keep as is - it already handles Timestamps correctly)
export const handleBackupData = async (userId, appId) => {
  if (!userId || !appId) {
    throw new Error("User or App ID is missing for backup.");
  }
  const purchasesPath = `/artifacts/${appId}/users/${userId}/purchases`;
  const uniqueItemsPath = `/artifacts/${appId}/users/${userId}/unique_items`;
   const billsPath = `/artifacts/${appId}/users/${userId}/bills`;
  const profilePath = `/artifacts/${appId}/users/${userId}/profile`;
  const profileRef = doc(db, profilePath, userId);
  try {
    const [purchasesSnap, uniqueItemsSnap, billsSnap, profileSnap] = await Promise.all([
      getDocs(collection(db, purchasesPath)),
      getDocs(collection(db, uniqueItemsPath)),
      getDocs(collection(db, billsPath)),
      getDoc(profileRef)
    ]);
    const backupData = {
      profile: profileSnap.exists() ? profileSnap.data() : null,
      bills: billsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      purchases: purchasesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      unique_items: uniqueItemsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
    };
    const replacer = (key, value) => {
       if (value instanceof Timestamp) {
            return { __datatype__: 'timestamp', value: value.toDate().toISOString() };
       }
       return value;
    };
    const jsonString = JSON.stringify(backupData, replacer, 2);
    const blob = new Blob([jsonString], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const dateStamp = new Date().toISOString().split('T')[0];
    link.download = `pantrypal_backup_${dateStamp}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Backup process failed:", error);
    throw new Error("Failed to create backup file.");
  }
};

// --- Restore Function ---
// (Keep as is - it already handles Timestamps correctly)
export const handleRestoreData = async (file, userId, appId) => {
    if (!file || !userId || !appId) {
        throw new Error("Missing file, user, or app ID for restore.");
    }
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const jsonString = event.target.result;
                 const reviver = (key, value) => {
                    if (value && typeof value === 'object' && value.type === 'firestore/timestamp/1.0' && typeof value.seconds === 'number' && typeof value.nanoseconds === 'number') {
                        try {
                           return new Timestamp(value.seconds, value.nanoseconds);
                        } catch (e) {
                           console.warn(`Error creating Timestamp from seconds/nanos for key "${key}":`, value, e);
                           return serverTimestamp(); // Fallback
                        }
                    }
                    if (value && typeof value === 'object' && value.__datatype__ === 'timestamp') {
                        const date = new Date(value.value);
                         if (!isNaN(date)) {
                            return Timestamp.fromDate(date);
                         }
                         console.warn(`Invalid date string encountered for key "${key}":`, value.value);
                         return serverTimestamp(); // Fallback
                    }
                    return value;
                };
                const backupData = JSON.parse(jsonString, reviver);
                if (!backupData || (!backupData.profile && !backupData.bills && !backupData.purchases && !backupData.unique_items)) {
                    throw new Error("Invalid backup file format. Missing expected data sections.");
                }
                const MAX_WRITES_PER_BATCH = 499;
                let batch = writeBatch(db);
                let writeCount = 0;
                const commitBatch = async () => {
                    await batch.commit();
                    batch = writeBatch(db);
                    writeCount = 0;
                    console.log("Committed batch during restore.");
                };
                 const addWrite = async (docRef, data) => {
                     const cleanData = Object.entries(data).reduce((acc, [key, val]) => {
                         if (val !== undefined) {
                             acc[key] = val;
                         }
                         return acc;
                     }, {});
                    batch.set(docRef, cleanData);
                    writeCount++;
                    if (writeCount >= MAX_WRITES_PER_BATCH) {
                        await commitBatch();
                    }
                };
                if (backupData.profile) {
                     const profilePath = `/artifacts/${appId}/users/${userId}/profile`;
                     const profileRef = doc(db, profilePath, userId);
                     await addWrite(profileRef, backupData.profile);
                }
                if (backupData.bills && Array.isArray(backupData.bills)) {
                     const billsPath = `/artifacts/${appId}/users/${userId}/bills`;
                     for (const bill of backupData.bills) {
                         if (!bill.id) continue;
                         const billRef = doc(db, billsPath, bill.id);
                         const { id, ...billDocData } = bill;
                         await addWrite(billRef, billDocData);
                     }
                }
                if (backupData.purchases && Array.isArray(backupData.purchases)) {
                    const purchasesPath = `/artifacts/${appId}/users/${userId}/purchases`;
                    for (const purchase of backupData.purchases) {
                         if (!purchase.id) continue;
                         const purchaseRef = doc(db, purchasesPath, purchase.id);
                          const { id, ...purchaseDocData } = purchase;
                         await addWrite(purchaseRef, purchaseDocData);
                    }
                }
                if (backupData.unique_items && Array.isArray(backupData.unique_items)) {
                    const uniqueItemsPath = `/artifacts/${appId}/users/${userId}/unique_items`;
                     for (const item of backupData.unique_items) {
                         if (!item.id) continue;
                         const itemRef = doc(db, uniqueItemsPath, item.id);
                         const { id, ...itemDocData } = item;
                         // Ensure isMarkedForShopping exists, default to false if restoring old data
                         if (itemDocData.isMarkedForShopping === undefined) {
                            itemDocData.isMarkedForShopping = false;
                         }
                         await addWrite(itemRef, itemDocData);
                     }
                }
                if (writeCount > 0) {
                     console.log(`Committing final ${writeCount} writes...`);
                     await batch.commit();
                }
                resolve();
            } catch (error) {
                console.error("Restore process failed:", error);
                reject(new Error(`Failed to parse or restore data: ${error.message}`));
            }
        };
        reader.onerror = (error) => {
            console.error("Error reading file:", error);
            reject(new Error("Failed to read the backup file."));
        };
        reader.readAsText(file);
    });
};


// --- Export CSV Function ---
// (Keep as is)
export const handleExportCSV = (purchases, selectedMonth) => {
    if (!purchases || purchases.length === 0) {
      toast.error("No purchase data available for the selected month to export.");
      return;
    }
    try {
      const headers = ['Date', 'Item', 'Category', 'Quantity', 'Unit', 'Price'];
      const rows = purchases.map(item => {
        const escapeCSV = (value) => {
            if (value === null || value === undefined) return '';
            let str = String(value);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                str = `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };
        return [
          escapeCSV(formatDate(item.purchaseDate)),
          escapeCSV(item.displayName),
          escapeCSV(item.category),
          escapeCSV(item.quantity),
          escapeCSV(item.unit),
          String(item.price || 0)
        ].join(',');
      });
      const csvContent = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `pantrypal_report_${selectedMonth}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Report exported successfully!");
    } catch (error) {
      console.error("CSV Export failed:", error);
      toast.error(`CSV Export failed: ${error.message}`);
    }
};

// --- Toggle Shopping List Item ---
// (Keep as is)
export const handleToggleShoppingListItem = async (itemId, isMarked, userId, appId) => {
    if (!userId || !appId || !itemId) {
        throw new Error("Missing required data to update shopping list item.");
    }
    const uniqueItemsPath = `/artifacts/${appId}/users/${userId}/unique_items`;
    const itemRef = doc(db, uniqueItemsPath, itemId);
    try {
        await updateDoc(itemRef, {
            isMarkedForShopping: isMarked
        });
    } catch (error) {
        console.error(`Error updating shopping list status for item ${itemId}:`, error);
        toast.error(`Failed to update item status: ${error.message}`);
        throw error;
    }
};