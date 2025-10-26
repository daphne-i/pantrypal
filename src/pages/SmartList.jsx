import React, { useState, useMemo, useCallback } from "react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../hooks/useAuth";
import { useCollection } from "../hooks/useCollection";
// Import ArrowUp, ArrowDown, Minus icons
import { Loader2, Search, Info, ShoppingCart, ListChecks, ArrowUp, ArrowDown, Minus } from "lucide-react";
import { getCategoryIcon } from "../constants";
import { timeAgo, formatCurrency } from "../utils";
import { handleToggleShoppingListItem } from "../firebaseUtils";
import toast from 'react-hot-toast';

// --- Helper Components (Keep as is) ---
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


export const SmartList = () => {
  // --- State and Hooks (Keep as is) ---
  const { theme } = useTheme();
  const { userId, appId } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [showOnlyShoppingList, setShowOnlyShoppingList] = useState(false);

  const {
    data: uniqueItems,
    isLoading,
    error,
  } = useCollection(
    userId && appId ? `artifacts/${appId}/users/${userId}/unique_items` : null,
    {
      // Sort by name client-side if needed, Firestore sort isn't strictly necessary now
      // orderByClauses: [["lastPurchaseDate", "desc"]],
    }
  );

  // Client-side filtering and sorting
  const processedItems = useMemo(() => {
    if (!uniqueItems) return [];
    return uniqueItems
      .filter(item => item.purchaseCount > 0) // Only show items actually purchased
      .filter((item) => // Filter by search term
        item.displayName.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .filter((item) => // Filter by shopping list status if active
        showOnlyShoppingList ? item.isMarkedForShopping === true : true
      )
      // Sort primarily by marked status (marked items first), then by name
      .sort((a, b) => {
           const aMarked = a.isMarkedForShopping || false;
           const bMarked = b.isMarkedForShopping || false;
           if (aMarked && !bMarked) return -1; // a comes first
           if (!aMarked && bMarked) return 1;  // b comes first
           // If both marked or both unmarked, sort by name
           return a.displayName.localeCompare(b.displayName);
      });
  }, [uniqueItems, searchTerm, showOnlyShoppingList]);

  // Handler for the toggle button (Keep as is)
  const toggleItemMark = useCallback(async (itemId, currentStatus) => {
    try {
      await handleToggleShoppingListItem(itemId, !currentStatus, userId, appId);
    } catch (err) {
      // Error handled in firebaseUtils
    }
  }, [userId, appId]);

  // --- JSX (Minor changes for button and list mapping) ---
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
        <h1 className="text-3xl font-bold">Smart List</h1>
        <button
            onClick={() => setShowOnlyShoppingList(!showOnlyShoppingList)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                showOnlyShoppingList
                ? 'bg-primary/10 text-primary border-primary'
                : 'bg-input border-border text-text-secondary hover:border-primary/50 hover:text-primary'
            }`}
        >
          <ListChecks size={18} />
          {showOnlyShoppingList ? 'Show All Items' : 'Show Shopping List'}
        </button>
      </div>

      <p className="text-text-secondary">
        {showOnlyShoppingList
            ? "Showing items marked as needed."
            : "All items you've purchased, sorted alphabetically." // Updated description
        }
      </p>

      {/* Search Bar (Keep as is) */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search items..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
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
        {isLoading && <LoadingSpinner />}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
            <strong>Error:</strong> Failed to load smart list. {error.message}
          </div>
        )}
        {!isLoading && !error && (
          <>
            {processedItems.length > 0 ? (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                {/* Use processedItems instead of filteredItems */}
                {processedItems.map((item) => (
                  <SmartListItem
                      key={item.id}
                      item={item}
                      onToggleMark={toggleItemMark}
                  />
                ))}
              </div>
            ) : (
              <EmptyState message={
                  showOnlyShoppingList
                  ? "Your shopping list is empty."
                  : "No items found. Start logging purchases!"
              } />
            )}
          </>
        )}
      </div>
    </div>
  );
};


// --- Smart List Item Component - MODIFIED ---
const PriceTrendIndicator = ({ history }) => {
    if (!history || history.length < 2) {
        // No trend if less than 2 price points
        return <Minus size={14} className="text-text-secondary" />;
    }

    const latestPrice = history[0].price;
    const previousPrice = history[1].price;

    if (latestPrice > previousPrice) {
        return <ArrowUp size={14} className="text-red-500" />; // Price increased
    } else if (latestPrice < previousPrice) {
        return <ArrowDown size={14} className="text-green-500" />; // Price decreased
    } else {
        return <Minus size={14} className="text-text-secondary" />; // Price stable
    }
};

const SmartListItem = ({ item, onToggleMark }) => {
  const CategoryIcon = getCategoryIcon(item.category);
  const isMarked = item.isMarkedForShopping || false;
  const latestPrice = item.priceHistory && item.priceHistory.length > 0
      ? item.priceHistory[0].price
      : item.lastPrice; // Fallback to lastPrice if history is missing (old data)

  return (
    <div
      className={`p-3 sm:p-4 bg-background rounded-lg border ${isMarked ? 'border-primary' : 'border-border'} flex justify-between items-center gap-2 group transition-colors`}
    >
        {/* Left Side: Icon, Name */}
        <div className="flex items-center gap-3 overflow-hidden flex-grow">
           <CategoryIcon size={20} className="text-icon flex-shrink-0" />
           <div className="overflow-hidden">
              <p className={`text-base sm:text-lg font-semibold truncate ${isMarked ? 'text-text-secondary' : 'text-text'}`} title={item.displayName}>
                {item.displayName}
              </p>
           </div>
        </div>

        {/* Middle: Last Bought & Price Info with Trend */}
        <div className="flex-shrink-0 text-right">
           <p className="text-xs text-text-secondary whitespace-nowrap hidden sm:block"> {/* Hide date on small screens */}
              Last bought: {timeAgo(item.lastPurchaseDate)}
           </p>
           {/* Price and Trend */}
           <div className="flex items-center justify-end gap-1">
                {/* Trend Icon */}
                <PriceTrendIndicator history={item.priceHistory} />
                {/* Latest Price */}
                <p className="text-sm sm:text-base font-medium whitespace-nowrap">
                  {formatCurrency(latestPrice)}
                </p>
           </div>
        </div>

        {/* Right Side: Toggle Button */}
        <div className="flex-shrink-0 ml-2">
            <button
                onClick={() => onToggleMark(item.id, isMarked)}
                title={isMarked ? "Mark as Purchased / Not Needed" : "Mark as Needed / Used"}
                className={`p-2 rounded-full transition-colors ${
                    isMarked
                    ? 'bg-primary/10 text-primary hover:bg-primary/20'
                    : 'bg-input text-text-secondary hover:bg-border group-hover:opacity-100 sm:opacity-0'
                }`}
            >
                <ShoppingCart size={18} strokeWidth={isMarked ? 3 : 2} />
            </button>
        </div>
    </div>
  );
};