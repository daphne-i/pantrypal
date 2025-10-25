import React, { useState, useMemo } from "react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../hooks/useAuth";
import { useCollection } from "../hooks/useCollection";
import { Loader2, Search, Info, ShoppingBasket } from "lucide-react";
import { getCategoryIcon } from "../constants"; // Re-import the icon helper
import { timeAgo, formatCurrency } from "../utils"; // Import timeAgo AND formatCurrency

// Simple component for empty states
const EmptyState = ({ message }) => (
    <div className="flex flex-col items-center justify-center text-center text-text-secondary py-10">
        <Info size={32} className="mb-2 opacity-50" />
        <p>{message}</p>
    </div>
);

// Simple component for loading state within a section
const LoadingSpinner = () => (
    <div className="flex justify-center items-center py-10">
        <Loader2 size={24} className="animate-spin text-icon opacity-70" />
    </div>
);

export const SmartList = () => {
  const { theme } = useTheme();
  const { userId, appId } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch all unique items, ordered by last purchase date
  const {
    data: uniqueItems,
    isLoading,
    error,
  } = useCollection(
    userId && appId ? `artifacts/${appId}/users/${userId}/unique_items` : null,
    {
      orderByClauses: [["lastPurchaseDate", "desc"]], // Keep the sort
    }
  );

  // Client-side filtering based on search term
  const filteredItems = useMemo(() => {
    if (!uniqueItems) return [];
    return uniqueItems
      .filter(item => item.purchaseCount > 0)
      .filter((item) =>
        item.displayName.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [uniqueItems, searchTerm]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Smart List</h1>
      <p className="text-text-secondary">
        A list of every item you've purchased, sorted by most recent purchase.
      </p>

      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search items..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)} // Corrected this line
          className={`w-full p-3 pl-10 rounded-lg bg-input border border-border focus:ring-2 focus:ring-primary focus:outline-none`}
        />
        <Search
          size={20}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
        />
      </div>

      {/* Item List */}
      <div
        className={`p-4 sm:p-6 rounded-2xl bg-glass border border-border shadow-lg space-y-4`}
      >
        {isLoading && (
          <LoadingSpinner />
        )}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
            <strong>Error:</strong> Failed to load smart list. {error.message}
          </div>
        )}
        {!isLoading && !error && (
          <>
            {filteredItems.length > 0 ? (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                {filteredItems.map((item) => (
                  <SmartListItem key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <EmptyState message="No items found. Start logging purchases to build your list!" />
            )}
          </>
        )}
      </div>
    </div>
  );
};

// Smart List Item Component
const SmartListItem = ({ item }) => {
  const CategoryIcon = getCategoryIcon(item.category);
  return (
    <div
      className={`p-3 sm:p-4 bg-background rounded-lg border border-border flex justify-between items-center`}
    >
      {/* Left Side: Icon, Name */}
      <div className="flex items-center gap-3 overflow-hidden">
         <CategoryIcon size={20} className="text-icon flex-shrink-0" />
         <div className="overflow-hidden">
            <p className="text-base sm:text-lg font-semibold truncate" title={item.displayName}>
              {item.displayName}
            </p>
         </div>
      </div>
      {/* Right Side: Last Bought Date, Last Price */}
      <div className="flex-shrink-0 ml-2 text-right"> {/* Added text-right */}
         <p className="text-xs text-text-secondary whitespace-nowrap"> {/* Moved here */}
            Last bought: {timeAgo(item.lastPurchaseDate)}
         </p>
         <p className="text-xs text-text-secondary whitespace-nowrap"> {/* Moved here */}
           Last price: {formatCurrency(item.lastPrice || 0)}
         </p>
      </div>
    </div>
  );
};

