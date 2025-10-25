import React, { useState, useMemo } from "react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../hooks/useAuth";
import { useCollection } from "../hooks/useCollection";
import { downloadCSV } from "../firebaseUtils"; // <-- Import CSV utility
import { Loader2, Download } from "lucide-react";

// Helper to get month name and year
const getMonthYearString = (date) => {
  return date.toLocaleString('default', { month: 'long', year: 'numeric' });
};

// Helper to get start and end of a month
const getMonthRange = (year, month) => {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999); // End of the last day
  return { start, end };
};


export const Reports = () => {
  const { theme } = useTheme();
  const { userId, appId } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`; // Format YYYY-MM (month is 0-indexed)
  });

  const { year, month } = useMemo(() => {
    const [y, m] = selectedMonth.split('-');
    return { year: parseInt(y), month: parseInt(m) };
  }, [selectedMonth]);

  const { start, end } = useMemo(() => getMonthRange(year, month), [year, month]);

  // Fetch purchases for the *selected* month
  const {
    data: purchases,
    isLoading,
    error,
  } = useCollection(
    `artifacts/${appId}/users/${userId}/purchases`,
    {
      whereClauses: [
        ["purchaseDate", ">=", start],
        ["purchaseDate", "<=", end]
      ],
      orderByClauses: [["purchaseDate", "desc"]], // Keep ordering consistent
    }
  );

  const handleExport = () => {
    if (!purchases || purchases.length === 0) {
      alert("No data available to export for this month."); // Consider a modal later
      return;
    }
    // Convert Timestamps before exporting
    const dataToExport = purchases.map(p => ({
      ...p,
      purchaseDate: p.purchaseDate.toDate().toISOString(), // Convert Timestamp to ISO string
    }));
    const monthYear = getMonthYearString(start);
    downloadCSV(dataToExport, `PantryPal_Report_${monthYear.replace(' ', '_')}.csv`);
  };

  const monthYearDisplay = useMemo(() => getMonthYearString(start), [start]);


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Reports</h1>
        {/* Month Selector */}
        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className={`p-2 rounded-lg bg-input border border-border focus:ring-2 focus:ring-primary focus:outline-none`}
        />
      </div>

      <div
        className={`p-6 rounded-2xl bg-glass border border-border shadow-lg space-y-4`}
      >
        <div className="flex justify-between items-center mb-4">
           <h2 className="text-xl font-semibold">Monthly Summary: {monthYearDisplay}</h2>
           <button
             onClick={handleExport}
             className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-primary text-primary-text primary-hover transition-colors ${!purchases || purchases.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
             disabled={!purchases || purchases.length === 0}
           >
             <Download size={18} />
             Export CSV
           </button>
        </div>

        {isLoading && (
          <div className="flex justify-center items-center h-48">
            <Loader2 size={32} className="animate-spin text-icon" />
          </div>
        )}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
            <strong>Error:</strong> Failed to load report data. {error.message}
          </div>
        )}
        {!isLoading && !error && (
          <>
            {purchases && purchases.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="p-2">Date</th>
                      <th className="p-2">Item</th>
                      <th className="p-2">Category</th>
                      <th className="p-2 text-right">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchases.map((item) => (
                      <tr key={item.id} className="border-b border-border/50 hover:bg-black/5 dark:hover:bg-white/5">
                        <td className="p-2 text-sm">{item.purchaseDate?.toDate().toLocaleDateString()}</td>
                        <td className="p-2">{item.displayName}</td>
                        <td className="p-2">
                           <span className={`text-xs font-medium px-2 py-1 rounded-full bg-primary/20 text-icon`}>
                             {item.category}
                           </span>
                        </td>
                        <td className="p-2 text-right font-semibold">${item.price.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center py-10">
                No purchases logged for {monthYearDisplay}.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};
