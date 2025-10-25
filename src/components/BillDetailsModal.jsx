import React, { useState, useCallback, useMemo } from 'react'; // Import useMemo
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { useCollection } from '../hooks/useCollection';
import { ConfirmModal } from './ConfirmModal';
import { handleDeleteItem, handleUpdateItem } from '../firebaseUtils'; // Import update function
import { formatCurrency, formatDate } from '../utils';
import { getCategoryIcon, CATEGORIES, UNITS } from '../constants'; // Import constants
import { X, Loader2, Store, Calendar as CalendarIcon, Hash, Trash2, Pencil, Check, Save } from 'lucide-react'; // Import new icons
import toast from 'react-hot-toast';

// --- Loading Spinner Component ---
const LoadingSpinner = () => (
    <div className="flex justify-center items-center py-10">
        <Loader2 size={24} className="animate-spin text-icon opacity-70" />
    </div>
);

// --- Edit Item Row (Inline Form) ---
const EditItemRow = ({ item, onSave, onCancel }) => {
    const { theme } = useTheme();
    // State to manage the form data for this row
    const [formData, setFormData] = useState({
        name: item.displayName || '',
        quantity: item.quantity || 1,
        unit: item.unit || 'pcs',
        category: item.category || 'Other',
        price: item.price || 0,
    });
    const [isSaving, setIsSaving] = useState(false);

    const handleChange = (e) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? parseFloat(value) || 0 : value
        }));
    };

    const handleSaveClick = async () => {
        if (!formData.name.trim() || formData.quantity <= 0 || formData.price < 0) {
            toast.error("Please enter a valid name, quantity, and price.");
            return;
        }
        setIsSaving(true);
        try {
            await onSave(item.id, item, formData); // Pass original item (oldData) and new formData
        } catch (err) {
            // Error toast is handled in the parent
            setIsSaving(false); // Ensure saving is reset on error
        }
        // Don't reset isSaving here; parent will close the edit state, unmounting this component
        // setIsSaving(false); 
    };

    return (
        <div className="p-2 bg-input rounded-lg border border-primary space-y-2">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {/* Name */}
                <input
                    type="text"
                    name="name"
                    placeholder="Item Name"
                    value={formData.name}
                    onChange={handleChange}
                    className={`col-span-2 w-full p-2 rounded-md bg-background border border-border text-sm`}
                    disabled={isSaving}
                />
                 {/* Price */}
                <input
                    type="number"
                    name="price"
                    step="0.01"
                    placeholder="Price"
                    value={formData.price}
                    onChange={handleChange}
                    className={`w-full p-2 rounded-md bg-background border border-border text-sm`}
                    disabled={isSaving}
                />
                {/* Quantity */}
                <input
                    type="number"
                    name="quantity"
                    placeholder="Qty"
                    value={formData.quantity}
                    onChange={handleChange}
                    className={`w-full p-2 rounded-md bg-background border border-border text-sm`}
                    disabled={isSaving}
                />
                {/* Unit */}
                <select
                    name="unit"
                    value={formData.unit}
                    onChange={handleChange}
                    className={`w-full p-2 rounded-md bg-background border border-border text-sm`}
                    disabled={isSaving}
                >
                    {UNITS.map(unit => <option key={unit} value={unit}>{unit}</option>)}
                </select>
                {/* Category */}
                 <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className={`col-span-2 sm:col-span-1 w-full p-2 rounded-md bg-background border border-border text-sm`}
                    disabled={isSaving}
                >
                    {CATEGORIES.map(cat => <option key={cat.name} value={cat.name}>{cat.name}</option>)}
                </select>
               
            </div>
            {/* Actions */}
            <div className="flex justify-end gap-2">
                <button
                    onClick={onCancel}
                    disabled={isSaving}
                    className="p-1 text-text-secondary hover:text-red-500 transition-colors"
                >
                    <X size={18} />
                </button>
                <button
                    onClick={handleSaveClick}
                    disabled={isSaving}
                    className="p-1 text-text-secondary hover:text-green-500 transition-colors"
                >
                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                </button>
            </div>
        </div>
    );
};

// --- Display Item Row (Normal View) ---
const DisplayItemRow = ({ item, onEdit, onDelete }) => {
    const CategoryIcon = getCategoryIcon(item.category);
    return (
        <div className="flex justify-between items-center p-2 bg-background rounded group">
            <div className="flex items-center gap-2 overflow-hidden">
                <CategoryIcon size={18} className="text-icon flex-shrink-0" />
                <div className="overflow-hidden">
                    <p className="font-medium truncate" title={item.displayName}>{item.displayName}</p>
                    <p className="text-xs text-text-secondary">
                        {item.quantity} {item.unit} - {item.category}
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                <p className="font-semibold text-sm">{formatCurrency(item.price || 0)}</p>
                {/* Edit & Delete Buttons */}
                <button
                    onClick={onEdit}
                    title="Edit Item"
                    className="p-1 text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity rounded hover:text-primary hover:bg-primary/10"
                >
                    <Pencil size={16} />
                </button>
                <button
                    onClick={onDelete}
                    title="Delete Item"
                    className="p-1 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity rounded hover:bg-red-500/10"
                >
                    <Trash2 size={16} />
                </button>
            </div>
        </div>
    );
};


// --- Main Bill Details Modal Component ---
export const BillDetailsModal = ({ isOpen, onClose, bill }) => {
  const { theme } = useTheme();
  const { userId, appId } = useAuth();

  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [editingItemId, setEditingItemId] = useState(null); // ID of item being edited
  const [isSavingEdit, setIsSavingEdit] = useState(false); // Loading state for inline edit

  const {
      data: items,
      isLoading,
      error
  } = useCollection(
      isOpen && bill?.id && userId && appId
          ? `artifacts/${appId}/users/${userId}/purchases`
          : null,
      {
          whereClauses: [['billId', '==', bill?.id]],
          // Removed orderBy to prevent index error
      }
  );

  // --- FIX: MOVED useMemo HOOK *BEFORE* THE EARLY RETURN ---
  // Sort items client-side (e.g., by name) since we removed Firestore sorting
  const sortedItems = useMemo(() => {
      if (!items) return [];
      return [...items].sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [items]);


  // --- Delete Item Handlers ---
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
      closeConfirmDeleteItem();
      try {
          await handleDeleteItem(purchaseId, billId, itemData, userId, appId);
          toast.success(`Deleted item: ${itemData.displayName}`);
      } catch (err) {
          console.error("Failed to delete item:", err);
          toast.error(`Error deleting item: ${err.message}`);
      }
  };

  // --- Edit Item Handlers ---
  const handleEditClick = (itemId) => {
      setEditingItemId(itemId);
  };
  const handleCancelEdit = () => {
      setEditingItemId(null);
  };
  const handleSaveEdit = async (purchaseId, oldData, newData) => {
      setIsSavingEdit(true);
      try {
          // Pass all required data to the update function
          await handleUpdateItem(purchaseId, oldData, newData, userId, appId);
          toast.success("Item updated successfully!");
          setEditingItemId(null); // Close edit row
      } catch (err) {
          console.error("Failed to update item:", err);
          toast.error(`Error updating item: ${err.message}`);
      } finally {
          setIsSavingEdit(false);
      }
  };


  if (!isOpen || !bill) return null;

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
            <button onClick={onClose} className={`p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10`}>
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
            
            {!isLoading && !error && sortedItems && sortedItems.length > 0 ? (
              sortedItems.map((item) => (
                 // Conditionally render EditRow or DisplayRow
                 editingItemId === item.id ? (
                    <EditItemRow
                        key={item.id}
                        item={item}
                        onSave={handleSaveEdit}
                        onCancel={handleCancelEdit}
                    />
                 ) : (
                    <DisplayItemRow
                        key={item.id}
                        item={item}
                        onEdit={() => handleEditClick(item.id)}
                        onDelete={() => openConfirmDeleteItem(item.id, item)}
                    />
                 )
              ))
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

    