import React, { useMemo } from "react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../hooks/useAuth";
import { useCollection } from "../hooks/useCollection";
import { useDocument } from "../hooks/useDocument"; // <-- Added
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Loader2, DollarSign } from "lucide-react"; // <-- Added DollarSign

// Helper function to get the start of the current month
const getStartOfMonth = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
};

export const Dashboard = () => {
  const { theme } = useTheme();
  const { userId, appId } = useAuth();
  const startOfMonth = useMemo(getStartOfMonth, []);

  // Fetch purchases for the current month
  const {
    data: purchases,
    isLoading: isLoadingPurchases, // <-- Renamed
    error: errorPurchases,         // <-- Renamed
  } = useCollection(
    `artifacts/${appId}/users/${userId}/purchases`,
    {
      whereClauses: [["purchaseDate", ">=", startOfMonth]],
      orderByClauses: [["purchaseDate", "desc"]],
    }
  );

  // Fetch user profile to get the budget
  const {
    data: userProfile,
    isLoading: isLoadingProfile, // <-- Renamed
    error: errorProfile,         // <-- Renamed
  } = useDocument(
    `artifacts/${appId}/users/${userId}/profile`,
    userId
  );

  // Calculate total spend
  const totalSpend = useMemo(() => {
    return purchases
      ? purchases.reduce((sum, item) => sum + item.price, 0)
      : 0;
  }, [purchases]);

  // Get budget from profile, default to 0 if not set
  const monthlyBudget = userProfile?.monthlyBudget || 0;
  const budgetRemaining = monthlyBudget - totalSpend;
  const budgetPercentage = monthlyBudget > 0 ? (totalSpend / monthlyBudget) * 100 : 0;


  // Process data for the category pie chart
  const categoryData = useMemo(() => {
    if (!purchases) return [];
    const grouped = purchases.reduce((acc, item) => {
      const category = item.category || "Other";
      if (!acc[category]) {
        acc[category] = 0;
      }
      acc[category] += item.price;
      return acc;
    }, {});

    return Object.entries(grouped).map(([name, value]) => ({
      name,
      value: parseFloat(value.toFixed(2)),
    }));
  }, [purchases]);

  const COLORS = [
    "#06b6d4",
    "#3b82f6",
    "#8b5cf6",
    "#ec4899",
    "#f97316",
    "#22c55e",
  ];

  // Combine loading states
  const isLoading = isLoadingPurchases || isLoadingProfile;
  const error = errorPurchases || errorProfile;


  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 size={32} className="animate-spin text-icon" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
        <strong>Error:</strong> Failed to load dashboard data. {error.message}
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
          className={`p-6 rounded-2xl bg-glass border border-border shadow-lg md:col-span-1`}
        >
          <h2 className="text-lg font-semibold mb-2">Total Spend This Month</h2>
          <p className="text-4xl font-bold">
            ${totalSpend.toFixed(2)}
          </p>
          {/* Budget Progress */}
          {monthlyBudget > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-xs mb-1">
                <span>Budget: ${monthlyBudget.toFixed(2)}</span>
                <span>Remaining: ${budgetRemaining.toFixed(2)}</span>
              </div>
              <div className="w-full bg-input rounded-full h-2.5">
                <div
                  className={`bg-primary h-2.5 rounded-full ${budgetPercentage > 100 ? 'bg-red-500' : ''}`}
                  style={{ width: `${Math.min(budgetPercentage, 100)}%` }}
                ></div>
              </div>
               {budgetRemaining < 0 && (
                 <p className="text-xs text-red-500 mt-1">Over budget!</p>
               )}
            </div>
          )}
        </div>

        {/* Widget 2: Category Breakdown */}
        <div
          className={`p-6 rounded-2xl bg-glass border border-border shadow-lg md:col-span-2 min-h-[300px]`}
        >
          <h2 className="text-lg font-semibold mb-2">Category Breakdown</h2>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {categoryData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => `$${value}`}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center pt-20">No spending data for this month yet.</p>
          )}
        </div>

        {/* Widget 3: Recent Purchases */}
        <div
          className={`p-6 rounded-2xl bg-glass border border-border shadow-lg md:col-span-3`}
        >
          <h2 className="text-lg font-semibold mb-4">Recent Purchases</h2>
          <div className="space-y-3">
            {purchases && purchases.length > 0 ? (
              purchases.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between items-center p-3 bg-input rounded-lg"
                >
                  <div>
                    <p className="font-medium">{item.displayName}</p>
                    <p className="text-xs text-text-secondary">{item.category}</p>
                  </div>
                  <p className="font-semibold">${item.price.toFixed(2)}</p>
                </div>
              ))
            ) : (
              <p>No purchases logged this month.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

