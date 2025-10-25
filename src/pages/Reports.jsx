import React, { useState, useMemo } from "react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../hooks/useAuth";
import { useCollection } from "../hooks/useCollection";
import { handleExportCSV } from "../firebaseUtils"; // Import CSV handler
import { formatCurrency, formatDate } from '../utils'; // Import formatters
import { Loader2, Info, Download, Calendar } from "lucide-react";
import { Timestamp } from "firebase/firestore"; // Import Timestamp for querying

// --- Helper Components ---
const EmptyState = ({ message }) => (
    <div className="flex flex-col items-center justify-center text-center text-text-secondary py-10">
        <Info size={32} className="mb-2 opacity-50" />
        <p>{message}</p>
    </div>
);
const LoadingSpinner = () => (
    <div className="flex justify-center items-center py-10">
        <Loader2 size={24} className="animate-spin text-icon opacity-70" />
    </div>
);
// --- End Helper Components ---

// Helper to get default YYYY-MM string for the input
const getDefaultMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0'); // "01", "02", ..., "12"
    return `${year}-${month}`;
};

// --- REMOVED openAddItemsToBill prop ---
export const Reports = () => {
  const { theme } = useTheme();
  const { userId, appId } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(getDefaultMonth()); // e.g., "2025-10"

  // Calculate query range based on selectedMonth
  const { start, end, monthString } = useMemo(() => {
    if (!selectedMonth) return { start: null, end: null, monthString: '' };

    const [year, month] = selectedMonth.split('-').map(Number);
    
    // Start of the selected month (e.g., 2025-10-01 at 00:00:00)
    const startDate = Timestamp.fromDate(new Date(year, month - 1, 1));
    
    // Start of the *next* month (e.g., 2025-11-01 at 00:00:00)
    const endDate = Timestamp.fromDate(new Date(year, month, 1)); 

    const monthDisplay = new Date(year, month - 1, 1)
        .toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    return { start: startDate, end: endDate, monthString: monthDisplay };
  }, [selectedMonth]);

  // Fetch purchases for the selected month
  const {
    data: purchases,
    isLoading,
    error,
  } = useCollection(
    // Only run query if all parameters are available
    userId && appId && start && end
      ? `artifacts/${appId}/users/${userId}/purchases`
      : null,
    {
      whereClauses: [
        ["purchaseDate", ">=", start], // All purchases on or after start of month
        ["purchaseDate", "<", end],   // All purchases *before* start of next month
      ],
      orderByClauses: [["purchaseDate", "desc"]], // Order by date
    }
  );

  // Calculate total for the fetched purchases
  const totalForMonth = useMemo(() => {
    if (!purchases) return 0;
    return purchases.reduce((sum, item) => sum + (item.price || 0), 0);
  }, [purchases]);

  const onExportClick = () => {
      handleExportCSV(purchases, selectedMonth);
  };


  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Monthly Reports</h1>

      {/* Filter and Export Section */}
      <div className={`p-4 rounded-2xl bg-glass border border-border shadow-lg flex flex-col sm:flex-row justify-between items-center gap-4`}>
          <div className="flex items-center gap-2">
            <label htmlFor="month-select" className="font-medium text-sm sm:text-base">Select Month:</label>
            <input
              type="month"
              id="month-select"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="p-2 rounded-md bg-input border border-border focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </div>
          <button
            onClick={onExportClick}
            disabled={isLoading || !purchases || purchases.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-primary text-primary-text primary-hover transition-colors disabled:opacity-50 w-full sm:w-auto"
          >
            <Download size={18} />
            Export CSV
          </button>
      </div>

      {/* Report Table Section */}
       <div className={`rounded-2xl bg-glass border border-border shadow-lg overflow-hidden`}>
          <div className="p-4 border-b border-border">
             <h2 className="text-lg font-semibold">Purchases for {monthString}</h2>
             {!isLoading && !error && purchases && (
                <p className="text-sm text-text-secondary">
                    Total: {formatCurrency(totalForMonth)} ({purchases.length} items)
                </p>
             )}
          </div>
          
          <div className="max-h-[60vh] overflow-y-auto">
            {isLoading && <LoadingSpinner />}
            {error && (
                <div className="p-4">
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
                        <strong>Error:</strong> Failed to load report data. {error.message}
                    </div>
                </div>
            )}
            {!isLoading && !error && purchases && purchases.length > 0 ? (
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-glass border-b border-border">
                  <tr>
                    <th className="p-4 text-sm font-semibold">Date</th>
                    <th className="p-4 text-sm font-semibold">Item</th>
                    <th className="p-4 text-sm font-semibold">Category</th>
                    <th className="p-4 text-sm font-semibold">Qty</th>
                    <th className="p-4 text-sm font-semibold text-right">Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {purchases.map((item) => (
                    // --- **MODIFIED**: Removed onClick handler and cursor ---
                    <tr
                      key={item.id}
                      className="hover:bg-black/5 dark:hover:bg-white/5"
                    >
                      <td className="p-4 text-sm">{formatDate(item.purchaseDate)}</td>
                      <td className="p-4 font-medium">{item.displayName}</td>
                      <td className="p-4 text-sm">{item.category}</td>
                      <td className="p-4 text-sm">{item.quantity} {item.unit}</td>
                      <td className="p-4 text-sm font-medium text-right">{formatCurrency(item.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              !isLoading && !error && <EmptyState message="No purchases found for this month." />
            )}
          </div>
       </div>
    </div>
  );
};

