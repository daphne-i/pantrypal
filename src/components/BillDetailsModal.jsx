import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { useCollection } from '../hooks/useCollection';
import { ConfirmModal } from './ConfirmModal';
import { handleDeleteItem } from '../firebaseUtils';
import { formatCurrency, formatDate } from '../utils';
import { getCategoryIcon } from '../constants';
import { X, Loader2, Store, Calendar as CalendarIcon, Hash, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

// Simple component for loading state within a section
const LoadingSpinner = () => (
    <div className="flex justify-center items-center py-10">
        <Loader2 size={24} className="animate-spin text-icon opacity-70" />
    </div>
);

export const BillDetailsModal = ({ isOpen, onClose, bill }) => {
  const { theme } = useTheme();
  const { userId, appId } = useAuth();

  // --- Confirmation Modal State ---
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null); // { id: purchaseId, data: itemData }

  // Fetch items associated with the selected bill ID
  const {
      data: items,
      isLoading,
      error
  } = useCollection(
      // Only fetch if modal is open and bill is selected
      isOpen && bill?.id && userId && appId
          ? `artifacts/${appId}/users/${userId}/purchases`
          : null,
      {
          whereClauses: [['billId', '==', bill?.id]],
          // --- FIX: Removed orderBy clause to prevent index error ---
          // orderByClauses: [['createdAt', 'asc']] 
      }
  );

  // --- Delete Handlers ---
  const openConfirmDeleteItem = (purchaseId, itemData) => {
      setItemToDelete({ id: purchaseId, data: itemData });
      setIsConfirmDeleteOpen(true);
  };

  const closeConfirmDeleteItem = () => {
      setIsConfirmDeleteOpen(false);
      setItemToDelete(null);
  };

  const confirmDeleteItem = async () => {
      if (!itemToDelete) return;

      const { id: purchaseId, data: itemData } = itemToDelete;
      const billId = bill?.id;

      closeConfirmDeleteItem(); // Close modal immediately

      try {
          await handleDeleteItem(purchaseId, billId, itemData, userId, appId);
          toast.success(`Deleted item: ${itemData.displayName}`);
          // Data will refresh automatically due to useCollection hook
      } catch (err) {
          console.error("Failed to delete item:", err);
          toast.error(`Error deleting item: ${err.message}`);
      }
  };


  if (!isOpen || !bill) return null;

  // Format details for display
  const formattedDate = formatDate(bill.purchaseDate);
  const formattedTotal = bill.totalBill !== null && bill.totalBill !== undefined ? formatCurrency(bill.totalBill) : 'Not set';

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className={`w-full max-w-lg p-6 rounded-2xl bg-glass border border-border shadow-xl z-50 flex flex-col max-h-[80vh]`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-4 pb-4 border-b border-border">
            <h2 className="text-2xl font-bold">Purchase Details</h2>
            <button
              onClick={onClose}
              className={`p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10`}
            >
              <X size={20} />
            </button>
          </div>

          {/* Bill Info */}
          <div className="mb-4 space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Store size={16} className="text-icon opacity-80" />
              <span className="font-semibold">Shop:</span>
              <span>{bill.shopName}</span>
            </div>
            <div className="flex items-center gap-2">
              <CalendarIcon size={16} className="text-icon opacity-80" />
              <span className="font-semibold">Date:</span>
              <span>{formattedDate}</span>
            </div>
            <div className="flex items-center gap-2">
              <Hash size={16} className="text-icon opacity-80" />
              <span className="font-semibold">Total Bill:</span>
              <span>{formattedTotal}</span>
            </div>
            <div className="flex items-center gap-2">
                <Hash size={16} className="text-icon opacity-80" />
                <span className="font-semibold">Items Logged:</span>
                <span>{bill.itemCount || 0}</span>
            </div>
          </div>

          {/* Items List */}
          <h3 className="text-lg font-semibold mb-2">Items ({isLoading ? '...' : items?.length || 0})</h3>
          <div className="flex-grow overflow-y-auto pr-2 space-y-2 bg-input/50 p-3 rounded-lg border border-border">
            {isLoading && <LoadingSpinner />}
            {error && <p className="text-red-500">Error loading items: {error.message}</p>}
            {!isLoading && !error && items && items.length > 0 ? (
              items.map((item) => {
                const CategoryIcon = getCategoryIcon(item.category);
                return (
                  <div key={item.id} className="flex justify-between items-center p-2 bg-background rounded group">
                    <div className="flex items-center gap-2">
                      <CategoryIcon size={18} className="text-icon flex-shrink-0" />
                      <div>
                        <p className="font-medium">{item.displayName}</p>
                        <p className="text-xs text-text-secondary">
                          {item.quantity} {item.unit} - {item.category}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                         <p className="font-semibold text-sm">{formatCurrency(item.price || 0)}</p>
                         {/* Delete Button */}
                         <button
                           onClick={() => openConfirmDeleteItem(item.id, item)}
                           title="Delete Item"
                           className="p-1 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity rounded hover:bg-red-500/10"
                         >
                           <Trash2 size={16} />
                         </button>
                    </div>
                  </div>
                );
              })
            ) : (
              !isLoading && !error && <p className="text-center text-text-secondary py-4">No items found for this bill.</p>
            )}
          </div>

          {/* Footer/Close Button */}
          <div className="flex justify-end pt-4 mt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-lg font-medium hover:bg-black/10 dark:hover:bg-white/10 transition-colors`}
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Item Deletion */}
      <ConfirmModal
          isOpen={isConfirmDeleteOpen}
          onClose={closeConfirmDeleteItem}
          onConfirm={confirmDeleteItem}
          title="Delete Item?"
          message={`Are you sure you want to delete "${itemToDelete?.data.displayName}"? This action cannot be undone.`}
          confirmText="Yes, Delete Item"
      />
    </>
  );
};

