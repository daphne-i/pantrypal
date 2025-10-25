import {
  writeBatch,
  doc,
  collection,
  serverTimestamp,
  increment,
  getDocs,
  getDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebaseConfig";

// --- handleSavePurchase ---
export const handleSavePurchase = async (itemData, userId, appId) => {
  if (!userId || !appId) {
    throw new Error("User or App ID is missing.");
  }

  const { name, price, category } = itemData;

  // 1. Get a new write batch
  const batch = writeBatch(db);

  // 2. Create a ref for the new purchase document
  const purchasesPath = `/artifacts/${appId}/users/${userId}/purchases`;
  const newItemRef = doc(collection(db, purchasesPath));

  // 3. Set the new purchase document data
  batch.set(newItemRef, {
    name: name.trim().toLowerCase(),
    displayName: name.trim(),
    price: parseFloat(price),
    category: category,
    purchaseDate: serverTimestamp(),
    userId: userId,
  });

  // 4. Create a ref for the unique_item document
  const uniqueItemsPath = `/artifacts/${appId}/users/${userId}/unique_items`;
  const uniqueItemRef = doc(db, uniqueItemsPath, name.trim().toLowerCase());

  // 5. Set/update the unique_item document
  batch.set(
    uniqueItemRef,
    {
      name: name.trim().toLowerCase(),
      displayName: name.trim(),
      category: category,
      lastPurchaseDate: serverTimestamp(),
      purchaseCount: increment(1),
    },
    { merge: true }
  );

  // 6. Commit the batch
  await batch.commit();
};


// --- downloadCSV ---
export const downloadCSV = (data, filename = 'export.csv') => {
  if (!data || data.length === 0) {
    console.error("No data provided for CSV export.");
    // Let the calling component handle the feedback
    // alert("No data available to export for the selected month.");
    return false; // Indicate failure
  }

  // Define explicit headers
  const headers = ['purchaseDate', 'displayName', 'category', 'price', 'name', 'id'];
  const headerString = headers.join(',');

  // Convert array of objects to CSV string rows
  const csvRows = data.map(row =>
    headers.map(fieldName => {
      let value = row[fieldName];
       // Handle Timestamps specifically
      if (value instanceof Timestamp) {
         value = value.toDate().toLocaleString(); // Format date nicely
       }
      if (value === undefined || value === null) {
          value = '';
      }
      let stringValue = String(value);
      // Escape quotes and handle commas/newlines
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          stringValue = `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    }).join(',')
  );

  // Combine header and rows
  const csvString = [headerString, ...csvRows].join('\n');

  // Create a Blob and trigger download
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true; // Indicate success
  } else {
    console.error("CSV download is not supported in this browser.");
    // Let the calling component handle the feedback
    // alert("CSV download is not supported in this browser.");
    return false; // Indicate failure
  }
};


// --- handleBackupData ---
export const handleBackupData = async (userId, appId) => {
  if (!userId || !appId) {
    throw new Error("User or App ID is missing for backup.");
  }

  const dbPath = `/artifacts/${appId}/users/${userId}`;

  try {
    // 1. Fetch all purchases
    const purchasesRef = collection(db, `${dbPath}/purchases`);
    const purchasesSnapshot = await getDocs(purchasesRef);
    const purchases = purchasesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // 2. Fetch all unique items
    const uniqueItemsRef = collection(db, `${dbPath}/unique_items`);
    const uniqueItemsSnapshot = await getDocs(uniqueItemsRef);
    const unique_items = uniqueItemsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // 3. Fetch the user profile
    const profileRef = doc(db, `${dbPath}/profile`, userId);
    const profileSnapshot = await getDoc(profileRef);
    const profile = profileSnapshot.exists() ? { id: profileSnapshot.id, ...profileSnapshot.data() } : {};

    // 4. Combine into a single object
    const backupData = {
      profile: profile,
      purchases: purchases,
      unique_items: unique_items,
      backupDate: new Date().toISOString(),
    };

    // 5. Convert Timestamps to ISO strings
    const replacer = (key, value) => {
       if (value instanceof Timestamp) {
         return value.toDate().toISOString();
       }
       return value;
    };
    const jsonString = JSON.stringify(backupData, replacer, 2);

    // 6. Create a virtual link and trigger download
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `PantryPal_Backup_${new Date().toISOString().split('T')[0]}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

  } catch (error) {
    console.error("Error creating backup:", error);
    throw error;
  }
};


// --- handleRestoreData ---
export const handleRestoreData = async (file, userId, appId) => {
  if (!userId || !appId) {
    throw new Error("User or App ID is missing for restore.");
  }
  if (!file) {
      throw new Error("No file selected for restore.");
  }

  const dbPath = `/artifacts/${appId}/users/${userId}`;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const jsonString = event.target.result;
        const backupData = JSON.parse(jsonString);

        if (!backupData || typeof backupData !== 'object' || !backupData.purchases || !backupData.unique_items || !backupData.profile) {
            throw new Error("Invalid backup file format.");
        }

        const MAX_BATCH_OPERATIONS = 498;
        const batches = [];
        let currentBatch = writeBatch(db);
        let currentBatchCount = 0;

        const addToBatch = (operation) => {
            operation(currentBatch);
            currentBatchCount++;
            if (currentBatchCount >= MAX_BATCH_OPERATIONS) {
                batches.push(currentBatch);
                currentBatch = writeBatch(db);
                currentBatchCount = 0;
            }
        };

        // 1. Restore Profile
        if (backupData.profile && backupData.profile.id === userId) {
            const profileRef = doc(db, `${dbPath}/profile`, userId);
            const profileData = { ...backupData.profile };
            delete profileData.id;
            // Convert ISO date strings back to Timestamps if profile has dates
            // Example:
            // if (profileData.createdAt && typeof profileData.createdAt === 'string') {
            //   profileData.createdAt = Timestamp.fromDate(new Date(profileData.createdAt));
            // }
            addToBatch(batch => batch.set(profileRef, profileData));
        } else {
            // Log a warning but don't stop the whole restore
            console.warn("Profile data in backup missing or ID mismatch. Skipping profile restore.");
        }

        // TODO: Decide on deletion strategy. Current strategy overwrites/merges.
        // To fully replace, you'd need to fetch all current doc IDs and delete them first.

        // 2. Restore Purchases
        for (const item of backupData.purchases) {
            // Skip if essential data is missing (adjust validation as needed)
            if (!item.id || !item.displayName || item.price === undefined || !item.category) {
                console.warn("Skipping invalid purchase item in backup:", item);
                continue;
            }
            const itemRef = doc(db, `${dbPath}/purchases`, item.id);
            const itemData = { ...item };
            delete itemData.id;
            // Ensure date conversion happens correctly
            if (itemData.purchaseDate && typeof itemData.purchaseDate === 'string') {
               try {
                   itemData.purchaseDate = Timestamp.fromDate(new Date(itemData.purchaseDate));
               } catch (dateError) {
                   console.warn(`Invalid purchaseDate format for item ${item.id}, setting to now:`, itemData.purchaseDate, dateError);
                   itemData.purchaseDate = serverTimestamp(); // Fallback
               }
            } else if (!itemData.purchaseDate) {
                 itemData.purchaseDate = serverTimestamp(); // Fallback if missing
            }
            addToBatch(batch => batch.set(itemRef, itemData));
        }

        // 3. Restore Unique Items
        for (const item of backupData.unique_items) {
             // Skip if essential data is missing (adjust validation as needed)
             if (!item.id || !item.displayName || !item.category || item.purchaseCount === undefined) {
                 console.warn("Skipping invalid unique_item in backup:", item);
                 continue;
             }
             const itemRef = doc(db, `${dbPath}/unique_items`, item.id);
             const itemData = { ...item };
             delete itemData.id;
             // Ensure date conversion happens correctly
             if (itemData.lastPurchaseDate && typeof itemData.lastPurchaseDate === 'string') {
                try {
                    itemData.lastPurchaseDate = Timestamp.fromDate(new Date(itemData.lastPurchaseDate));
                } catch (dateError) {
                    console.warn(`Invalid lastPurchaseDate format for unique_item ${item.id}, setting to now:`, itemData.lastPurchaseDate, dateError);
                    itemData.lastPurchaseDate = serverTimestamp(); // Fallback
                }
             } else if (!itemData.lastPurchaseDate) {
                 itemData.lastPurchaseDate = serverTimestamp(); // Fallback if missing
             }
             // Ensure purchaseCount is a number
             if (typeof itemData.purchaseCount !== 'number' || isNaN(itemData.purchaseCount)) {
                 itemData.purchaseCount = 1; // Default to 1 if invalid
             }

            addToBatch(batch => batch.set(itemRef, itemData));
        }

        if (currentBatchCount > 0) {
            batches.push(currentBatch);
        }

        // 4. Commit all batches
        console.log(`Starting restore with ${batches.length} batch(es)...`);
        for (let i = 0; i < batches.length; i++) {
            console.log(`Committing batch ${i + 1} of ${batches.length}`);
            await batches[i].commit();
        }

        console.log("Restore completed successfully.");
        resolve();

      } catch (error) {
        console.error("Error during restore process:", error);
        // Provide a more specific error message if possible
        if (error instanceof SyntaxError) {
             reject(new Error("Failed to parse backup file. Ensure it's valid JSON."));
        } else {
             reject(error);
        }
      }
    };

    reader.onerror = (error) => {
        console.error("Error reading file:", error);
        reject(new Error("Failed to read the backup file."));
    };

    reader.readAsText(file);
  });
};

