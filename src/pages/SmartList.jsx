import React, { useState, useMemo } from "react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../hooks/useAuth";
import { useCollection } from "../hooks/useCollection";
import { Loader2, Search } from "lucide-react";

// Helper function to format dates as "X days ago"
const timeAgo = (date) => {
  if (!date) return "N/A";
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
    `artifacts/${appId}/users/${userId}/unique_items`,
    {
      orderByClauses: [["lastPurchaseDate", "desc"]],
    }
  );

  // Client-side filtering based on search term
  const filteredItems = useMemo(() => {
    if (!uniqueItems) return [];
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

      {/* Item List */}
      <div
        className={`p-6 rounded-2xl bg-glass border border-border shadow-lg space-y-4`}
      >
        {isLoading && (
          <div className="flex justify-center items-center h-48">
            <Loader2 size={32} className="animate-spin text-icon" />
          </div>
        )}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
            <strong>Error:</strong> Failed to load smart list.
          </div>
        )}
        {!isLoading && !error && (
          <>
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => (
                <SmartListItem key={item.id} item={item} />
              ))
            ) : (
              <p className="text-center py-10">
                No items found. Start logging purchases to build your list!
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// Smart List Item Component
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
          Purchased {item.purchaseCount} times
        </p>
      </div>
      <div>
        <span
           className={`text-xs font-medium px-2 py-1 rounded-full bg-primary/20 text-icon`} // <-- FIX: Removed the invalid comment
         >
           {item.category}
         </span>
      </div>
    </div>
  );
};