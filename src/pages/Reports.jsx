import React, { useState, useMemo } from "react";
import { useAuth } from "../hooks/useAuth";
import { useCollection } from "../hooks/useCollection";
import { getCategoryIcon } from "../constants";
import { formatCurrency, formatDate } from '../utils'; // Import formatters
import { handleExportCSV } from "../firebaseUtils"; // Import CSV export function
import { Loader2, Info, Download } from "lucide-react";

// Simple component for empty states
const EmptyState = ({ message }) => (
    <div className="flex flex-col items-center justify-center text-center text-text-secondary py-10">
        <Info size={32} className="mb-2 opacity-50" />
        <p>{message}</p>
    </div>
);

// Simple component for loading state
const LoadingSpinner = () => (
    <div className="flex justify-center items-center py-10">
        <Loader2 size={24} className="animate-spin text-icon opacity-70" />
    </div>
);

// Get current month in YYYY-MM format
const getCurrentMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    return `${year}-${month}`;
};

export const Reports = () => {
  const { userId, appId } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());

  // Calculate start and end Timestamps for the selected month
  const { startOfMonth, endOfMonth } = useMemo(() => {
    if (!selectedMonth) return { startOfMonth: null, endOfMonth: null };
    const [year, month] = selectedMonth.split('-').map(Number);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1); // First day of next month
    return { startOfMonth: start, endOfMonth: end };
  }, [selectedMonth]);

  // Fetch purchases for the selected month
  const {
    data: purchases,
    isLoading,
    error,
  } = useCollection(
    userId && appId && startOfMonth && endOfMonth ? `artifacts/${appId}/users/${userId}/purchases` : null,
    {
      whereClauses: [
          ["purchaseDate", ">=", startOfMonth],
          ["purchaseDate", "<", endOfMonth]
      ],
      orderByClauses: [["purchaseDate", "desc"]], // Show most recent first
    }
  );

  // Calculate total for the month
  const totalForMonth = useMemo(() => {
    return purchases
      ? purchases.reduce((sum, item) => sum + (item.price || 0), 0)
      : 0;
  }, [purchases]);

  const handleExport = () => {
      if(purchases && purchases.length > 0){
          handleExportCSV(purchases, selectedMonth);
      } else {
          // You could use a toast notification here as well
          alert("No data to export for this month.");
      }
  };


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <h1 className="text-3xl font-bold">Monthly Report</h1>
          {/* Month Selector */}
          <div className="flex items-center gap-2">
              <label htmlFor="month-select" className="text-sm font-medium">Select Month:</label>
              <input
                type="month"
                id="month-select"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="p-2 rounded-md bg-input border border-border focus:ring-1 focus:ring-primary focus:outline-none"
              />
          </div>
      </div>

      {/* Report Summary/Table Container */}
      <div
        className={`p-6 rounded-2xl bg-glass border border-border shadow-lg`}
      >
          {isLoading ? (
             <LoadingSpinner />
          ) : error ? (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
                <strong>Error:</strong> Failed to load report data. Please check console.
            </div>
          ) : purchases && purchases.length > 0 ? (
            <>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">
                        Total Spend: {formatCurrency(totalForMonth)} {/* Use formatter */}
                    </h2>
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-text primary-hover font-medium transition-colors text-sm"
                    >
                        <Download size={16} />
                        Export CSV
                    </button>
                </div>

                {/* Purchases Table */}
                <div className="overflow-x-auto max-h-[60vh]">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs uppercase bg-input sticky top-0">
                      <tr>
                        <th scope="col" className="px-4 py-3">Date</th>
                        <th scope="col" className="px-4 py-3">Item</th>
                        <th scope="col" className="px-4 py-3">Category</th>
                        <th scope="col" className="px-4 py-3">Quantity</th>
                        <th scope="col" className="px-4 py-3 text-right">Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchases.map((item) => {
                          const Icon = getCategoryIcon(item.category);
                          return (
                              <tr key={item.id} className="border-b border-border hover:bg-black/5 dark:hover:bg-white/5">
                                <td className="px-4 py-2 whitespace-nowrap">{formatDate(item.purchaseDate)}</td> {/* Use formatter */}
                                <td className="px-4 py-2 font-medium">{item.displayName}</td>
                                <td className="px-4 py-2">
                                    <div className="flex items-center gap-2">
                                        <Icon size={16} className="text-icon opacity-80"/>
                                        <span>{item.category}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-2">{item.quantity || ''} {item.unit || ''}</td>
                                <td className="px-4 py-2 text-right font-medium">{formatCurrency(item.price)}</td> {/* Use formatter */}
                              </tr>
                          );
                       })}
                    </tbody>
                  </table>
                </div>
            </>
          ) : (
            <EmptyState message={`No purchases logged for ${selectedMonth}.`} />
          )}
      </div>
    </div>
  );
};

