import React, { useMemo } from "react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../hooks/useAuth";
import { useCollection } from "../hooks/useCollection";
import { useDocument } from "../hooks/useDocument";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Loader2, Info } from "lucide-react";
import { getCategoryIcon } from "../constants"; // Import the icon helper

// Helper function to get the start of the current month
const getStartOfMonth = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
};

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


export const Dashboard = () => {
  const { theme } = useTheme();
  const { userId, appId } = useAuth();
  const startOfMonth = useMemo(getStartOfMonth, []);

  // Fetch purchases for the current month
  const {
    data: purchases,
    isLoading: isLoadingPurchases,
    error: purchasesError,
  } = useCollection(
    userId && appId ? `artifacts/${appId}/users/${userId}/purchases` : null,
    {
      whereClauses: [["purchaseDate", ">=", startOfMonth]],
      orderByClauses: [["purchaseDate", "desc"]],
    }
  );

   // Fetch user profile for budget
   const { data: userProfile, isLoading: isLoadingProfile } = useDocument(
     userId && appId ? `artifacts/${appId}/users/${userId}/profile` : null,
     userId
   );
   const monthlyBudget = userProfile?.monthlyBudget;


  // Calculate total spend
  const totalSpend = useMemo(() => {
    return purchases
      ? purchases.reduce((sum, item) => sum + (item.price || 0), 0) // Added safety check for item.price
      : 0;
  }, [purchases]);

   // Calculate budget progress
   const budgetProgress = useMemo(() => {
     if (monthlyBudget === undefined || monthlyBudget === null || monthlyBudget <= 0) {
       return null; // No budget set or invalid budget
     }
     return (totalSpend / monthlyBudget) * 100;
   }, [totalSpend, monthlyBudget]);


  // Process data for the category pie chart
  const categoryData = useMemo(() => {
    if (!purchases) return [];
    const grouped = purchases.reduce((acc, item) => {
      const category = item.category || "Other";
      const price = item.price || 0; // Added safety check
      if (!acc[category]) {
        acc[category] = 0;
      }
      acc[category] += price;
      return acc;
    }, {});

    return Object.entries(grouped).map(([name, value]) => ({
      name,
      value: parseFloat(value.toFixed(2)),
    }));
  }, [purchases]);

  const COLORS = [
    "#06b6d4", // cyan-500
    "#3b82f6", // blue-500
    "#8b5cf6", // purple-500
    "#ec4899", // pink-500
    "#f97316", // orange-500
    "#22c55e", // green-500
    "#eab308", // yellow-500
  ];

  // We only show the main page loader if the profile is still loading
  if (isLoadingProfile) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 size={32} className="animate-spin text-icon" />
      </div>
    );
  }

  // Handle purchase-specific errors after profile loads
  if (purchasesError) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
        <strong>Error:</strong> Failed to load dashboard purchase data. Please check console.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      {/* Responsive Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Widget 1: Total Spend & Budget */}
        <div
          className={`p-6 rounded-2xl bg-glass border border-border shadow-lg md:col-span-1 flex flex-col justify-between`}
        >
          <div>
              <h2 className="text-lg font-semibold mb-1">Total Spend This Month</h2>
              {/* Show loader only for purchase data here */}
              {isLoadingPurchases ? (
                   <div className="h-10 my-1 flex items-center">
                      <Loader2 size={24} className="animate-spin text-icon opacity-50" />
                   </div>
              ) : (
                  <p className="text-4xl font-bold mb-4">
                    ${totalSpend.toFixed(2)}
                  </p>
              )}
          </div>
          {/* Budget Progress Bar */}
           {monthlyBudget !== undefined && monthlyBudget !== null && monthlyBudget > 0 && (
             <div>
               <div className="flex justify-between text-xs text-text-secondary mb-1">
                 <span>Budget: ${monthlyBudget.toFixed(2)}</span>
                 {/* Show loader if purchases are still loading for percentage */}
                 <span>{isLoadingPurchases ? '...' : Math.max(0, budgetProgress || 0).toFixed(0)}% Used</span>
               </div>
               <div className="w-full bg-input rounded-full h-2.5">
                 <div
                   className="bg-primary h-2.5 rounded-full transition-all duration-300"
                   style={{ width: `${isLoadingPurchases ? 0 : Math.min(100, Math.max(0, budgetProgress || 0))}%` }} // Show 0 width while loading
                 ></div>
               </div>
                {(budgetProgress || 0) > 100 && !isLoadingPurchases && ( // Only show if not loading
                     <p className="text-xs text-red-500 mt-1 font-medium">Budget exceeded!</p>
                )}
             </div>
           )}
           {/* Only show "Set budget" if profile is loaded and no budget exists */}
           {(monthlyBudget === undefined || monthlyBudget === null || monthlyBudget <= 0) && !isLoadingProfile && (
               <p className="text-xs text-text-secondary mt-1">Set a budget in Settings to track progress.</p>
           )}

        </div>

        {/* Widget 2: Category Breakdown */}
        <div
          className={`p-6 rounded-2xl bg-glass border border-border shadow-lg md:col-span-2 min-h-[300px] flex flex-col`}
        >
          <h2 className="text-lg font-semibold mb-2">Category Breakdown</h2>
           {/* Show spinner specifically for this section */}
           {isLoadingPurchases ? (
               <LoadingSpinner />
           ) : purchases && purchases.length > 0 ? (
             <div className="flex-grow">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      outerRadius="80%"
                      innerRadius="50%"
                      fill="#8884d8"
                      dataKey="value"
                      labelLine={false}
                       label={({ name, percent, value }) => `${name} ($${value.toFixed(2)})`}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [`$${(value || 0).toFixed(2)}`, name]} // Added safety check
                    />
                  </PieChart>
                </ResponsiveContainer>
             </div>
          ) : (
             <EmptyState message="No spending data for this month yet." />
          )}
        </div>

        {/* Widget 3: Recent Purchases */}
        <div
          className={`p-6 rounded-2xl bg-glass border border-border shadow-lg md:col-span-3`}
        >
          <h2 className="text-lg font-semibold mb-4">Recent Purchases</h2>
           {/* Show spinner specifically for this section */}
           {isLoadingPurchases ? (
               <LoadingSpinner />
           ) : purchases && purchases.length > 0 ? (
             <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                {purchases.slice(0, 5).map((item) => {
                    // Get the icon component for the category
                    const Icon = getCategoryIcon(item.category);
                    return (
                        <div
                          key={item.id}
                          className="flex justify-between items-center p-3 bg-input rounded-lg border border-border"
                        >
                          <div className="flex items-center gap-3"> {/* Added flex container */}
                            <Icon size={20} className="text-icon opacity-80 flex-shrink-0" /> {/* Render the icon */}
                            <div>
                              <p className="font-medium">{item.displayName}</p>
                              <p className="text-xs text-text-secondary">{item.category}</p>
                            </div>
                          </div>
                          <p className="font-semibold">${(item.price || 0).toFixed(2)}</p> {/* Added safety check */}
                        </div>
                    );
                })}
             </div>
           ) : (
              <EmptyState message="No purchases logged this month." />
           )}
        </div>
      </div>
    </div>
  );
};

