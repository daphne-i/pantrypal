import {
  writeBatch,
  doc,
  collection,
  serverTimestamp,
  increment,
  Timestamp, // Import Timestamp
  getDocs,   // Import getDocs
  query,     // Import query
  where,     // Import where
  addDoc     // Import addDoc
} from "firebase/firestore";
import { db } from "./firebaseConfig";

/**
 * Saves a new Bill entry.
 * Returns the ID of the newly created bill document.
 */
export const handleSaveBill = async (billData, userId, appId) => {
  if (!userId || !appId) {
    throw new Error("User or App ID is missing.");
  }

  const { shopName, purchaseDate, totalBill } = billData;

  const billsPath = `/artifacts/${appId}/users/${userId}/bills`;
  const billCollectionRef = collection(db, billsPath);

  const docRef = await addDoc(billCollectionRef, {
    shopName: shopName.trim(),
    purchaseDate: Timestamp.fromDate(new Date(purchaseDate)), // Store as Timestamp
    totalBill: totalBill !== null ? parseFloat(totalBill) : null,
    itemCount: 0, // Initialize item count
    createdAt: serverTimestamp(),
    userId: userId,
  });

  return docRef.id; // Return the new Bill ID
};


/**
 * Saves multiple purchase items associated with a specific bill ID
 * using a batch write. Updates 'purchases' and 'unique_items'.
 */
export const handleSaveItems = async (items, billId, userId, appId) => {
  if (!userId || !appId || !billId || !items || items.length === 0) {
    throw new Error("Missing required data for saving items.");
  }

  const batch = writeBatch(db);
  const purchasesPath = `/artifacts/${appId}/users/${userId}/purchases`;
  const uniqueItemsPath = `/artifacts/${appId}/users/${userId}/unique_items`;
  const billRef = doc(db, `/artifacts/${appId}/users/${userId}/bills`, billId);

  items.forEach((item) => {
    // 1. Create ref for the new purchase item document
    const newItemRef = doc(collection(db, purchasesPath));

    // 2. Set the new purchase item document data
    batch.set(newItemRef, {
      billId: billId, // Link to the bill
      name: item.name.trim().toLowerCase(),
      displayName: item.name.trim(),
      price: parseFloat(item.price),
      category: item.category,
      quantity: parseFloat(item.quantity) || 1, // Default quantity to 1 if not provided/invalid
      unit: item.unit,
      purchaseDate: item.purchaseDate || serverTimestamp(), // Use bill date or server time
      userId: userId,
    });

    // 3. Create ref for the unique_item document
    const uniqueItemRef = doc(db, uniqueItemsPath, item.name.trim().toLowerCase());

    // 4. Set/update the unique_item document
    batch.set(
      uniqueItemRef,
      {
        name: item.name.trim().toLowerCase(),
        displayName: item.name.trim(),
        category: item.category,
        lastPurchaseDate: item.purchaseDate || serverTimestamp(),
        purchaseCount: increment(1),
        // We could also track last price, unit, quantity here if needed
      },
      { merge: true }
    );
  });

  // 5. Update the item count on the bill document
  batch.update(billRef, {
      itemCount: increment(items.length)
  });


  // 6. Commit the batch
  await batch.commit();
};


// --- Backup Function ---
export const handleBackupData = async (userId, appId) => {
    if (!userId || !appId) {
        throw new Error("User or App ID is missing.");
    }
    console.log("Starting backup for user:", userId, "app:", appId);

    const backupData = {
        profile: null,
        bills: [],
        purchases: [],
        unique_items: [],
        backupDate: new Date().toISOString(),
        appVersion: "1.0.0" // Example versioning
    };

    try {
        // Fetch Profile
        const profileRef = doc(db, `artifacts/${appId}/users/${userId}/profile`, userId);
        const profileSnap = await getDoc(profileRef);
        if (profileSnap.exists()) {
            backupData.profile = profileSnap.data();
            console.log("Profile data fetched.");
        } else {
            console.log("No profile data found.");
        }

        // Fetch Bills
        const billsPath = `artifacts/${appId}/users/${userId}/bills`;
        const billsQuery = query(collection(db, billsPath));
        const billsSnapshot = await getDocs(billsQuery);
        billsSnapshot.forEach(doc => backupData.bills.push({ id: doc.id, ...doc.data() }));
        console.log(`Fetched ${backupData.bills.length} bills.`);

        // Fetch Purchases
        const purchasesPath = `artifacts/${appId}/users/${userId}/purchases`;
        const purchasesQuery = query(collection(db, purchasesPath));
        const purchasesSnapshot = await getDocs(purchasesQuery);
        purchasesSnapshot.forEach(doc => backupData.purchases.push({ id: doc.id, ...doc.data() }));
        console.log(`Fetched ${backupData.purchases.length} purchases.`);

        // Fetch Unique Items
        const uniqueItemsPath = `artifacts/${appId}/users/${userId}/unique_items`;
        const uniqueItemsQuery = query(collection(db, uniqueItemsPath));
        const uniqueItemsSnapshot = await getDocs(uniqueItemsQuery);
        uniqueItemsSnapshot.forEach(doc => backupData.unique_items.push({ id: doc.id, ...doc.data() }));
        console.log(`Fetched ${backupData.unique_items.length} unique items.`);

        // Convert Timestamps to ISO strings for JSON compatibility
        const replacer = (key, value) => {
            if (value instanceof Timestamp) {
                return value.toDate().toISOString();
            }
            return value;
        };
        const jsonString = JSON.stringify(backupData, replacer, 2); // Pretty print JSON

        // Trigger download
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pantrypal_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        console.log("Backup download triggered.");

    } catch (error) {
        console.error("Error during backup:", error);
        throw error; // Re-throw to be caught by the calling component
    }
};


// --- Restore Function ---
const MAX_BATCH_OPERATIONS = 499; // Firestore batch limit is 500, keep a small buffer

export const handleRestoreData = async (file, userId, appId) => {
     if (!userId || !appId || !file) {
        throw new Error("User ID, App ID, or file is missing.");
    }
    console.log("Starting restore...");

    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = async (event) => {
            try {
                const jsonString = event.target?.result;
                if (typeof jsonString !== 'string') {
                    throw new Error("Failed to read file content.");
                }

                console.log("File read successfully.");
                const backupData = JSON.parse(jsonString);

                // Basic validation
                if (!backupData || typeof backupData !== 'object' || !backupData.backupDate) {
                     throw new Error("Invalid backup file format.");
                }
                console.log("Backup data parsed. Backup date:", backupData.backupDate);

                // --- Start Batch Writes ---
                // NOTE: This overwrites existing data. A more robust solution might
                // check for existing IDs or offer merging, but for simplicity, we overwrite.

                let batches = [];
                let currentBatch = writeBatch(db);
                let operationCount = 0;

                const addOperationToBatch = (operationFn) => {
                    operationFn(currentBatch);
                    operationCount++;
                    if (operationCount >= MAX_BATCH_OPERATIONS) {
                        batches.push(currentBatch);
                        currentBatch = writeBatch(db);
                        operationCount = 0;
                        console.log("Batch limit reached, starting new batch.");
                    }
                };

                 // Restore Profile (if exists in backup)
                 if (backupData.profile) {
                     const profileRef = doc(db, `artifacts/${appId}/users/${userId}/profile`, userId);
                     const profileData = { ...backupData.profile };
                     // Convert potential ISO date strings back to Timestamps if needed
                     // Example: if (profileData.someDateField) profileData.someDateField = Timestamp.fromDate(new Date(profileData.someDateField));
                     addOperationToBatch(batch => batch.set(profileRef, profileData, { merge: true })); // Use merge to be safe
                     console.log("Profile restore operation added to batch.");
                 }

                // Restore Bills
                if (backupData.bills && Array.isArray(backupData.bills)) {
                     const billsPath = `artifacts/${appId}/users/${userId}/bills`;
                     backupData.bills.forEach(bill => {
                         const billRef = doc(db, billsPath, bill.id); // Use original ID
                         const billData = { ...bill };
                         delete billData.id; // Don't save the ID within the document data
                         if (billData.purchaseDate) billData.purchaseDate = Timestamp.fromDate(new Date(billData.purchaseDate));
                         if (billData.createdAt) billData.createdAt = Timestamp.fromDate(new Date(billData.createdAt));
                         addOperationToBatch(batch => batch.set(billRef, billData));
                     });
                     console.log(`Added ${backupData.bills.length} bill restore operations.`);
                }

                // Restore Purchases
                if (backupData.purchases && Array.isArray(backupData.purchases)) {
                    const purchasesPath = `artifacts/${appId}/users/${userId}/purchases`;
                    backupData.purchases.forEach(purchase => {
                        const purchaseRef = doc(db, purchasesPath, purchase.id); // Use original ID
                        const purchaseData = { ...purchase };
                        delete purchaseData.id;
                        if (purchaseData.purchaseDate) purchaseData.purchaseDate = Timestamp.fromDate(new Date(purchaseData.purchaseDate));
                         addOperationToBatch(batch => batch.set(purchaseRef, purchaseData));
                    });
                     console.log(`Added ${backupData.purchases.length} purchase restore operations.`);
                }

                // Restore Unique Items
                if (backupData.unique_items && Array.isArray(backupData.unique_items)) {
                    const uniqueItemsPath = `artifacts/${appId}/users/${userId}/unique_items`;
                     backupData.unique_items.forEach(item => {
                         const itemRef = doc(db, uniqueItemsPath, item.id); // Use original ID (lowercase name)
                         const itemData = { ...item };
                         delete itemData.id;
                         if (itemData.lastPurchaseDate) itemData.lastPurchaseDate = Timestamp.fromDate(new Date(itemData.lastPurchaseDate));
                         addOperationToBatch(batch => batch.set(itemRef, itemData));
                     });
                      console.log(`Added ${backupData.unique_items.length} unique item restore operations.`);
                }

                // Add the last batch if it has operations
                if (operationCount > 0) {
                    batches.push(currentBatch);
                }

                console.log(`Committing ${batches.length} batch(es)...`);
                // Commit all batches sequentially
                for (const batch of batches) {
                    await batch.commit();
                }

                console.log("Restore completed successfully.");
                resolve(); // Indicate success

            } catch (error) {
                console.error("Error processing or restoring backup:", error);
                reject(error); // Indicate failure
            }
        };

        reader.onerror = (error) => {
             console.error("Error reading file:", error);
             reject(new Error("Failed to read the backup file."));
        };

        reader.readAsText(file); // Start reading the file
    });
};


// --- CSV Export Utility ---
export const downloadCSV = (data, filename = 'report.csv') => {
    if (!data || data.length === 0) {
        console.warn("No data provided for CSV export.");
        return false; // Indicate failure or no data
    }

    try {
        // Define CSV headers based on purchase item fields
        const headers = ['Date', 'Item Name', 'Category', 'Price', 'Quantity', 'Unit', 'Bill ID'];
        const csvRows = [headers.join(',')]; // Header row

        // Convert each purchase object to a CSV row
        data.forEach(item => {
            const date = item.purchaseDate?.toDate ? item.purchaseDate.toDate().toLocaleDateString() : 'N/A';
            // Escape commas within fields by enclosing in double quotes
            const name = `"${item.displayName?.replace(/"/g, '""') || ''}"`;
            const category = `"${item.category || 'Other'}"`;
            const price = item.price?.toFixed(2) || '0.00';
            const quantity = item.quantity || '';
            const unit = `"${item.unit || ''}"`;
            const billId = `"${item.billId || ''}"`; // Include Bill ID

            csvRows.push([date, name, category, price, quantity, unit, billId].join(','));
        });

        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return true; // Indicate success
    } catch (error) {
        console.error("Error generating CSV:", error);
        // Removed alert, component should handle feedback
        return false; // Indicate failure
    }
};

