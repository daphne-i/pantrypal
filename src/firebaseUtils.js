import {
  writeBatch,
  doc,
  collection,
  serverTimestamp,
  increment,
  Timestamp, // <--- Make sure Timestamp is imported directly
  getDocs,
  query,
  where,
  getDoc,
  setDoc,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebaseConfig";
import toast from 'react-hot-toast';
import { formatCurrency, formatDate } from './utils'; // Assuming utils.js is in src/

// --- Helper to parse date string ---
// Creates a local date at midnight to avoid timezone shifts
function getTimestampFromDateString(dateString) {
    if (typeof dateString !== 'string' || !dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Fallback for safety
        console.warn("Invalid date string, falling back to server timestamp:", dateString);
        // Use serverTimestamp for new items if date is somehow invalid
        // For existing items, this function shouldn't be called with invalid data
        return serverTimestamp();
    }
    // "2024-10-25" -> creates date as "2024-10-25T00:00:00" in local time
    const parts = dateString.split('-').map(Number);
    const localDate = new Date(parts[0], parts[1] - 1, parts[2]); // (Year, MonthIndex, Day)

    // Check for invalid date (e.g., "2024-02-31")
    if (isNaN(localDate.getTime())) {
        console.warn("Invalid date created, falling back to server timestamp:", dateString);
        return serverTimestamp();
    }

    return Timestamp.fromDate(localDate);
}

// --- Save Bill ---
export const handleSaveBill = async (billData, userId, appId) => {
  if (!userId || !appId) {
    throw new Error("User or App ID is missing.");
  }
  const { shopName, purchaseDate, totalBill } = billData;
  const billsPath = `/artifacts/${appId}/users/${userId}/bills`;
  const newBillRef = doc(collection(db, billsPath));

  // Use helper to convert YYYY-MM-DD string to Firestore Timestamp
  const purchaseTimestamp = getTimestampFromDateString(purchaseDate);

  await setDoc(newBillRef, {
    shopName: shopName.trim(),
    purchaseDate: purchaseTimestamp, // Save as Timestamp
    totalBill: totalBill !== '' && !isNaN(parseFloat(totalBill)) ? parseFloat(totalBill) : null,
    itemCount: 0,
    createdAt: serverTimestamp(),
    userId: userId,
  });
  return newBillRef.id;
};

// --- Update Bill ---
export const handleUpdateBill = async (billId, billData, userId, appId) => {
    if (!userId || !appId || !billId) {
      throw new Error("Missing ID for bill update.");
    }
    const { shopName, purchaseDate, totalBill } = billData;
    const billPath = `/artifacts/${appId}/users/${userId}/bills`;
    const billRef = doc(db, billPath, billId);

    // Use helper to convert YYYY-MM-DD string to Firestore Timestamp
    const purchaseTimestamp = getTimestampFromDateString(purchaseDate);

    await updateDoc(billRef, {
      shopName: shopName.trim(),
      purchaseDate: purchaseTimestamp, // Save as Timestamp
      totalBill: totalBill !== '' && !isNaN(parseFloat(totalBill)) ? parseFloat(totalBill) : null,
    });
};


// --- Save Items ---
// Now accepts billDate (as a string) to ensure items have the correct date
export const handleSaveItems = async (items, billId, billDate, userId, appId) => {
  if (!userId || !appId || !billId || !items || items.length === 0) {
    throw new Error("Missing required data to save items.");
  }

  // Convert the bill's date string to a Timestamp *once*
  const purchaseTimestamp = getTimestampFromDateString(billDate);

  const MAX_WRITES_PER_BATCH = 500;
  let batch = writeBatch(db);
  let writeCount = 0;
  const purchasesPath = `/artifacts/${appId}/users/${userId}/purchases`;
  const uniqueItemsPath = `/artifacts/${appId}/users/${userId}/unique_items`;
  const billPath = `/artifacts/${appId}/users/${userId}/bills`;
  const billRef = doc(db, billPath, billId);

  const commitBatch = async () => {
    await batch.commit();
    batch = writeBatch(db);
    writeCount = 0;
  };

  for (const item of items) {
    const newItemRef = doc(collection(db, purchasesPath));
    batch.set(newItemRef, {
      billId: billId,
      name: item.name.trim().toLowerCase(),
      displayName: item.name.trim(),
      quantity: item.quantity,
      unit: item.unit,
      price: item.price,
      category: item.category,
      purchaseDate: purchaseTimestamp, // Use the bill's date
      createdAt: serverTimestamp(), // Keep track of when item was added
      userId: userId,
    });
    writeCount++;

    const uniqueItemRef = doc(db, uniqueItemsPath, item.name.trim().toLowerCase());
    batch.set(
      uniqueItemRef,
      {
        name: item.name.trim().toLowerCase(),
        displayName: item.name.trim(),
        category: item.category,
        lastPurchaseDate: purchaseTimestamp, // Use the bill's date
        purchaseCount: increment(1),
        lastPrice: item.price, // Store the price of this item
      },
      { merge: true }
    );
    writeCount++;

    if (writeCount >= MAX_WRITES_PER_BATCH - 1) { // Leave room for bill update
      await commitBatch();
    }
  }

  // Update the item count on the bill
  batch.update(billRef, {
    itemCount: increment(items.length),
  });
  writeCount++;

  // Commit the final batch if there are remaining writes
  if (writeCount > 0) {
    await batch.commit();
  }
};

// --- Delete Single Item ---
export const handleDeleteItem = async (purchaseId, billId, itemData, userId, appId) => {
    if (!userId || !appId || !purchaseId || !billId || !itemData) {
        throw new Error("Missing data for item deletion.");
    }

    const batch = writeBatch(db);

    // 1. Ref for the purchase item to delete
    const purchasePath = `/artifacts/${appId}/users/${userId}/purchases`;
    const purchaseRef = doc(db, purchasePath, purchaseId);
    batch.delete(purchaseRef);

    // 2. Ref for the bill to decrement itemCount
    const billPath = `/artifacts/${appId}/users/${userId}/bills`;
    const billRef = doc(db, billPath, billId);
    batch.update(billRef, { itemCount: increment(-1) });

    // 3. Ref for the unique item to decrement purchaseCount
    const uniqueItemsPath = `/artifacts/${appId}/users/${userId}/unique_items`;
    const uniqueItemName = itemData.name.trim().toLowerCase();
    const uniqueItemRef = doc(db, uniqueItemsPath, uniqueItemName);
    // Note: This logic doesn't reset lastPurchaseDate/lastPrice if this
    // was the last item. A full solution would require querying for the
    // next-most-recent purchase, which is much more complex.
    batch.update(uniqueItemRef, { purchaseCount: increment(-1) });

    await batch.commit();
};

// --- Update Single Item ---
export const handleUpdateItem = async (purchaseId, oldData, newData, userId, appId) => {
    if (!userId || !appId || !purchaseId || !oldData || !newData) {
        throw new Error("Missing data for item update.");
    }

    const batch = writeBatch(db);
    const purchasesPath = `/artifacts/${appId}/users/${userId}/purchases`;
    const uniqueItemsPath = `/artifacts/${appId}/users/${userId}/unique_items`;

    // 1. Update the 'purchase' document
    const purchaseRef = doc(db, purchasesPath, purchaseId);
    batch.update(purchaseRef, {
        name: newData.name.trim().toLowerCase(),
        displayName: newData.name.trim(),
        quantity: newData.quantity,
        unit: newData.unit,
        price: newData.price,
        category: newData.category,
        // We don't update purchaseDate, as it's tied to the bill
    });

    const newUniqueItemName = newData.name.trim().toLowerCase();
    const oldUniqueItemName = oldData.name.trim().toLowerCase();

    // 2. Handle 'unique_items' collection
    if (newUniqueItemName !== oldUniqueItemName) {
        // --- Name Changed ---
        // A. Decrement old unique item
        const oldItemRef = doc(db, uniqueItemsPath, oldUniqueItemName);
        batch.update(oldItemRef, { purchaseCount: increment(-1) });

        // B. Increment/set new unique item
        const newItemRef = doc(db, uniqueItemsPath, newUniqueItemName);
        batch.set(newItemRef, {
            name: newUniqueItemName,
            displayName: newData.name.trim(),
            category: newData.category,
            lastPurchaseDate: oldData.purchaseDate, // Use original purchase date
            purchaseCount: increment(1),
            lastPrice: newData.price, // Use the new price
        }, { merge: true });

    } else {
        // --- Name Did NOT Change ---
        const uniqueItemRef = doc(db, uniqueItemsPath, newUniqueItemName);

        // Base update for fields that always change
        const updateData = {
            displayName: newData.name.trim(),
            category: newData.category
        };

        // Fetch the current unique item data to check the lastPurchaseDate
        const uniqueItemSnap = await getDoc(uniqueItemRef);
        let mustUpdateLastFields = false; // Flag to update lastPrice/lastDate

        if (uniqueItemSnap.exists()) {
            const uniqueData = uniqueItemSnap.data();

            // Check if the item being edited IS the latest purchase recorded
            // or if lastPrice/lastPurchaseDate is missing (for older data)
            const isLatestPurchase = !uniqueData.lastPurchaseDate || uniqueData.lastPurchaseDate.toMillis() <= oldData.purchaseDate.toMillis();
            const isMissingLastPrice = uniqueData.lastPrice === undefined;

            if (isLatestPurchase || isMissingLastPrice) {
                // Set/update lastPrice and lastDate because this edit affects the latest record
                updateData.lastPrice = newData.price;
                // Only update lastPurchaseDate if this IS the latest purchase
                if(isLatestPurchase) {
                   updateData.lastPurchaseDate = oldData.purchaseDate;
                }
                mustUpdateLastFields = true;
            }
        } else {
            // If unique item doesn't exist yet (should be rare), set everything
            updateData.lastPrice = newData.price;
            updateData.lastPurchaseDate = oldData.purchaseDate;
            updateData.purchaseCount = increment(1); // Should technically be 1, but increment(1) handles merge case
            updateData.name = newUniqueItemName;
            mustUpdateLastFields = true; // Ensure these are set
        }

        // Apply the update using either set (for new) or update (for existing)
         if (mustUpdateLastFields) {
             batch.set(uniqueItemRef, updateData, { merge: true }); // Use set with merge to handle both creation and update
         } else if (uniqueItemSnap.exists()) {
              // Only update displayName and category if not the latest purchase
              batch.update(uniqueItemRef, {
                 displayName: newData.name.trim(),
                 category: newData.category
             });
         }
    }

    await batch.commit();
};


// --- Delete Entire Bill (and its items) ---
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

    // 1. Find all purchases linked to this bill
    const purchasesPath = `/artifacts/${appId}/users/${userId}/purchases`;
    const purchasesQuery = query(collection(db, purchasesPath), where("billId", "==", billId));
    const purchasesSnap = await getDocs(purchasesQuery);

    const uniqueItemsToUpdate = new Map(); // Store { uniqueItemName: countToDecrement }

    for (const purchaseDoc of purchasesSnap.docs) {
        await addDelete(purchaseDoc.ref);
        const purchaseData = purchaseDoc.data();
        const uniqueItemName = purchaseData.name?.trim().toLowerCase();
        if (uniqueItemName) {
            uniqueItemsToUpdate.set(uniqueItemName, (uniqueItemsToUpdate.get(uniqueItemName) || 0) + 1);
        }
    }

    // 2. Decrement counts for associated unique items
    const uniqueItemsPath = `/artifacts/${appId}/users/${userId}/unique_items`;
    for (const [name, count] of uniqueItemsToUpdate.entries()) {
        const uniqueItemRef = doc(db, uniqueItemsPath, name);
        // We decrement. We don't worry about lastPrice/lastPurchaseDate here,
        // as it would require complex queries to find the "next last" purchase.
        batch.update(uniqueItemRef, { purchaseCount: increment(-count) });
        writeCount++;
         if (writeCount >= MAX_WRITES_PER_BATCH -1) { // Leave room for bill delete
             await commitBatch();
         }
    }

    // 3. Delete the bill itself
    const billPath = `/artifacts/${appId}/users/${userId}/bills`;
    const billRef = doc(db, billPath, billId);
    await addDelete(billRef);

    // Commit final batch
    if (writeCount > 0) {
        console.log(`Committing final ${writeCount} deletes for bill ${billId}`);
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
  const profileRef = doc(db, profilePath, userId); // Path to the specific user's profile doc
  try {
    // Fetch all collections and the profile document concurrently
    const [purchasesSnap, uniqueItemsSnap, billsSnap, profileSnap] = await Promise.all([
      getDocs(collection(db, purchasesPath)),
      getDocs(collection(db, uniqueItemsPath)),
      getDocs(collection(db, billsPath)),
      getDoc(profileRef) // Fetch the single profile document
    ]);

    // Prepare data for JSON
    const backupData = {
      profile: profileSnap.exists() ? profileSnap.data() : null, // Get profile data if it exists
      bills: billsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      purchases: purchasesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      unique_items: uniqueItemsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
    };

    // Replacer function to convert Firestore Timestamps to a serializable format
    const replacer = (key, value) => {
       if (value instanceof Timestamp) {
            // Store as an object indicating the type and ISO string value
            return { __datatype__: 'timestamp', value: value.toDate().toISOString() };
       }
       return value;
    };

    // Create JSON string and trigger download
    const jsonString = JSON.stringify(backupData, replacer, 2); // Pretty print with 2 spaces
    const blob = new Blob([jsonString], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const dateStamp = new Date().toISOString().split('T')[0]; // Format as YYYY-MM-DD
    link.download = `pantrypal_backup_${dateStamp}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url); // Clean up the object URL

  } catch (error) {
    console.error("Backup process failed:", error);
    throw new Error("Failed to create backup file.");
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

                // --- REVIVER FUNCTION ---
                 const reviver = (key, value) => {
                    // Check for the format with 'type' and 'seconds'/'nanoseconds'
                    if (value && typeof value === 'object' && value.type === 'firestore/timestamp/1.0' && typeof value.seconds === 'number' && typeof value.nanoseconds === 'number') {
                        try {
                           // Use the imported Timestamp constructor directly
                           return new Timestamp(value.seconds, value.nanoseconds);
                        } catch (e) {
                           console.warn(`Error creating Timestamp from seconds/nanos for key "${key}":`, value, e);
                           return serverTimestamp(); // Fallback to server timestamp on error
                        }
                    }
                    // Keep the check for the ISO string format (from current backups)
                    if (value && typeof value === 'object' && value.__datatype__ === 'timestamp') {
                        const date = new Date(value.value);
                         if (!isNaN(date)) {
                            // Use Timestamp.fromDate for Date objects
                            return Timestamp.fromDate(date);
                         }
                         console.warn(`Invalid date string encountered for key "${key}":`, value.value);
                         return serverTimestamp(); // Fallback
                    }
                    // Return value unchanged if it's not a recognized timestamp format
                    return value;
                };
                // --- END REVIVER FUNCTION ---

                const backupData = JSON.parse(jsonString, reviver);

                // Validate file structure
                if (!backupData || (!backupData.profile && !backupData.bills && !backupData.purchases && !backupData.unique_items)) {
                    throw new Error("Invalid backup file format. Missing expected data sections.");
                }

                const MAX_WRITES_PER_BATCH = 499; // Keep slightly under 500 limit
                let batch = writeBatch(db);
                let writeCount = 0;

                // Helper to commit batches automatically
                const commitBatch = async () => {
                    await batch.commit();
                    batch = writeBatch(db); // Start a new batch
                    writeCount = 0;
                    console.log("Committed batch during restore.");
                };

                 // Helper to add a write operation (set) to the current batch
                 const addWrite = async (docRef, data) => {
                    // Clean data: Remove undefined properties before setting
                     const cleanData = Object.entries(data).reduce((acc, [key, val]) => {
                         if (val !== undefined) {
                             acc[key] = val;
                         }
                         return acc;
                     }, {});

                    batch.set(docRef, cleanData); // Use set for overwriting existing docs
                    writeCount++;
                    // Commit if the batch is full
                    if (writeCount >= MAX_WRITES_PER_BATCH) {
                        await commitBatch();
                    }
                };

                // Restore Profile
                if (backupData.profile) {
                     const profilePath = `/artifacts/${appId}/users/${userId}/profile`;
                     const profileRef = doc(db, profilePath, userId); // Profile doc ID is the userId
                     await addWrite(profileRef, backupData.profile);
                }

                // Restore Bills
                if (backupData.bills && Array.isArray(backupData.bills)) {
                     const billsPath = `/artifacts/${appId}/users/${userId}/bills`;
                     for (const bill of backupData.bills) {
                         // Ensure bill has an ID before proceeding
                         if (!bill.id) {
                             console.warn("Skipping bill without ID:", bill);
                             continue;
                         }
                         const billRef = doc(db, billsPath, bill.id); // Use the ID from backup
                         const { id, ...billDocData } = bill; // Exclude the ID from the data payload
                         await addWrite(billRef, billDocData);
                     }
                }

                // Restore Purchases
                if (backupData.purchases && Array.isArray(backupData.purchases)) {
                    const purchasesPath = `/artifacts/${appId}/users/${userId}/purchases`;
                    for (const purchase of backupData.purchases) {
                         if (!purchase.id) {
                              console.warn("Skipping purchase without ID:", purchase);
                              continue;
                         };
                         const purchaseRef = doc(db, purchasesPath, purchase.id);
                         const { id, ...purchaseDocData } = purchase;
                         await addWrite(purchaseRef, purchaseDocData);
                    }
                }

                // Restore Unique Items
                if (backupData.unique_items && Array.isArray(backupData.unique_items)) {
                    const uniqueItemsPath = `/artifacts/${appId}/users/${userId}/unique_items`;
                     for (const item of backupData.unique_items) {
                         if (!item.id) {
                              console.warn("Skipping unique_item without ID:", item);
                              continue;
                         };
                         const itemRef = doc(db, uniqueItemsPath, item.id); // Unique item ID is the lowercased name
                         const { id, ...itemDocData } = item;
                         await addWrite(itemRef, itemDocData);
                     }
                }

                // Commit any remaining writes in the last batch
                if (writeCount > 0) {
                     console.log(`Committing final ${writeCount} writes...`);
                     await batch.commit();
                }

                resolve(); // Resolve the promise indicating success

            } catch (error) {
                console.error("Restore process failed:", error);
                reject(new Error(`Failed to parse or restore data: ${error.message}`));
            }
        };
        reader.onerror = (error) => {
            console.error("Error reading file:", error);
            reject(new Error("Failed to read the backup file."));
        };
        // Start reading the file as text
        reader.readAsText(file);
    });
};


// --- Export CSV Function ---
export const handleExportCSV = (purchases, selectedMonth) => {
    if (!purchases || purchases.length === 0) {
      toast.error("No purchase data available for the selected month to export.");
      return;
    }
    try {
      // Define CSV headers
      const headers = ['Date', 'Item', 'Category', 'Quantity', 'Unit', 'Price'];

      // Map purchase data to CSV rows
      const rows = purchases.map(item => {
        // Helper function to escape CSV special characters (comma, double quote, newline)
        const escapeCSV = (value) => {
            if (value === null || value === undefined) return '';
            let str = String(value);
            // If the string contains comma, double quote, or newline, enclose in double quotes
            // and escape existing double quotes by doubling them
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                str = `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };

        // Format each field for the CSV row
        return [
          escapeCSV(formatDate(item.purchaseDate)), // Format date using util function
          escapeCSV(item.displayName),
          escapeCSV(item.category),
          escapeCSV(item.quantity),
          escapeCSV(item.unit),
          String(item.price || 0) // Ensure price is a string, handle null/undefined
        ].join(','); // Join fields with commas
      });

      // Combine headers and rows, separated by newlines
      const csvContent = [headers.join(','), ...rows].join('\n');

      // Create a Blob and trigger download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `pantrypal_report_${selectedMonth}.csv`; // Dynamic filename
      document.body.appendChild(link);
      link.click(); // Programmatically click the link to trigger download
      document.body.removeChild(link); // Clean up the link element
      URL.revokeObjectURL(url); // Clean up the object URL
      toast.success("Report exported successfully!");

    } catch (error) {
      console.error("CSV Export failed:", error);
      toast.error(`CSV Export failed: ${error.message}`);
    }
};