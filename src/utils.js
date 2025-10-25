// src/utils.js

/**
 * Formats a number as Indian Rupees (₹).
 * @param {number | null | undefined} amount - The amount to format.
 * @returns {string} Formatted currency string (e.g., "₹5,000.00") or empty string if amount is invalid.
 */
export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined || isNaN(Number(amount))) return '';
  // Using INR locale for Rupee symbol and Indian number formatting
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Formats a Firestore Timestamp or Date object into "25th October 2025" style.
 * @param {object | Date | null | undefined} date - The Firestore Timestamp or Date object.
 * @returns {string} Formatted date string or 'N/A'/'Invalid Date'.
 */
export const formatDate = (date) => {
    if (!date) return 'N/A';

    // Convert Firestore Timestamp to JS Date if necessary
    const dateObj = date?.toDate ? date.toDate() : date instanceof Date ? date : new Date(date);

    // Check if the resulting date is valid
    if (isNaN(dateObj)) return 'Invalid Date';

    // Custom formatting to get "25th October 2025" style
    const day = dateObj.getDate();
    const month = dateObj.toLocaleDateString('en-GB', { month: 'long' }); // 'en-GB' often gives full month name
    const year = dateObj.getFullYear();

    // Determine the day suffix (st, nd, rd, th)
    let daySuffix = 'th';
    if (day === 1 || day === 21 || day === 31) daySuffix = 'st';
    else if (day === 2 || day === 22) daySuffix = 'nd';
    else if (day === 3 || day === 23) daySuffix = 'rd';

    return `${day}${daySuffix} ${month} ${year}`;
};
