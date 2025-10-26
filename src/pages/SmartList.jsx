import React, { useState, useMemo, useCallback } from "react"; // Import useCallback
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../hooks/useAuth";
import { useCollection } from "../hooks/useCollection";
import { Loader2, Search, Info, ShoppingCart, ListChecks } from "lucide-react"; // Added ListChecks icon
import { getCategoryIcon } from "../constants";
import { timeAgo, formatCurrency } from "../utils";
import { handleToggleShoppingListItem } from "../firebaseUtils"; // Import the new function
import toast from 'react-hot-toast'; // Import toast for feedback

// Simple component for empty states (Keep as is)
const EmptyState = ({ message }) => (
    <div className="flex flex-col items-center justify-center text-center text-text-secondary py-10">
        <Info size={32} className="mb-2 opacity-50" />
        <p>{message}</p>
    </div>
);

// Simple component for loading state within a section (Keep as is)
const LoadingSpinner = () => (
    <div className="flex justify-center items-center py-10">
        <Loader2 size={24} className="animate-spin text-icon opacity-70" />
    </div>
);

export const SmartList = () => {
  const { theme } = useTheme();
  const { userId, appId } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [showOnlyShoppingList, setShowOnlyShoppingList] = useState(false); // State for filtering

  // Fetch all unique items (keep ordering for context, filtering happens client-side)
  const {
    data: uniqueItems,
    isLoading,
    error,
  } = useCollection(
    userId && appId ? `artifacts/${appId}/users/${userId}/unique_items` : null,
    {
      orderByClauses: [["lastPurchaseDate", "desc"]],
    }
  );

  // Client-side filtering
  const filteredItems = useMemo(() => {
    if (!uniqueItems) return [];
    return uniqueItems
      .filter(item => item.purchaseCount > 0) // Only show items actually purchased
      .filter((item) => // Filter by search term
        item.displayName.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .filter((item) => // Filter by shopping list status if active
        showOnlyShoppingList ? item.isMarkedForShopping === true : true
      );
  }, [uniqueItems, searchTerm, showOnlyShoppingList]);

  // Handler for the toggle button within list items
  const toggleItemMark = useCallback(async (itemId, currentStatus) => {
    try {
      await handleToggleShoppingListItem(itemId, !currentStatus, userId, appId);
      // Optional: Add toast feedback here or rely on visual change
      // toast.success(`Item ${!currentStatus ? 'added to' : 'removed from'} shopping list`);
    } catch (err) {
      // Error toast is handled in firebaseUtils
    }
  }, [userId, appId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
        <h1 className="text-3xl font-bold">Smart List</h1>
        {/* Shopping List Toggle Button */}
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
            : "A list of every item you've purchased, sorted by most recent purchase."
        }
      </p>

      {/* Search Bar */}
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
                  <SmartListItem
                      key={item.id}
                      item={item}
                      onToggleMark={toggleItemMark} // Pass handler down
                  />
                ))}
              </div>
            ) : (
              <EmptyState message={
                  showOnlyShoppingList
                  ? "Your shopping list is empty. Mark items as needed from the full list."
                  : "No items found. Start logging purchases!"
              } />
            )}
          </>
        )}
      </div>
    </div>
  );
};

const SmartListItem = ({ item, onToggleMark }) => {
  const CategoryIcon = getCategoryIcon(item.category);
  const isMarked = item.isMarkedForShopping || false; // Default to false if field doesn't exist

  return (
    <div
      // Keep the border highlight for clarity
      className={`p-3 sm:p-4 bg-background rounded-lg border ${isMarked ? 'border-primary' : 'border-border'} flex justify-between items-center gap-2 group transition-colors`}
    >
        {/* Left Side: Icon, Name */}
        <div className="flex items-center gap-3 overflow-hidden flex-grow">
           <CategoryIcon size={20} className="text-icon flex-shrink-0" />
           <div className="overflow-hidden">
              {/* --- CHANGE HERE: Removed line-through, added conditional text color --- */}
              <p className={`text-base sm:text-lg font-semibold truncate ${isMarked ? 'text-text-secondary' : 'text-text'}`} title={item.displayName}>
                {item.displayName}
              </p>
           </div>
        </div>

        {/* Middle: Last Bought/Price Info */}
        <div className="flex-shrink-0 text-right hidden sm:block">
           <p className="text-xs text-text-secondary whitespace-nowrap">
              Last bought: {timeAgo(item.lastPurchaseDate)}
           </p>
           <p className="text-xs text-text-secondary whitespace-nowrap">
             Last price: {formatCurrency(item.lastPrice)}
           </p>
        </div>

        {/* Right Side: Toggle Button (No change needed here) */}
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
