import React, { useState, useEffect, useRef, useMemo } from "react"; // <-- Added useMemo here
import toast from 'react-hot-toast';
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../hooks/useAuth";
import { handleSaveItems } from "../firebaseUtils";
import { CATEGORIES, UNITS, getCategoryIcon } from "../constants";
import { Timestamp } from "firebase/firestore"; // Import Timestamp directly
import { X, Loader2, Plus, Check, Trash2, Edit2, Package, Hash, CircleDollarSign } from "lucide-react";

// Helper to format currency (example, adjust as needed)
const formatCurrency = (amount) => {
    // Basic formatting, consider a library for more robust needs
    return `$${Number(amount).toFixed(2)}`;
}

export const AddItemsModal = ({ isOpen, onClose, billId, billData }) => {
  const { theme } = useTheme();
  const { userId, appId } = useAuth();

  // State for the form fields
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState("1"); // Default to 1
  const [unit, setUnit] = useState(UNITS[0]); // Default to first unit
  const [category, setCategory] = useState(CATEGORIES[0].name); // Default to first category
  const [price, setPrice] = useState(""); // This is TOTAL price for the item line

  // State for items added in this session
  const [itemsToAdd, setItemsToAdd] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null); // Index of item being edited

  // State for saving process
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  const nameInputRef = useRef(null); // Ref to focus name input

  // Reset all state when modal closes or billId changes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => { // Delay reset to allow closing animation
        setItemsToAdd([]);
        resetFormFields();
        setError(null);
        setIsSaving(false);
        setEditingIndex(null);
      }, 300);
    } else {
        // Focus name input when modal opens
        nameInputRef.current?.focus();
    }
  }, [isOpen, billId]); // Also reset if the bill context changes while open

  // Function to reset only the input fields
  const resetFormFields = () => {
    setItemName("");
    setQuantity("1");
    setUnit(UNITS[0]);
    setCategory(CATEGORIES[0].name);
    setPrice("");
    setEditingIndex(null); // Exit editing mode
  };

  const handleAddItem = () => {
    setError(null);
    // Validation
    const name = itemName.trim();
    const qty = parseFloat(quantity);
    const itemPrice = parseFloat(price);

    if (!name || !quantity || !unit || !category || !price) {
        setError("Please fill in all item details.");
        return;
    }
    if (isNaN(qty) || qty <= 0) {
        setError("Please enter a valid positive quantity.");
        return;
    }
     if (isNaN(itemPrice) || itemPrice <= 0) {
        setError("Please enter a valid positive price.");
        return;
    }

    const newItem = {
        name: name,
        quantity: qty,
        unit: unit,
        category: category,
        price: itemPrice,
        // Include purchaseDate from billData if available
        purchaseDate: billData?.purchaseDate ? new Date(billData.purchaseDate) : null
    };

    if (editingIndex !== null) {
        // Update existing item
        const updatedItems = [...itemsToAdd];
        updatedItems[editingIndex] = newItem;
        setItemsToAdd(updatedItems);
        toast.success(`"${name}" updated.`);
    } else {
       // Add new item
       setItemsToAdd(prevItems => [...prevItems, newItem]);
       toast.success(`"${name}" added to list.`);
    }

    resetFormFields();
    nameInputRef.current?.focus(); // Focus name input for next item
  };

  const handleEditItem = (index) => {
      const itemToEdit = itemsToAdd[index];
      setItemName(itemToEdit.name);
      setQuantity(String(itemToEdit.quantity));
      setUnit(itemToEdit.unit);
      setCategory(itemToEdit.category);
      setPrice(String(itemToEdit.price));
      setEditingIndex(index);
      nameInputRef.current?.focus(); // Focus name input for editing
  };

  const handleDeleteItem = (index) => {
      const itemToDelete = itemsToAdd[index];
      setItemsToAdd(prevItems => prevItems.filter((_, i) => i !== index));
      toast.error(`"${itemToDelete.name}" removed.`);
      // If we were editing the deleted item, exit editing mode
      if (editingIndex === index) {
          resetFormFields();
      }
  };


  const handleSaveAllAndClose = async () => {
    if (itemsToAdd.length === 0) {
      setError("Add at least one item before saving.");
      return;
    }
    if (!userId || !appId || !billId) {
        setError("Cannot save. Missing user, app, or bill ID.");
        return;
    }

    setIsSaving(true);
    setError(null);
    const toastId = toast.loading(`Saving ${itemsToAdd.length} item(s)...`);

    try {
        // Convert purchaseDate back to Timestamp before saving if needed,
        // or let handleSaveItems handle it with serverTimestamp()
        const itemsWithDate = itemsToAdd.map(item => ({
            ...item,
            // Pass the original date from billData if available, let Firestore convert
            purchaseDate: billData?.purchaseDate ? Timestamp.fromDate(new Date(billData.purchaseDate)) : serverTimestamp()
        }));

        await handleSaveItems(itemsWithDate, billId, userId, appId);
        toast.success(`${itemsToAdd.length} item(s) saved successfully!`, { id: toastId });
        onClose(); // Close the modal on success

    } catch (err) {
      console.error("Error saving items: ", err);
      setError("Failed to save items. Please try again.");
      toast.error(`Failed to save items: ${err.message}`, { id: toastId });
      setIsSaving(false); // Only set saving to false on error
    }
  };

  // Calculate total price of items added so far in this session
  const currentItemsTotal = useMemo(() => {
    return itemsToAdd.reduce((sum, item) => sum + item.price, 0);
  }, [itemsToAdd]);


  if (!isOpen) return null;

  return (
    // Backdrop
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" // Darker backdrop
      onClick={onClose} // Close if backdrop is clicked
    >
      {/* Modal Content */}
      <div
        className={`w-full max-w-2xl p-6 rounded-2xl bg-glass border border-border shadow-xl z-50 flex flex-col max-h-[90vh]`} // Larger, taller modal
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4 pb-4 border-b border-border">
          <div>
              <h2 className="text-2xl font-bold">Add Items to Purchase</h2>
              <p className="text-sm text-text-secondary">
                  Shop: {billData?.shopName || 'N/A'} | Date: {billData?.purchaseDate ? new Date(billData.purchaseDate).toLocaleDateString() : 'N/A'}
              </p>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10`}
            disabled={isSaving}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form for adding a single item */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-4 items-end">
             {/* Item Name ( Wider ) */}
             <div className="md:col-span-2 relative">
                <label className="block text-xs font-medium mb-1">Item Name</label>
                 <Package size={16} className="absolute left-2.5 top-[34px] text-text-secondary" />
                <input
                  ref={nameInputRef}
                  type="text"
                  placeholder="e.g., Apple"
                  className={`w-full p-2 pl-8 rounded-md bg-input border border-border focus:ring-1 focus:ring-primary focus:outline-none`}
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  disabled={isSaving}
                />
             </div>

              {/* Quantity */}
              <div className="relative">
                <label className="block text-xs font-medium mb-1">Qty</label>
                <Hash size={16} className="absolute left-2.5 top-[34px] text-text-secondary" />
                <input
                  type="number"
                  step="0.1" // Allow decimals for weight
                  min="0.1"
                  placeholder="1"
                  className={`w-full p-2 pl-8 rounded-md bg-input border border-border focus:ring-1 focus:ring-primary focus:outline-none`}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  disabled={isSaving}
                />
             </div>

              {/* Unit */}
              <div>
                <label className="block text-xs font-medium mb-1">Unit</label>
                <select
                  className={`w-full p-2 rounded-md bg-input border border-border focus:ring-1 focus:ring-primary focus:outline-none appearance-none`}
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  disabled={isSaving}
                >
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
             </div>

             {/* Category */}
              <div>
                <label className="block text-xs font-medium mb-1">Category</label>
                <select
                  className={`w-full p-2 rounded-md bg-input border border-border focus:ring-1 focus:ring-primary focus:outline-none appearance-none`}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={isSaving}
                >
                  {CATEGORIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
             </div>

             {/* Price (Total for item line) */}
             <div className="relative">
                <label className="block text-xs font-medium mb-1">Total Price</label>
                <CircleDollarSign size={16} className="absolute left-2.5 top-[34px] text-text-secondary" />
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="57.00"
                  className={`w-full p-2 pl-8 rounded-md bg-input border border-border focus:ring-1 focus:ring-primary focus:outline-none`}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  disabled={isSaving}
                />
             </div>

             {/* Add/Update Button */}
             <button
                type="button"
                onClick={handleAddItem}
                className={`flex items-center justify-center gap-1 p-2 rounded-md font-medium ${editingIndex !== null ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-primary primary-hover'} text-primary-text transition-colors disabled:opacity-70`}
                disabled={isSaving || !itemName || !price || !quantity}
             >
                {editingIndex !== null ? <Check size={16} /> : <Plus size={16} />}
                {editingIndex !== null ? 'Update' : 'Add'}
            </button>
        </div>

        {/* Item List Added So Far */}
        <div className="flex-grow overflow-y-auto border-t border-b border-border py-2 mb-4">
             <h3 className="text-lg font-semibold mb-2">Items Added ({itemsToAdd.length}) - Total: {formatCurrency(currentItemsTotal)}</h3>
             {itemsToAdd.length === 0 ? (
                 <p className="text-sm text-text-secondary text-center py-4">No items added to this bill yet.</p>
             ) : (
                <div className="space-y-2 pr-2">
                    {itemsToAdd.map((item, index) => {
                        const Icon = getCategoryIcon(item.category);
                        return (
                            <div key={index} className={`p-2 rounded-md border ${editingIndex === index ? 'border-primary bg-primary/10' : 'border-border bg-input'} flex items-center gap-3`}>
                                <Icon size={20} className="text-icon opacity-80 flex-shrink-0" />
                                <div className="flex-grow">
                                     <p className="font-medium">{item.name}</p>
                                     <p className="text-xs text-text-secondary">
                                         {item.quantity} {item.unit} - {item.category}
                                     </p>
                                </div>
                                <p className="font-semibold text-sm mr-2">{formatCurrency(item.price)}</p>
                                <button
                                     onClick={() => handleEditItem(index)}
                                     className="p-1 text-blue-500 hover:text-blue-700 disabled:opacity-50"
                                     disabled={isSaving}
                                     aria-label="Edit Item"
                                 >
                                     <Edit2 size={16} />
                                 </button>
                                 <button
                                     onClick={() => handleDeleteItem(index)}
                                     className="p-1 text-red-500 hover:text-red-700 disabled:opacity-50"
                                     disabled={isSaving}
                                     aria-label="Delete Item"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        );
                    })}
                </div>
             )}
        </div>

        {/* Error Message */}
        {error && (
            <p className="text-sm text-red-500 font-medium mb-4">{error}</p>
        )}

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className={`px-5 py-2 rounded-lg font-medium hover:bg-black/10 dark:hover:bg-white/10 transition-colors`}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveAllAndClose}
              className={`flex items-center justify-center gap-2 px-5 py-2 rounded-lg font-medium bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-70`}
              disabled={isSaving || itemsToAdd.length === 0}
            >
              {isSaving ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Check size={18} />
              )}
              {isSaving ? "Saving..." : `Save ${itemsToAdd.length} Item(s) & Close`}
            </button>
        </div>
      </div>
    </div>
  );
};

