import React, { useState, useMemo, useEffect, useRef } from "react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../hooks/useAuth";
import { useCollection } from "../hooks/useCollection";
import { handleExportCSV } from "../firebaseUtils";
import { formatCurrency, formatDate } from '../utils';
import { CATEGORIES } from '../constants'; // Import categories
import { Loader2, Info, Download, Calendar, Filter, X, Search, CheckSquare, Square } from "lucide-react";
import { Timestamp } from "firebase/firestore";
// Import Recharts components
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell // Import Cell for category chart colors
} from 'recharts';

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

// Helper to get default date range (current month)
const getDefaultDateRange = () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Last day of current month
    const formatDateForInput = (date) => date.toISOString().split('T')[0]; // YYYY-MM-DD
    return {
        start: formatDateForInput(startOfMonth),
        end: formatDateForInput(endOfMonth),
    };
};

// Helper to get start of the month N months ago
const getStartNMonthsAgo = (monthsAgo) => {
    const now = new Date();
    // Set to the first day of the current month
    now.setDate(1);
    now.setHours(0, 0, 0, 0);
    // Go back N months
    now.setMonth(now.getMonth() - monthsAgo);
    return Timestamp.fromDate(now);
}

// --- Dashboard Colors (Copied from Dashboard.jsx) ---
const DASHBOARD_COLORS = [
    "#9C27B0", "#3F51B5", "#2196F3", "#4CAF50", "#FFEB3B",
    "#FF9800", "#F44336", "#00BCD4", "#E91E63", "#8BC34A",
    "#FFC107", "#009688",
];


export const Reports = () => {
  const { theme } = useTheme();
  const { userId, appId } = useAuth();

  // --- State for Filters ---
  const defaultRange = getDefaultDateRange();
  const [startDate, setStartDate] = useState(defaultRange.start);
  const [endDate, setEndDate] = useState(defaultRange.end);
  const [selectedCategories, setSelectedCategories] = useState([]); // Array of category names
  const [itemNameFilter, setItemNameFilter] = useState("");
  const [showCatDropdown, setShowCatDropdown] = useState(false);
  const categoryDropdownRef = useRef(null); // Ref for dropdown closing

   // --- Close Dropdown on Outside Click ---
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if the click is outside the dropdown container
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target)) {
        setShowCatDropdown(false); // Close the dropdown
      }
    };
    // Add event listener only when the dropdown is open
    if (showCatDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      // Remove event listener when dropdown is closed to prevent memory leaks
      document.removeEventListener('mousedown', handleClickOutside);
    }
    // Cleanup listener on component unmount or when dropdown closes
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCatDropdown]); // Re-run this effect if showCatDropdown changes


  // --- Date Range Firestore Timestamps ---
  const { startTimestamp, endTimestamp, dateRangeString } = useMemo(() => {
    try {
        // Start date: Convert YYYY-MM-DD string to Timestamp at 00:00:00 local time
        const start = new Date(startDate + 'T00:00:00');
        const startTs = Timestamp.fromDate(start);

        // End date: Convert YYYY-MM-DD string to Timestamp at 23:59:59 local time
        const end = new Date(endDate + 'T23:59:59');
        const endTs = Timestamp.fromDate(end);

        // Format range string only if dates are valid
        const rangeStr = (!isNaN(start) && !isNaN(end))
            ? `${formatDate(start)} - ${formatDate(end)}`
            : "Invalid Date Range";

        return { startTimestamp: startTs, endTimestamp: endTs, dateRangeString: rangeStr };

    } catch (e) {
        console.error("Error parsing date range:", e);
        // Return null timestamps if parsing fails to prevent Firestore error
        return { startTimestamp: null, endTimestamp: null, dateRangeString: "Invalid Date Range" };
    }
  }, [startDate, endDate]);


  // --- Data Fetching for Selected Date Range ---
  const {
    data: purchasesInRange,
    isLoading: isLoadingRange,
    error: rangeError,
  } = useCollection(
    // Only run query if timestamps are valid and not NaN
    userId && appId && startTimestamp?.seconds && endTimestamp?.seconds
      ? `artifacts/${appId}/users/${userId}/purchases`
      : null,
    {
      whereClauses: [
        ["purchaseDate", ">=", startTimestamp],
        ["purchaseDate", "<=", endTimestamp],
      ],
      orderByClauses: [["purchaseDate", "desc"]], // Keep ordering for table
    }
  );

   // --- Data Fetching for Yearly Chart (Last ~13 months for aggregation) ---
    const start13MonthsAgo = useMemo(() => getStartNMonthsAgo(12), []);
    const {
        data: yearlyPurchasesData,
        isLoading: isLoadingYearly,
        error: yearlyError,
    } = useCollection(
        userId && appId ? `artifacts/${appId}/users/${userId}/purchases` : null,
        {
            whereClauses: [
                ["purchaseDate", ">=", start13MonthsAgo],
                // No end date needed, fetches up to now
            ],
             // No specific order needed for aggregation
        }
    );


  // --- Client-Side Filtering ---
  const filteredPurchases = useMemo(() => {
    if (!purchasesInRange) return [];
    return purchasesInRange
      .filter(item => { // Category filter
        return selectedCategories.length === 0 || selectedCategories.includes(item.category);
      })
      .filter(item => { // Item name filter
        return !itemNameFilter || item.displayName.toLowerCase().includes(itemNameFilter.toLowerCase());
      });
  }, [purchasesInRange, selectedCategories, itemNameFilter]);

  // --- Aggregation for Category Comparison Chart ---
  const categorySpendingData = useMemo(() => {
      if (!filteredPurchases) return [];
      const grouped = filteredPurchases.reduce((acc, item) => {
          const category = item.category || "Other";
          const price = item.price || 0;
          acc[category] = (acc[category] || 0) + price;
          return acc;
      }, {});
      return Object.entries(grouped)
          .map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }))
          .sort((a, b) => b.value - a.value); // Sort descending by value
  }, [filteredPurchases]);


  // --- Aggregation for Yearly Spending Trend Chart ---
  const yearlySpendingData = useMemo(() => {
      if (!yearlyPurchasesData) return [];

      // Initialize months map (last 12 months)
      const months = {};
      const now = new Date();
      for (let i = 0; i < 12; i++) {
          // Go back i months from *now*
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
          months[monthKey] = { name: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), value: 0 };
      }

      // Aggregate purchases into months
      yearlyPurchasesData.forEach(item => {
          if (item.purchaseDate?.toDate && item.price > 0) {
              const date = item.purchaseDate.toDate();
              const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
              if (months[monthKey]) {
                  months[monthKey].value += item.price;
              }
          }
      });

      // Convert to array and sort chronologically (oldest first for chart)
      return Object.entries(months)
          .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
          .map(([key, data]) => ({
             name: data.name,
             value: parseFloat(data.value.toFixed(2)),
          }));

  }, [yearlyPurchasesData]);


  // --- Calculated Total for Filtered Data ---
  const totalForFiltered = useMemo(() => {
    if (!filteredPurchases) return 0;
    return filteredPurchases.reduce((sum, item) => sum + (item.price || 0), 0);
  }, [filteredPurchases]);

  // --- Event Handlers ---
  const handleCategoryToggle = (categoryName) => {
    setSelectedCategories(prev =>
      prev.includes(categoryName)
        ? prev.filter(c => c !== categoryName)
        : [...prev, categoryName]
    );
    // Keep dropdown open after selection for multi-select
    // setShowCatDropdown(false);
  };

  const onExportClick = () => {
      // Pass the filtered data to the export function
      handleExportCSV(filteredPurchases, `${startDate}_to_${endDate}`);
  };

  // --- Loading/Error States ---
  const isLoading = isLoadingRange || isLoadingYearly;
  // Combine error messages slightly
  const errorMessage = [rangeError?.message, yearlyError?.message].filter(Boolean).join('; ');


  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Reports</h1>

      {/* --- Filters Section --- */}
      <div className={`p-4 rounded-2xl bg-glass border border-border shadow-lg space-y-4`}>
        <h2 className="font-semibold text-lg mb-2">Filters</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          {/* Date Range */}
          <div>
            <label htmlFor="start-date" className="block text-sm font-medium mb-1">Start Date</label>
            <input
              type="date" id="start-date" value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-2 rounded-md bg-input border border-border focus:ring-1 focus:ring-primary focus:outline-none text-sm"
            />
          </div>
          <div>
            <label htmlFor="end-date" className="block text-sm font-medium mb-1">End Date</label>
            <input
              type="date" id="end-date" value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate} // Prevent end date being before start date
              className="w-full p-2 rounded-md bg-input border border-border focus:ring-1 focus:ring-primary focus:outline-none text-sm"
            />
          </div>

          {/* Category Filter Dropdown */}
          <div className="relative" ref={categoryDropdownRef}> {/* <-- Added ref */}
             <label className="block text-sm font-medium mb-1">Category</label>
             <button
                onClick={() => setShowCatDropdown(!showCatDropdown)}
                className="w-full flex justify-between items-center p-2 rounded-md bg-input border border-border text-sm text-left"
             >
                <span>{selectedCategories.length === 0 ? 'All Categories' : `${selectedCategories.length} Selected`}</span>
                <Filter size={16} className="text-text-secondary" />
             </button>
             {showCatDropdown && (
                <div className="absolute top-full left-0 mt-1 w-full max-h-60 overflow-y-auto bg-glass border border-border rounded-md shadow-lg z-10 p-2 space-y-1">
                    <button
                        onClick={() => { setSelectedCategories([]); setShowCatDropdown(false); }}
                        className="w-full text-left text-sm px-2 py-1 rounded hover:bg-primary/10 text-primary font-medium"
                    >
                        Clear All
                    </button>
                    {CATEGORIES.map(cat => (
                        <div key={cat.name} className="flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-input" onClick={() => handleCategoryToggle(cat.name)}>
                            {selectedCategories.includes(cat.name) ? <CheckSquare size={16} className="text-primary" /> : <Square size={16} className="text-text-secondary" />}
                            <span className="text-sm">{cat.name}</span>
                        </div>
                    ))}
                </div>
             )}
          </div>

          {/* Item Name Filter */}
          <div>
              <label htmlFor="item-name-filter" className="block text-sm font-medium mb-1">Item Name</label>
              <div className="relative">
                  <input
                      type="text" id="item-name-filter" placeholder="Search item..."
                      value={itemNameFilter} onChange={(e) => setItemNameFilter(e.target.value)}
                      className="w-full p-2 pl-8 rounded-md bg-input border border-border focus:ring-1 focus:ring-primary focus:outline-none text-sm"
                  />
                  <Search size={16} className="absolute left-2 top-1/2 -translate-y-1/2 text-text-secondary" />
              </div>
          </div>
        </div>
      </div>


      {/* --- Yearly Spending Trend Chart --- */}
       <div className={`p-4 sm:p-6 rounded-2xl bg-glass border border-border shadow-lg min-h-[300px]`}>
          <h2 className="text-lg font-semibold mb-4">Yearly Spending Trend (Last 12 Months)</h2>
          {isLoadingYearly ? <LoadingSpinner /> : yearlyError ? (
               <p className="text-red-500">Error loading yearly data: {yearlyError.message}</p> // More specific
           ) : yearlySpendingData && yearlySpendingData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                   <BarChart data={yearlySpendingData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                     <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5}/>
                     <XAxis dataKey="name" fontSize={12} stroke="var(--color-text-secondary)" />
                     <YAxis fontSize={12} stroke="var(--color-text-secondary)" tickFormatter={(value) => formatCurrency(value, 0)} />
                     <Tooltip
                        cursor={{ fill: 'var(--color-input)' }}
                        contentStyle={{
                             backgroundColor: 'var(--color-glass)',
                             borderColor: 'var(--color-border)',
                             borderRadius: '8px',
                             fontSize: '12px',
                             color: 'var(--color-text)'
                        }}
                        formatter={(value) => [formatCurrency(value), 'Spend']}
                     />
                     <Bar dataKey="value" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                   </BarChart>
                 </ResponsiveContainer>
           ) : (
                // Show message if loading finished but no data (and no error)
               !isLoadingYearly && !yearlyError ? <EmptyState message="Not enough data for yearly trend." /> : null
           )}
       </div>


      {/* --- Report Table & Category Chart Section --- */}
       <div className={`rounded-2xl bg-glass border border-border shadow-lg overflow-hidden`}>
          {/* Header */}
          <div className="p-4 border-b border-border flex justify-between items-center flex-wrap gap-2">
             <div>
                 <h2 className="text-lg font-semibold">Purchases ({dateRangeString})</h2>
                 {!isLoadingRange && !rangeError && filteredPurchases && (
                    <p className="text-sm text-text-secondary">
                        Total: {formatCurrency(totalForFiltered)} ({filteredPurchases.length} items)
                    </p>
                 )}
             </div>
             <button
                onClick={onExportClick}
                disabled={isLoadingRange || !filteredPurchases || filteredPurchases.length === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-primary text-primary-text primary-hover transition-colors disabled:opacity-50 text-sm"
             >
                <Download size={16} />
                Export CSV
             </button>
          </div>

          {/* Loading/Error for Range */}
           {isLoadingRange && <LoadingSpinner />}
           {/* More Specific Error */}
           {rangeError && (
               <div className="p-4">
                   <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
                       <strong>Error loading purchases for date range:</strong> {rangeError.message}
                   </div>
               </div>
           )}

            {/* Content: Table and Chart */}
            {!isLoadingRange && !rangeError && (
                <>
                {filteredPurchases && filteredPurchases.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-4">
                        {/* Table (Takes more space on large screens) */}
                        <div className="lg:col-span-2 max-h-[60vh] overflow-y-auto border border-border rounded-lg">
                          <table className="w-full text-left">
                            <thead className="sticky top-0 bg-glass border-b border-border">
                              <tr>
                                <th className="p-3 text-xs sm:text-sm font-semibold">Date</th>
                                <th className="p-3 text-xs sm:text-sm font-semibold">Item</th>
                                <th className="p-3 text-xs sm:text-sm font-semibold hidden md:table-cell">Category</th>
                                <th className="p-3 text-xs sm:text-sm font-semibold">Qty</th>
                                <th className="p-3 text-xs sm:text-sm font-semibold text-right">Price</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {filteredPurchases.map((item) => (
                                <tr key={item.id} className="hover:bg-black/5 dark:hover:bg-white/5">
                                  <td className="p-3 text-xs sm:text-sm whitespace-nowrap">{formatDate(item.purchaseDate)}</td>
                                  <td className="p-3 font-medium text-xs sm:text-sm">{item.displayName}</td>
                                  <td className="p-3 text-xs sm:text-sm hidden md:table-cell">{item.category}</td>
                                  <td className="p-3 text-xs sm:text-sm whitespace-nowrap">{item.quantity} {item.unit}</td>
                                  <td className="p-3 text-xs sm:text-sm font-medium text-right whitespace-nowrap">{formatCurrency(item.price)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                         {/* Category Chart (Takes less space on large screens) */}
                         <div className="lg:col-span-1 min-h-[250px]">
                              <h3 className="font-semibold mb-2 text-center text-sm">Spending by Category</h3>
                              {categorySpendingData.length > 0 ? (
                                   <ResponsiveContainer width="100%" height={Math.max(250, categorySpendingData.length * 25)}> {/* Dynamic height */}
                                     <BarChart data={categorySpendingData} layout="vertical" margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
                                       <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3}/>
                                       <XAxis type="number" fontSize={10} stroke="var(--color-text-secondary)" tickFormatter={(value) => formatCurrency(value, 0)} />
                                       <YAxis dataKey="name" type="category" width={80} fontSize={10} stroke="var(--color-text-secondary)" interval={0} />
                                       <Tooltip
                                            cursor={{ fill: 'var(--color-input)' }}
                                            contentStyle={{ backgroundColor: 'var(--color-glass)', borderColor: 'var(--color-border)', borderRadius: '8px', fontSize: '12px', color: 'var(--color-text)' }}
                                            formatter={(value) => [formatCurrency(value), 'Spend']}
                                       />
                                       {/* --- Use Cell for colors --- */}
                                       <Bar dataKey="value" barSize={15} radius={[0, 4, 4, 0]}>
                                           {categorySpendingData.map((entry, index) => (
                                               <Cell key={`cell-${index}`} fill={DASHBOARD_COLORS[index % DASHBOARD_COLORS.length]} />
                                           ))}
                                       </Bar>
                                     </BarChart>
                                   </ResponsiveContainer>
                              ) : (
                                  <EmptyState message="No category data for selected filters." />
                              )}
                         </div>
                    </div>
                 ) : (
                     // --- FIX: Use errorMessage here ---
                    // Show EmptyState only if there's genuinely no data AND no combined error
                    !errorMessage ? <EmptyState message="No purchases found for the selected filters." /> : null
                 )}
                </>
            )}
             {/* --- FIX: Use errorMessage here --- */}
             {/* Show general error message if applicable */}
             {!isLoading && errorMessage && (
                 <div className="p-4 text-center text-red-500">
                    Could not load all report data. Error(s): {errorMessage}
                 </div>
             )}
       </div>
    </div>
  );
};