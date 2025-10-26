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
import {
  Loader2, Info, Eye, ShoppingBasket, Filter, Trash2, Pencil, PlusSquare // Keep existing icons
} from "lucide-react";
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


export const Dashboard = ({ openAddItemsToBill }) => {
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

   // Populate available years for filter based on all bills
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
                   return b - a; // Sort numerically descending
               })
           );
       }
   }, [allBills]);


   // Fetch recent bills based on selected year filter
   const {
       data: recentBills,
       isLoading: isLoadingBills,
       error: billsError,
   } = useCollection(
       userId && appId ? `artifacts/${appId}/users/${userId}/bills` : null,
       // useMemo ensures the query options object reference only changes when needed
       useMemo(() => {
           const options = {
               orderByClauses: [['purchaseDate', 'desc']]
               // Limit to 5 only if 'All' years is selected
               // No limit if a specific year is selected (show all for that year)
           };
           if (selectedYear === 'All') {
               options.docLimit = 5;
           } else {
               const year = Number(selectedYear);
               // Ensure year is valid before creating timestamps
               if (!isNaN(year)) {
                  const startOfYear = Timestamp.fromDate(new Date(year, 0, 1)); // Jan 1st of year
                  const endOfYear = Timestamp.fromDate(new Date(year + 1, 0, 1)); // Jan 1st of *next* year
                  options.whereClauses = [
                      ['purchaseDate', '>=', startOfYear],
                      ['purchaseDate', '<', endOfYear] // Use '<' end of year for correct range
                  ];
               }
           }
           return options;
       }, [userId, appId, selectedYear]) // Dependency array includes filter state
   );


   // Fetch user profile for budget
   const { data: userProfile, isLoading: isLoadingProfile } = useDocument(
     userId && appId ? `artifacts/${appId}/users/${userId}/profile` : null,
     userId
   );
   const monthlyBudget = userProfile?.monthlyBudget;


  // --- Calculations ---
  // Total spend for the current month (used in budget widget)
  const totalSpend = useMemo(() => {
    return purchases // Based on 'purchases' fetched for the current month
      ? purchases.reduce((sum, item) => sum + (item.price || 0), 0)
      : 0;
  }, [purchases]);

  // Budget progress percentage
   const budgetProgress = useMemo(() => {
     if (monthlyBudget === undefined || monthlyBudget === null || monthlyBudget <= 0) {
       return null; // No budget set or invalid budget
     }
     return (totalSpend / monthlyBudget) * 100;
   }, [totalSpend, monthlyBudget]);

   // Data formatted for the category breakdown pie chart (based on current month's purchases)
  const categoryData = useMemo(() => {
    if (!purchases) return [];
    const grouped = purchases.reduce((acc, item) => {
      const category = item.category || "Other";
      const price = item.price || 0;
      acc[category] = (acc[category] || 0) + price;
      return acc;
    }, {});

    return Object.entries(grouped).map(([name, value]) => ({
      name,
      value: parseFloat(value.toFixed(2)), // Ensure value is a number
    }));
  }, [purchases]);

  // Colors for the pie chart
  const COLORS = [
    "#9C27B0", "#3F51B5", "#2196F3", "#4CAF50", "#FFEB3B",
    "#FF9800", "#F44336", "#00BCD4", "#E91E63", "#8BC34A",
    "#FFC107", "#009688",
  ];

  // --- Loading/Error States ---
  if (isLoadingProfile || isLoadingAllBills) { // Initial load depends on profile and *all* bills (for year filter)
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 size={32} className="animate-spin text-icon" />
      </div>
    );
  }
   // Combined error check for any data fetching issue
   if (purchasesError || billsError) {
       console.error("Dashboard Data Error:", { purchasesError, billsError });
       return (
         <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mt-4">
           <strong>Error:</strong> Failed to load some dashboard data. Please try refreshing the page.
           {purchasesError && <p className="text-sm">- Purchases: {purchasesError.message}</p>}
           {billsError && <p className="text-sm">- Bills: {billsError.message}</p>}
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
              {/* Show spinner specifically for monthly purchases loading state */}
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
           {/* Budget Progress Bar & Info */}
           {monthlyBudget !== undefined && monthlyBudget !== null && monthlyBudget > 0 && (
             <div>
               <div className="flex justify-between text-xs text-text-secondary mb-1">
                 <span>Budget: {formatCurrency(monthlyBudget)}</span>
                 {/* Show progress only if purchases are loaded */}
                 <span>{isLoadingPurchases ? '...' : Math.max(0, budgetProgress || 0).toFixed(0)}% Used</span>
               </div>
               <div className="w-full bg-input rounded-full h-2.5 overflow-hidden"> {/* Added overflow-hidden */}
                 <div
                   className="bg-primary h-2.5 rounded-full transition-all duration-500 ease-out" // Added transition
                   style={{ width: `${isLoadingPurchases ? 0 : Math.min(100, Math.max(0, budgetProgress || 0))}%` }}
                 ></div>
               </div>
                {/* Show budget exceeded warning */}
                {(budgetProgress || 0) > 100 && !isLoadingPurchases && (
                     <p className="text-xs text-red-500 mt-1 font-medium">Budget exceeded!</p>
                )}
             </div>
           )}
           {/* Prompt to set budget if not set */}
           {(monthlyBudget === undefined || monthlyBudget === null || monthlyBudget <= 0) && !isLoadingProfile && (
               <p className="text-xs text-text-secondary mt-1">Set a budget in Settings to track progress.</p>
           )}
        </div>

        {/* Widget 2: Category Breakdown */}
        <div
          className={`p-6 rounded-2xl bg-glass border border-border shadow-lg md:col-span-2 min-h-[300px] flex flex-col`}
        >
          <h2 className="text-lg font-semibold mb-2">Category Breakdown (This Month)</h2>
           {/* Show spinner specifically for monthly purchases loading state */}
           {isLoadingPurchases ? (
               <LoadingSpinner />
           ) : purchases && purchases.length > 0 ? (
             // Render chart only if there's data
             <div className="flex-grow min-h-[250px]"> {/* Ensure minimum height for container */}
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%" cy="50%" outerRadius="80%" innerRadius="50%" // Doughnut style
                      fill="#8884d8" dataKey="value" nameKey="name" // Added nameKey
                      labelLine={false}
                      // Custom label formatter
                      label={({ name, percent, value }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {categoryData.map((entry, index) => (
                         // Apply colors cyclically
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    {/* Tooltip to show exact amount on hover */}
                    <Tooltip formatter={(value) => formatCurrency(value || 0)} />
                  </PieChart>
                </ResponsiveContainer>
             </div>
          ) : (
             // Show empty state if no purchases this month (and not loading)
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
                  {/* Year selection dropdown */}
                  <select
                      id="year-filter" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}
                      // Disable while loading *all* bills (needed for populating years)
                      disabled={isLoadingAllBills}
                      className="p-1 rounded-md bg-input border border-border focus:ring-1 focus:ring-primary focus:outline-none text-sm"
                  >
                      {availableYears.map(year => ( <option key={year} value={year}>{year}</option> ))}
                  </select>
              </div>
          </div>

           {/* Bill List */}
           {/* Show spinner specifically for *recent* bills loading state */}
           {isLoadingBills ? (
               <LoadingSpinner />
           ) : recentBills && recentBills.length > 0 ? (
             // Render list if bills exist for the filter
             <div className="space-y-3 max-h-60 overflow-y-auto pr-2"> {/* Scrollable container */}
                {recentBills.map((bill) => {
                    const formattedDate = formatDate(bill.purchaseDate);
                    const formattedTotal = bill.totalBill !== null && bill.totalBill !== undefined ? formatCurrency(bill.totalBill) : '';
                    return (
                        // Bill Item Row
                        <div key={bill.id} className="flex justify-between items-center p-3 bg-input rounded-lg border border-border group transition-shadow hover:shadow-md">
                          {/* Bill Info - clickable area */}
                          <div
                             className="flex items-center gap-3 flex-grow cursor-pointer overflow-hidden mr-2" // Added margin-right
                             onClick={() => openBillDetails(bill)}
                             title={`View details for ${bill.shopName}`} // Tooltip for info area
                          >
                            <ShoppingBasket size={20} className="text-icon opacity-80 flex-shrink-0" />
                            {/* Text content */}
                            <div className="flex-grow overflow-hidden">
                              <p className="font-medium group-hover:text-primary transition-colors truncate" title={bill.shopName}>{bill.shopName}</p>
                              <p className="text-xs text-text-secondary truncate" title={`${formattedDate} - ${bill.itemCount || 0} items ${formattedTotal && `- ${formattedTotal}`}`}>
                                  {formattedDate} - {bill.itemCount || 0} items {formattedTotal && `- ${formattedTotal}`}
                              </p>
                            </div>
                          </div>
                          {/* ACTION BUTTONS (Using Icons Consistently) */}
                          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                             {/* Add More Items Button */}
                             <button
                               onClick={(e) => { e.stopPropagation(); openAddItemsToBill(bill.id, bill.purchaseDate); }}
                               title="Add More Items"
                               className="p-1.5 text-text-secondary hover:text-green-500 transition-colors rounded hover:bg-green-500/10 focus:outline-none focus:ring-1 focus:ring-green-500" // Added focus style
                             >
                               <PlusSquare size={16} />
                             </button>
                             {/* Edit Bill Info Button */}
                             <button
                               onClick={(e) => { e.stopPropagation(); openEditBillModal(bill); }}
                               title="Edit Bill Info"
                               className="p-1.5 text-text-secondary hover:text-primary transition-colors rounded hover:bg-primary/10 focus:outline-none focus:ring-1 focus:ring-primary" // Added focus style
                             >
                               <Pencil size={16} />
                             </button>
                             {/* Delete Bill Button */}
                              <button
                                onClick={(e) => { e.stopPropagation(); openConfirmDelete(bill); }}
                                title="Delete Bill"
                                className="p-1.5 text-text-secondary hover:text-red-500 transition-colors rounded hover:bg-red-500/10 focus:outline-none focus:ring-1 focus:ring-red-500" // Added focus style
                              >
                               <Trash2 size={16} />
                             </button>
                             {/* View Details Button */}
                              <button
                                onClick={() => openBillDetails(bill)}
                                title="View Details"
                                className="p-1.5 text-text-secondary hover:text-blue-500 transition-colors rounded hover:bg-blue-500/10 focus:outline-none focus:ring-1 focus:ring-blue-500" // Added focus style
                              >
                                <Eye size={16}/>
                              </button>
                          </div>
                           {/* --- END ACTION BUTTONS --- */}
                        </div>
                    );
                })}
             </div>
           ) : (
              // Show appropriate empty state message if no bills found for the filter
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
       {/* Modal for Editing a Bill (passes initial data) */}
       <AddBillModal
            isOpen={isEditBillModalOpen}
            onClose={closeEditBillModal}
            onSuccess={closeEditBillModal} // Just close on success
            initialData={selectedBillForEdit}
        />
        {/* Confirmation Modal for Deleting a Bill */}
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