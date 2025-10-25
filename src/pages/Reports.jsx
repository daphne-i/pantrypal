import React, { useState, useMemo } from "react";
import toast from 'react-hot-toast';
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../hooks/useAuth";
import { useCollection } from "../hooks/useCollection";
import { downloadCSV } from "../firebaseUtils"; // <-- Import CSV utility
import { Loader2, Download, ChevronLeft, ChevronRight, Info } from "lucide-react"; // <-- Added icons

// Helper function to get the start and end of a given month
const getMonthBounds = (year, month) => {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999); // End of the last day
  return { start, end };
};

// Simple component for empty states
const EmptyState = ({ message }) => (
    <div className="flex flex-col items-center justify-center text-center text-text-secondary py-10">
        <Info size={32} className="mb-2 opacity-50" />
        <p>{message}</p>
    </div>
);

export const Reports = () => {
  const { theme } = useTheme();
  const { userId, appId } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); // 0-indexed (0 = January)

  // Calculate month bounds for the query
  const { start: startOfMonth, end: endOfMonth } = useMemo(
    () => getMonthBounds(currentYear, currentMonth),
    [currentYear, currentMonth]
  );

  // Format month name for display
  const monthName = useMemo(
    () => currentDate.toLocaleString('default', { month: 'long', year: 'numeric' }),
    [currentDate]
  );

  // Fetch purchases for the selected month
  const {
    data: purchases,
    isLoading,
    error,
  } = useCollection(
    userId && appId ? `artifacts/${appId}/users/${userId}/purchases` : null,
    {
      whereClauses: [
        ["purchaseDate", ">=", startOfMonth],
        ["purchaseDate", "<=", endOfMonth],
      ],
      orderByClauses: [["purchaseDate", "desc"]], // Keep latest first for display
    }
  );

  // Calculate total spend for the selected month
  const totalSpend = useMemo(() => {
    return purchases
      ? purchases.reduce((sum, item) => sum + item.price, 0)
      : 0;
  }, [purchases]);

  // Handle month navigation
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 15)); // Go to middle of prev month
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 15)); // Go to middle of next month
  };

  // Check if next month is in the future
  const isFutureMonth = useMemo(() => {
     const nextMonthStart = new Date(currentYear, currentMonth + 1, 1);
     return nextMonthStart > new Date();
  }, [currentYear, currentMonth]);


   // Handle CSV Export
   const handleExport = () => {
       const filename = `PantryPal_Report_${currentYear}_${String(currentMonth + 1).padStart(2, '0')}.csv`;
       const success = downloadCSV(purchases, filename);
       if (success) {
           toast.success("CSV export started.");
       } else if (purchases && purchases.length === 0) {
           toast.error("No data available to export for this month.");
       } else {
           toast.error("CSV export failed. See console for details.");
       }
   };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Monthly Reports</h1>

      {/* Month Navigator and Export Button */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-4 rounded-lg bg-input border border-border">
          <div className="flex items-center gap-2">
               <button
                 onClick={goToPreviousMonth}
                 className="p-2 rounded-md hover:bg-black/10 dark:hover:bg-white/10"
                 aria-label="Previous Month"
               >
                 <ChevronLeft size={20} />
               </button>
               <span className="font-semibold text-lg w-36 text-center">{monthName}</span>
               <button
                  onClick={goToNextMonth}
                  disabled={isFutureMonth} // Disable if next month is in the future
                  className="p-2 rounded-md hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Next Month"
               >
                  <ChevronRight size={20} />
                </button>
           </div>
           <button
             onClick={handleExport}
             disabled={isLoading || !purchases || purchases.length === 0}
             className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-primary text-primary-text primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
           >
              <Download size={18} />
              Export CSV
            </button>
      </div>


      {/* Report Summary */}
      <div
        className={`p-6 rounded-2xl bg-glass border border-border shadow-lg`}
      >
        <h2 className="text-xl font-semibold mb-4">Summary for {monthName}</h2>
        {isLoading && (
          <div className="flex justify-center items-center h-48">
            <Loader2 size={32} className="animate-spin text-icon" />
          </div>
        )}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
            <strong>Error:</strong> Failed to load report data. Check console.
          </div>
        )}
        {!isLoading && !error && (
          <>
            <p className="mb-4">
                Total Spend: <span className="font-bold text-2xl">${totalSpend.toFixed(2)}</span>
            </p>
            <h3 className="text-lg font-semibold mb-3">Purchases ({purchases?.length || 0})</h3>
             {purchases && purchases.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2"> {/* Added scroll */}
                    {purchases.map((item) => (
                      <div
                        key={item.id}
                        className="flex justify-between items-center p-3 bg-input rounded-lg border border-border"
                      >
                         <div>
                            <p className="font-medium">{item.displayName}</p>
                             <p className="text-xs text-text-secondary">
                                {item.purchaseDate?.toDate ? item.purchaseDate.toDate().toLocaleDateString() : 'N/A'} - {item.category}
                             </p>
                         </div>
                         <p className="font-semibold">${item.price.toFixed(2)}</p>
                      </div>
                    ))}
                </div>
            ) : (
                <EmptyState message={`No purchases recorded in ${monthName}.`} /> // Use EmptyState
            )}
          </>
        )}
      </div>
    </div>
  );
};

