// --- Currency Formatter ---
export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return '';
  // Using INR locale for Rupee symbol and formatting
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};


// --- Date Formatter ---
export const formatDate = (date) => {
    if (!date) return 'N/A';
    // Handle both Firebase Timestamps and Date objects/strings
    const dateObj = date?.toDate ? date.toDate() : date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj)) return 'Invalid Date';

    // Custom formatting to get "25th October 2025" style
    const day = dateObj.getDate();
    const month = dateObj.toLocaleDateString('en-GB', { month: 'long' });
    const year = dateObj.getFullYear();

    let daySuffix = 'th';
    if (day === 1 || day === 21 || day === 31) daySuffix = 'st';
    else if (day === 2 || day === 22) daySuffix = 'nd';
    else if (day === 3 || day === 23) daySuffix = 'rd';

    return `${day}${daySuffix} ${month} ${year}`;
};


// --- Time Ago Formatter ---
// Helper function to format dates as "X days ago"
export const timeAgo = (date) => {
  if (!date) return "N/A";
  const now = new Date();
  // Ensure we're working with a JS Date object
  const dateObj = date?.toDate ? date.toDate() : date instanceof Date ? date : new Date(date);
  if (isNaN(dateObj)) return 'Invalid Date';
  
  const seconds = Math.floor((now - dateObj) / 1000);
  
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";
  return "Just now";
};

