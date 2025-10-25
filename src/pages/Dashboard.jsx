import React, { useState, useMemo, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../hooks/useAuth";
import { useCollection } from "../hooks/useCollection";
import { useDocument } from "../hooks/useDocument";
import { BillDetailsModal } from "../components/BillDetailsModal";
import { AddBillModal } from "../components/AddBillModal";
import { ConfirmModal } from "../components/ConfirmModal";
import { formatCurrency, formatDate } from '../utils';
import { handleDeleteBill } from "../firebaseUtils";
import toast from 'react-hot-toast';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Loader2, Info, Eye, ShoppingBasket, Filter, Trash2, Pencil } from "lucide-react";
import { Timestamp } from "firebase/firestore";

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

  // --- Modal States ---
  const [isBillDetailsOpen, setIsBillDetailsOpen] = useState(false);
  const [selectedBillForDetails, setSelectedBillForDetails] = useState(null);
  const [isEditBillModalOpen, setIsEditBillModalOpen] = useState(false);
  const [selectedBillForEdit, setSelectedBillForEdit] = useState(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [billToDelete, setBillToDelete] = useState(null);

  // --- Filter State ---
  const [selectedYear, setSelectedYear] = useState('All');
  const [availableYears, setAvailableYears] = useState(['All']);

  // --- Modal Open/Close Handlers ---
  const openBillDetails = (bill) => {
      setSelectedBillForDetails(bill);
      setIsBillDetailsOpen(true);
  };
  const closeBillDetails = () => {
      setIsBillDetailsOpen(false);
      setSelectedBillForDetails(null);
  };
  const openEditBillModal = (bill) => {
      setSelectedBillForEdit(bill);
      setIsEditBillModalOpen(true);
  };
  const closeEditBillModal = () => {
      setIsEditBillModalOpen(false);
      setSelectedBillForEdit(null);
  };
   const openConfirmDelete = (bill) => {
        setBillToDelete(bill);
        setIsConfirmDeleteOpen(true);
    };
    const closeConfirmDelete = () => {
        setIsConfirmDeleteOpen(false);
        setBillToDelete(null);
    };

    // --- Delete Handler ---
    const confirmDeleteBill = async () => {
        if (!billToDelete) return;
        const billIdToDelete = billToDelete.id;
        closeConfirmDelete();
        try {
            await handleDeleteBill(billIdToDelete, userId, appId);
            toast.success("Bill and associated items deleted.");
        } catch (error) {
            console.error("Failed to delete bill:", error);
            toast.error(`Error deleting bill: ${error.message}`);
        }
    };


  // --- Data Fetching ---
  const {
    data: purchases,
    isLoading: isLoadingPurchases,
    error: purchasesError,
  } = useCollection(
    userId && appId ? `artifacts/${appId}/users/${userId}/purchases` : null,
    {
      whereClauses: [["purchaseDate", ">=", startOfMonth]],
    }
  );

   const { data: allBills, isLoading: isLoadingAllBills } = useCollection(
       userId && appId ? `artifacts/${appId}/users/${userId}/bills` : null,
       {
           orderByClauses: [['purchaseDate', 'desc']]
       }
   );

   useEffect(() => {
       if (allBills) {
           const years = new Set(['All']);
           allBills.forEach(bill => {
               if (bill.purchaseDate?.toDate) {
                   years.add(bill.purchaseDate.toDate().getFullYear());
               }
           });
           setAvailableYears(
               [...years].sort((a, b) => {
                   if (a === 'All') return -1;
                   if (b === 'All') return 1;
                   return b - a;
               })
           );
       }
   }, [allBills]);


   const {
       data: recentBills,
       isLoading: isLoadingBills,
       error: billsError,
   } = useCollection(
       userId && appId ? `artifacts/${appId}/users/${userId}/bills` : null,
       useMemo(() => {
           const options = {
               orderByClauses: [['purchaseDate', 'desc']],
               docLimit: selectedYear === 'All' ? 5 : undefined
           };
           if (selectedYear !== 'All') {
               const year = Number(selectedYear);
               const startOfYear = Timestamp.fromDate(new Date(year, 0, 1));
               const endOfYear = Timestamp.fromDate(new Date(year + 1, 0, 1));
               options.whereClauses = [
                   ['purchaseDate', '>=', startOfYear],
                   ['purchaseDate', '<', endOfYear]
               ];
           }
           return options;
       }, [userId, appId, selectedYear])
   );


   const { data: userProfile, isLoading: isLoadingProfile } = useDocument(
     userId && appId ? `artifacts/${appId}/users/${userId}/profile` : null,
     userId
   );
   const monthlyBudget = userProfile?.monthlyBudget;


  // --- Calculations ---
  const totalSpend = useMemo(() => {
    return purchases
      ? purchases.reduce((sum, item) => sum + (item.price || 0), 0)
      : 0;
  }, [purchases]);

   const budgetProgress = useMemo(() => {
     if (monthlyBudget === undefined || monthlyBudget === null || monthlyBudget <= 0) {
       return null;
     }
     return (totalSpend / monthlyBudget) * 100;
   }, [totalSpend, monthlyBudget]);


  const categoryData = useMemo(() => {
    if (!purchases) return [];
    const grouped = purchases.reduce((acc, item) => {
      const category = item.category || "Other";
      const price = item.price || 0;
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

  if (isLoadingProfile || isLoadingAllBills) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 size={32} className="animate-spin text-icon" />
      </div>
    );
  }

   if (purchasesError || billsError) {
       console.error("Dashboard Data Error:", { purchasesError, billsError });
       return (
         <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
           <strong>Error:</strong> Failed to load some dashboard data. Please check console.
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
              {isLoadingPurchases ? (
                   <div className="h-10 my-1 flex items-center">
                      <Loader2 size={24} className="animate-spin text-icon opacity-50" />
                   </div>
              ) : (
                  <p className="text-4xl font-bold mb-4">
                    {formatCurrency(totalSpend)}
                  </p>
              )}
          </div>
          {/* Budget Progress Bar */}
           {monthlyBudget !== undefined && monthlyBudget !== null && monthlyBudget > 0 && (
             <div>
               <div className="flex justify-between text-xs text-text-secondary mb-1">
                 <span>Budget: {formatCurrency(monthlyBudget)}</span>
                 <span>{isLoadingPurchases ? '...' : Math.max(0, budgetProgress || 0).toFixed(0)}% Used</span>
               </div>
               <div className="w-full bg-input rounded-full h-2.5">
                 <div
                   className="bg-primary h-2.5 rounded-full transition-all duration-300"
                   style={{ width: `${isLoadingPurchases ? 0 : Math.min(100, Math.max(0, budgetProgress || 0))}%` }}
                 ></div>
               </div>
                {(budgetProgress || 0) > 100 && !isLoadingPurchases && (
                     <p className="text-xs text-red-500 mt-1 font-medium">Budget exceeded!</p>
                )}
             </div>
           )}
           {(monthlyBudget === undefined || monthlyBudget === null || monthlyBudget <= 0) && !isLoadingProfile && (
               <p className="text-xs text-text-secondary mt-1">Set a budget in Settings to track progress.</p>
           )}

        </div>

        {/* Widget 2: Category Breakdown */}
        <div
          className={`p-6 rounded-2xl bg-glass border border-border shadow-lg md:col-span-2 min-h-[300px] flex flex-col`}
        >
          <h2 className="text-lg font-semibold mb-2">Category Breakdown (This Month)</h2>
           {isLoadingPurchases ? (
               <LoadingSpinner />
           ) : purchases && purchases.length > 0 ? (
             // --- FIX: Gave ResponsiveContainer a fixed height to fix warning ---
             <div className="flex-grow min-h-[300px]">
                <ResponsiveContainer width="100%" height={300}>
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
                       label={({ name, percent, value }) => `${name} (${formatCurrency(value)})`}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [formatCurrency(value || 0), name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
             </div>
          ) : (
             <EmptyState message="No spending data for this month yet." />
          )}
        </div>

        {/* Widget 3: RECENT BILLS with Filter & Actions */}
        <div
          className={`p-6 rounded-2xl bg-glass border border-border shadow-lg md:col-span-3`}
        >
          {/* Header with Title and Filter */}
          <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-3">
              <h2 className="text-lg font-semibold">Recent Bills</h2>
              <div className="flex items-center gap-2 text-sm">
                  <Filter size={16} className="text-text-secondary" />
                  <label htmlFor="year-filter" className="font-medium">Year:</label>
                  <select
                      id="year-filter"
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      disabled={isLoadingAllBills}
                      className="p-1 rounded-md bg-input border border-border focus:ring-1 focus:ring-primary focus:outline-none text-sm"
                  >
                      {availableYears.map(year => (
                          <option key={year} value={year}>
                              {year}
                          </option>
                      ))}
                  </select>
              </div>
          </div>

           {/* Bill List */}
           {isLoadingBills ? (
               <LoadingSpinner />
           ) : recentBills && recentBills.length > 0 ? (
             <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                {recentBills.map((bill) => {
                    const formattedDate = formatDate(bill.purchaseDate);
                    const formattedTotal = bill.totalBill !== null && bill.totalBill !== undefined ? formatCurrency(bill.totalBill) : '';
                    return (
                        <div key={bill.id} className="flex justify-between items-center p-3 bg-input rounded-lg border border-border group">
                          {/* Bill Info - clickable */}
                          <div className="flex items-center gap-3 flex-grow cursor-pointer" onClick={() => openBillDetails(bill)}>
                            <ShoppingBasket size={20} className="text-icon opacity-80 flex-shrink-0" />
                            <div className="flex-grow">
                              <p className="font-medium group-hover:text-primary transition-colors">{bill.shopName}</p>
                              <p className="text-xs text-text-secondary">
                                  {formattedDate} - {bill.itemCount || 0} items {formattedTotal && `- ${formattedTotal}`}
                              </p>
                            </div>
                          </div>
                          {/* Action Buttons */}
                          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                             <button
                               onClick={(e) => { e.stopPropagation(); openEditBillModal(bill); }}
                               title="Edit Bill"
                               className="p-1 text-text-secondary hover:text-primary transition-colors rounded hover:bg-primary/10"
                             >
                               <Pencil size={16} />
                             </button>
                             <button
                               onClick={(e) => { e.stopPropagation(); openConfirmDelete(bill); }}
                               title="Delete Bill"
                               className="p-1 text-text-secondary hover:text-red-500 transition-colors rounded hover:bg-red-500/10"
                              >
                               <Trash2 size={16} />
                             </button>
                              <button
                                onClick={() => openBillDetails(bill)}
                                title="View Details"
                                className="p-1 text-text-secondary hover:text-primary transition-colors rounded hover:bg-primary/10"
                              >
                                <Eye size={18}/>
                              </button>
                          </div>
                        </div>
                    );
                })}
             </div>
           ) : (
              <EmptyState message={selectedYear === 'All' ? "No bills logged yet." : `No bills found for ${selectedYear}.`} />
           )}
        </div>
      </div>

       {/* Render Modals */}
       <BillDetailsModal
           isOpen={isBillDetailsOpen}
           onClose={closeBillDetails}
           bill={selectedBillForDetails}
       />
       <AddBillModal
            isOpen={isEditBillModalOpen}
            onClose={closeEditBillModal}
            onSuccess={closeEditBillModal}
            initialData={selectedBillForEdit}
        />
        <ConfirmModal
            isOpen={isConfirmDeleteOpen}
            onClose={closeConfirmDelete}
            onConfirm={confirmDeleteBill}
            title="Delete Bill?"
            message={`Are you sure you want to delete the bill from "${billToDelete?.shopName}" on ${formatDate(billToDelete?.purchaseDate)}? This will also delete all ${billToDelete?.itemCount || 0} associated items. This action cannot be undone.`}
            confirmText="Yes, Delete Bill"
        />
    </div>
  );
};

