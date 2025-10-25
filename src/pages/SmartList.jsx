import React, { useState, useMemo } from "react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../hooks/useAuth";
import { useCollection } from "../hooks/useCollection";
import { Loader2, Search, Info } from "lucide-react";

// Helper function to format dates as "X days ago" (no changes)
const timeAgo = (date) => {
  if (!date?.toDate) return "N/A";
  const now = new Date();
  const seconds = Math.floor((now - date.toDate()) / 1000);

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

// Simple component for empty states (no changes)
const EmptyState = ({ message }) => (
    <div className="flex flex-col items-center justify-center text-center text-text-secondary py-10">
        <Info size={32} className="mb-2 opacity-50" />
        <p>{message}</p>
    </div>
);

// Simple component for loading state within a section (copied from Dashboard)
const LoadingSpinner = () => (
    <div className="flex justify-center items-center py-10">
        <Loader2 size={24} className="animate-spin text-icon opacity-70" />
    </div>
);


export const SmartList = () => {
  const { theme } = useTheme();
  const { userId, appId } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch all unique items
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
    if (!searchTerm) return uniqueItems;
    return uniqueItems.filter((item) =>
      item.displayName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [uniqueItems, searchTerm]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Smart Shopping List</h1>

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

      {/* Item List Container */}
      <div
        className={`p-6 rounded-2xl bg-glass border border-border shadow-lg space-y-4 min-h-[200px]`} // Added min-height
      >
        {isLoading && <LoadingSpinner /> /* Show spinner inside container */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
            <strong>Error:</strong> Failed to load smart list. Check console.
          </div>
        )}
        {!isLoading && !error && (
          <>
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => (
                <SmartListItem key={item.id} item={item} />
              ))
            ) : (
              <EmptyState
                message={searchTerm ? "No items match your search." : "No items found. Start logging purchases!"}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

// Smart List Item Component (no changes)
const SmartListItem = ({ item }) => {
  return (
    <div
      className={`p-4 bg-input rounded-lg border border-border flex justify-between items-center`}
    >
      <div>
        <p className="text-lg font-semibold">{item.displayName}</p>
        <p className="text-sm text-text-secondary">
          Last bought: {timeAgo(item.lastPurchaseDate)}
        </p>
        <p className="text-xs text-text-secondary">
          Purchased {item.purchaseCount || 1} {item.purchaseCount === 1 ? 'time' : 'times'}
        </p>
      </div>
      <div>
        <span
           className={`text-xs font-medium px-2 py-1 rounded-full bg-primary/20 text-icon`}
         >
           {item.category || 'Other'}
        </span>
      </div>
    </div>
  );
};

