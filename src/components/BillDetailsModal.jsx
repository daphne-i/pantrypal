import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCollection } from '../hooks/useCollection';
import { getCategoryIcon } from '../constants';
import { X, Loader2, Info, ShoppingBasket, Calendar, DollarSign, Package } from 'lucide-react';

// Helper to format currency (example, adjust as needed)
const formatCurrency = (amount) => {
    // Basic formatting, consider a library for more robust needs
    return `$${Number(amount).toFixed(2)}`;
}

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

export const BillDetailsModal = ({ isOpen, onClose, bill }) => {
    const { userId, appId } = useAuth();

    // Fetch purchases associated with the selected billId
    const {
        data: items,
        isLoading,
        error
    } = useCollection(
        userId && appId && bill?.id ? `artifacts/${appId}/users/${userId}/purchases` : null,
        {
            whereClauses: [['billId', '==', bill?.id]],
            // Optional: Order items within the bill, e.g., by name
            // orderByClauses: [['displayName', 'asc']]
        }
    );

    if (!isOpen || !bill) return null;

    // Safely format date
    const formattedDate = bill.purchaseDate?.toDate ? bill.purchaseDate.toDate().toLocaleDateString() : 'N/A';
    const formattedTotal = bill.totalBill !== null && bill.totalBill !== undefined ? formatCurrency(bill.totalBill) : 'Not set';

    return (
        // Backdrop
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          {/* Modal Content */}
          <div
            className={`w-full max-w-lg p-6 rounded-2xl bg-glass border border-border shadow-xl z-50 flex flex-col max-h-[90vh]`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-4 pb-4 border-b border-border">
              <h2 className="text-2xl font-bold">Purchase Details</h2>
              <button
                onClick={onClose}
                className={`p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10`}
              >
                <X size={20} />
              </button>
            </div>

            {/* Bill Info */}
            <div className="mb-4 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                    <ShoppingBasket size={16} className="text-text-secondary"/>
                    <span>Shop: <span className="font-medium">{bill.shopName}</span></span>
                </div>
                 <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-text-secondary"/>
                    <span>Date: <span className="font-medium">{formattedDate}</span></span>
                </div>
                 <div className="flex items-center gap-2">
                    <DollarSign size={16} className="text-text-secondary"/>
                    <span>Total Bill: <span className="font-medium">{formattedTotal}</span></span>
                </div>
                 <div className="flex items-center gap-2">
                    <Package size={16} className="text-text-secondary"/>
                    <span>Items Logged: <span className="font-medium">{bill.itemCount || 0}</span></span>
                </div>
            </div>

            {/* Items List */}
            <div className="flex-grow overflow-y-auto border-t border-border pt-4">
                 <h3 className="text-lg font-semibold mb-2">Items ({isLoading ? '...' : items?.length ?? 0})</h3>
                 {isLoading ? (
                     <LoadingSpinner />
                 ) : error ? (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg text-sm">
                        <strong>Error:</strong> Failed to load items for this bill.
                    </div>
                 ) : items && items.length > 0 ? (
                    <div className="space-y-2 pr-2">
                        {items.map((item) => {
                            const Icon = getCategoryIcon(item.category);
                            return (
                                <div key={item.id} className={`p-2 rounded-md border border-border bg-input flex items-center gap-3`}>
                                    <Icon size={20} className="text-icon opacity-80 flex-shrink-0" />
                                    <div className="flex-grow">
                                        <p className="font-medium">{item.displayName}</p>
                                        <p className="text-xs text-text-secondary">
                                            {item.quantity || ''} {item.unit || ''} - {item.category || 'Other'}
                                        </p>
                                    </div>
                                    <p className="font-semibold text-sm mr-2">{formatCurrency(item.price || 0)}</p>
                                    {/* Add Edit/Delete buttons here later if needed */}
                                </div>
                            );
                        })}
                    </div>
                 ) : (
                    <EmptyState message="No items were logged for this bill entry." />
                 )}
            </div>

            {/* Footer Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-border mt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className={`px-5 py-2 rounded-lg font-medium bg-primary text-primary-text primary-hover transition-colors`}
                >
                  Close
                </button>
            </div>

          </div>
        </div>
    );
};
