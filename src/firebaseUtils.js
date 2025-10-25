import {
  writeBatch,
  doc,
  collection,
  serverTimestamp,
  increment,
  Timestamp, // Make sure Timestamp is imported
  getDocs,
  query,
  where,
  getDoc,
  setDoc, // Ensure setDoc is imported for restore
} from "firebase/firestore";
import { db } from "./firebaseConfig";
import toast from 'react-hot-toast'; // Import toast for CSV feedback
import { formatCurrency, formatDate } from './utils'; // Import formatters

/**
 * Saves a new bill entry to Firestore.
 */
export const handleSaveBill = async (billData, userId, appId) => {
  if (!userId || !appId) {
    throw new Error("User or App ID is missing.");
  }

  const { shopName, purchaseDate, totalBill } = billData;

  const billsPath = `/artifacts/${appId}/users/${userId}/bills`;
  const newBillRef = doc(collection(db, billsPath));

  await setDoc(newBillRef, {
    shopName: shopName.trim(),
    purchaseDate: Timestamp.fromDate(new Date(purchaseDate)), // Store as Timestamp
    totalBill: totalBill !== '' && !isNaN(parseFloat(totalBill)) ? parseFloat(totalBill) : null, // Store null if empty/invalid
    itemCount: 0, // Initialize item count
    createdAt: serverTimestamp(),
    userId: userId,
  });

  return newBillRef.id; // Return the new bill ID
};


/**
 * Saves multiple purchase items linked to a specific bill using batch writes.
 * Also updates unique_items and the bill's itemCount.
 */
export const handleSaveItems = async (items, billId, userId, appId) => {
  if (!userId || !appId || !billId || !items || items.length === 0) {
    throw new Error("Missing required data to save items.");
  }

  // --- Core Batch Logic ---
  const MAX_WRITES_PER_BATCH = 500;
  let batch = writeBatch(db);
  let writeCount = 0;

  const purchasesPath = `/artifacts/${appId}/users/${userId}/purchases`;
  const uniqueItemsPath = `/artifacts/${appId}/users/${userId}/unique_items`;
  const billPath = `/artifacts/${appId}/users/${userId}/bills`;
  const billRef = doc(db, billPath, billId);

  // Function to commit current batch and start a new one
  const commitBatch = async () => {
    await batch.commit();
    batch = writeBatch(db);
    writeCount = 0;
  };

  for (const item of items) {
    // 1. Add Purchase Item
    const newItemRef = doc(collection(db, purchasesPath));
    batch.set(newItemRef, {
      billId: billId, // Link to the bill
      name: item.name.trim().toLowerCase(),
      displayName: item.name.trim(),
      quantity: item.quantity,
      unit: item.unit,
      price: item.price, // Total price for this line item
      category: item.category,
      purchaseDate: item.purchaseDate instanceof Timestamp ? item.purchaseDate : Timestamp.fromDate(new Date()), // Use passed date or now
      userId: userId,
    });
    writeCount++;

    // 2. Update Unique Item
    const uniqueItemRef = doc(db, uniqueItemsPath, item.name.trim().toLowerCase());
    batch.set(
      uniqueItemRef,
      {
        name: item.name.trim().toLowerCase(),
        displayName: item.name.trim(),
        category: item.category,
        lastPurchaseDate: item.purchaseDate instanceof Timestamp ? item.purchaseDate : Timestamp.fromDate(new Date()),
        purchaseCount: increment(1),
        // We could also store last price/unit here if desired
      },
      { merge: true }
    );
    writeCount++;

    // Commit batch if it's nearing the limit (leave room for bill update)
    if (writeCount >= MAX_WRITES_PER_BATCH - 1) {
      await commitBatch();
    }
  }

  // 3. Update Bill Item Count (atomic increment)
  batch.update(billRef, {
    itemCount: increment(items.length),
  });
  writeCount++;

  // Commit any remaining writes in the last batch
  if (writeCount > 0) {
    await batch.commit();
  }
};


// --- Backup Function ---
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
    // Fetch all collections and the profile document
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

    // Convert Firestore Timestamps to ISO strings for JSON compatibility
    const replacer = (key, value) => {
       if (value instanceof Timestamp) {
            // Store as an object marking it as a Timestamp for easier restoration
            return { __datatype__: 'timestamp', value: value.toDate().toISOString() };
       }
       return value;
    };

    const jsonString = JSON.stringify(backupData, replacer, 2); // Pretty print JSON

    // Create a Blob and trigger download
    const blob = new Blob([jsonString], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const dateStamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    link.download = `pantrypal_backup_${dateStamp}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

  } catch (error) {
    console.error("Backup process failed:", error);
    throw new Error("Failed to create backup file."); // Re-throw for toast
  }
};

// --- Restore Function ---
export const handleRestoreData = async (file, userId, appId) => {
    if (!file || !userId || !appId) {
        throw new Error("Missing file, user, or app ID for restore.");
    }

    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = async (event) => {
            try {
                const jsonString = event.target.result;
                // Reviver function to convert ISO strings back to Timestamps
                 const reviver = (key, value) => {
                    if (value && typeof value === 'object' && value.__datatype__ === 'timestamp') {
                        const date = new Date(value.value);
                         if (!isNaN(date)) {
                            return Timestamp.fromDate(date);
                         }
                         console.warn(`Invalid date string encountered for key "${key}":`, value.value);
                         return serverTimestamp(); // Fallback if date is invalid? Or keep null?
                    }
                    return value;
                };
                const backupData = JSON.parse(jsonString, reviver);

                // Basic validation (check if expected keys exist)
                if (!backupData || (!backupData.profile && !backupData.bills && !backupData.purchases && !backupData.unique_items)) {
                    throw new Error("Invalid backup file format. Missing expected data sections.");
                }

                // --- Start Batch Writes ---
                const MAX_WRITES_PER_BATCH = 499; // Keep slightly under 500 limit
                let batch = writeBatch(db);
                let writeCount = 0;

                const commitBatch = async () => {
                    await batch.commit();
                    batch = writeBatch(db); // Start new batch
                    writeCount = 0;
                    console.log("Committed batch during restore.");
                };

                 const addWrite = async (docRef, data) => {
                    batch.set(docRef, data); // Using set to overwrite completely
                    writeCount++;
                    if (writeCount >= MAX_WRITES_PER_BATCH) {
                        await commitBatch();
                    }
                };


                // Restore Profile (if exists)
                if (backupData.profile) {
                     const profilePath = `/artifacts/${appId}/users/${userId}/profile`;
                     const profileRef = doc(db, profilePath, userId); // Doc ID is the userId
                     await addWrite(profileRef, backupData.profile);
                }

                // Restore Bills (if exists)
                if (backupData.bills && Array.isArray(backupData.bills)) {
                     const billsPath = `/artifacts/${appId}/users/${userId}/bills`;
                     for (const bill of backupData.bills) {
                         if (!bill.id) continue; // Skip if no ID
                         const billRef = doc(db, billsPath, bill.id);
                         const { id, ...billDocData } = bill; // Remove id from data object
                         await addWrite(billRef, billDocData);
                     }
                }

                // Restore Purchases (if exists)
                if (backupData.purchases && Array.isArray(backupData.purchases)) {
                    const purchasesPath = `/artifacts/${appId}/users/${userId}/purchases`;
                    for (const purchase of backupData.purchases) {
                         if (!purchase.id) continue; // Skip if no ID
                         const purchaseRef = doc(db, purchasesPath, purchase.id);
                          const { id, ...purchaseDocData } = purchase; // Remove id from data object
                         await addWrite(purchaseRef, purchaseDocData);
                    }
                }

                // Restore Unique Items (if exists)
                if (backupData.unique_items && Array.isArray(backupData.unique_items)) {
                    const uniqueItemsPath = `/artifacts/${appId}/users/${userId}/unique_items`;
                     for (const item of backupData.unique_items) {
                         if (!item.id) continue; // Skip if no ID
                         const itemRef = doc(db, uniqueItemsPath, item.id);
                         const { id, ...itemDocData } = item; // Remove id from data object
                         await addWrite(itemRef, itemDocData);
                     }
                }

                // Commit any remaining writes
                if (writeCount > 0) {
                     console.log(`Committing final ${writeCount} writes...`);
                     await batch.commit();
                }
                // --- End Batch Writes ---

                resolve(); // Indicate success

            } catch (error) {
                console.error("Restore process failed:", error);
                reject(new Error(`Failed to parse or restore data: ${error.message}`));
            }
        };

        reader.onerror = (error) => {
            console.error("Error reading file:", error);
            reject(new Error("Failed to read the backup file."));
        };

        reader.readAsText(file); // Start reading the file
    });
};

// --- Export CSV Function ---
// ** ADDED EXPORT KEYWORD **
export const handleExportCSV = (purchases, selectedMonth) => {
    if (!purchases || purchases.length === 0) {
      // Use toast or component state for feedback instead of alert
      toast.error("No purchase data available for the selected month to export.");
      return; // Stop execution if no data
    }

    try {
      // Define CSV Headers
      const headers = ['Date', 'Item', 'Category', 'Quantity', 'Unit', 'Price'];

      // Convert purchase data to CSV rows
      const rows = purchases.map(item => {
        // Ensure values are properly escaped for CSV (handling commas, quotes)
        const escapeCSV = (value) => {
            if (value === null || value === undefined) return '';
            let str = String(value);
            // If the value contains a comma, double quote, or newline, enclose it in double quotes
            // and escape any existing double quotes within it by doubling them
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                str = `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };

        return [
          escapeCSV(formatDate(item.purchaseDate)), // Use formatDate
          escapeCSV(item.displayName),
          escapeCSV(item.category),
          escapeCSV(item.quantity),
          escapeCSV(item.unit),
          // For CSV, it might be better to export the raw number, not the formatted currency string
          // escapeCSV(formatCurrency(item.price))
          String(item.price || 0) // Export raw price number
        ].join(','); // Join values with a comma
      });

      // Combine headers and rows
      const csvContent = [headers.join(','), ...rows].join('\n');

      // Create a Blob and trigger download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `pantrypal_report_${selectedMonth}.csv`; // Filename based on month
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Report exported successfully!");

    } catch (error) {
      console.error("CSV Export failed:", error);
      // Removed alert, use toast instead
      toast.error(`CSV Export failed: ${error.message}`);
    }
  };

