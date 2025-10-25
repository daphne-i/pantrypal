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
 */
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


/**
 * Converts an array of objects to CSV format and triggers download.
 * @param {Array<object>} data The array of objects to convert.
 * @param {string} filename The desired filename for the downloaded CSV.
 */
export const downloadCSV = (data, filename = 'export.csv') => {
  if (!data || data.length === 0) {
    console.error("No data provided for CSV export.");
    return;
  }

  // Define explicit headers for better control, excluding userId maybe
  const headers = ['purchaseDate', 'displayName', 'category', 'price', 'name', 'id'];
  const headerString = headers.join(',');

  // Convert array of objects to CSV string rows
  const csvRows = data.map(row =>
    headers.map(fieldName => {
      let value = row[fieldName];
      // Handle potential undefined or null values
      if (value === undefined || value === null) {
          value = '';
      }
      // Convert value to string
      let stringValue = String(value);
      // Escape quotes by doubling them and wrap in quotes if value contains comma, quote, or newline
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
  if (link.download !== undefined) { // Feature detection
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url); // Clean up
  } else {
    // Fallback for older browsers
    alert("CSV download is not supported in this browser.");
  }
};

// handleBackupData and handleRestoreData can be added here in Sprint 3

