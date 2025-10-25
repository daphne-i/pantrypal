import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { handleSaveItems } from '../firebaseUtils';
import { CATEGORIES, UNITS, getCategoryIcon } from '../constants';
import { formatCurrency } from '../utils';
import toast from 'react-hot-toast';
import { X, Loader2, Plus, Save, Trash2, Edit2, CheckCircle, AlertTriangle } from 'lucide-react';

// A single item row in the "to be added" list
const ItemRow = ({ item, onEdit, onDelete }) => {
    const CategoryIcon = getCategoryIcon(item.category);
    return (
        <div className="flex items-center justify-between p-2 bg-background rounded-md border border-border">
            <div className="flex items-center gap-2 overflow-hidden">
                <CategoryIcon size={16} className="text-icon flex-shrink-0" />
                <div className="overflow-hidden">
                    <p className="font-medium truncate" title={item.name}>{item.name}</p>
                    <p className="text-xs text-text-secondary">
                        {item.quantity} {item.unit} &bull; {formatCurrency(item.price)}
                    </p>
                </div>
            </div>
            <div className="flex flex-shrink-0 gap-1">
                <button
                    type="button"
                    onClick={() => onEdit(item)}
                    className="p-1 text-text-secondary hover:text-primary rounded"
                    title="Edit Item"
                >
                    <Edit2 size={14} />
                </button>
                 <button
                    type="button"
                    onClick={() => onDelete(item.id)}
                    className="p-1 text-text-secondary hover:text-red-500 rounded"
                    title="Delete Item"
                >
                    <Trash2 size={14} />
                </button>
            </div>
        </div>
    );
};


export const AddItemsModal = ({ isOpen, onClose, billId, billDate }) => {
  const { theme } = useTheme();
  const { userId, appId } = useAuth();
  
  // Form state
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState(UNITS[0]); // Default to first unit 'pcs'
  const [category, setCategory] = useState(CATEGORIES[0].name); // Default to first category 'Bakery'
  const [price, setPrice] = useState("");
  const [error, setError] = useState(null);

  // List state
  const [currentItems, setCurrentItems] = useState([]);
  const [isEditingId, setIsEditingId] = useState(null); // Tracks ID of item being edited
  const [isSavingAll, setIsSavingAll] = useState(false);

  // Clear everything when modal is closed or billId changes
  useEffect(() => {
    if (isOpen) {
        resetForm();
        setCurrentItems([]);
        setIsSavingAll(false);
    }
  }, [isOpen]);

  const resetForm = () => {
    setName("");
    setQuantity(1);
    setUnit(UNITS[0]);
    setCategory(CATEGORIES[0].name);
    setPrice("");
    setIsEditingId(null);
    setError(null);
  };

  // --- Form Actions ---
  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!name.trim() || !price || isNaN(parseFloat(price)) || parseFloat(price) < 0 || !quantity || isNaN(parseFloat(quantity)) || parseFloat(quantity) <= 0) {
      setError("Please enter a valid name, price, and quantity.");
      return;
    }

    const itemToSave = {
      id: isEditingId || crypto.randomUUID(), // Use existing ID if editing
      name: name.trim(),
      quantity: parseFloat(quantity),
      unit,
      category,
      price: parseFloat(price),
    };

    if (isEditingId) {
        // Update item in list
        setCurrentItems(currentItems.map(item => item.id === isEditingId ? itemToSave : item));
        toast.success("Item updated", { duration: 1500 });
    } else {
        // Add new item to list
        setCurrentItems([itemToSave, ...currentItems]);
    }
    
    resetForm();
  };

  const handleEdit = (item) => {
      setIsEditingId(item.id);
      setName(item.name);
      setQuantity(item.quantity);
      setUnit(item.unit);
      setCategory(item.category);
      setPrice(item.price);
  };

  const handleDelete = (id) => {
      setCurrentItems(currentItems.filter(item => item.id !== id));
  };


  // --- Save All Items ---
  const handleSaveAllItems = async () => {
      if (currentItems.length === 0) {
          setError("No items to save. Add at least one item.");
          return;
      }
      setIsSavingAll(true);
      setError(null);
      try {
          // FIX: Pass the `billDate` (string) to the save function
          await handleSaveItems(currentItems, billId, billDate, userId, appId);
          toast.success(`Successfully saved ${currentItems.length} item(s)!`);
          handleClose(); // Close modal on success
      } catch (err) {
          console.error("Error saving items:", err);
          setError(`Failed to save items: ${err.message}`);
          toast.error(`Error saving items: ${err.message}`);
      } finally {
          setIsSavingAll(false);
      }
  };

  const handleClose = () => {
    if (isSavingAll) return;
    onClose();
  };

  // Calculate total for items in the list
  const currentItemsTotal = useMemo(() => {
      return currentItems.reduce((sum, item) => sum + (item.price || 0), 0);
  }, [currentItems]);
  

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center p-4"
      onClick={handleClose}
    >
      {/* Modal Content */}
      <div
        className={`w-full max-w-2xl p-6 rounded-2xl bg-glass border border-border shadow-xl z-50 flex flex-col max-h-[90vh]`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4 pb-4 border-b border-border">
          <h2 className="text-2xl font-bold">{isEditingId ? 'Edit Item' : 'Add Items to Bill'}</h2>
          <button
            onClick={handleClose}
            className={`p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10`}
            disabled={isSavingAll}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end mb-4" onSubmit={handleSubmit}>
            {/* Name */}
            <div className="md:col-span-2">
                <label htmlFor="itemName" className="block text-xs font-medium mb-1">Item Name</label>
                <input
                  id="itemName" type="text" placeholder="e.g., Apple"
                  className={`w-full p-2 rounded-lg bg-input border border-border text-sm focus:ring-2 focus:ring-primary focus:outline-none`}
                  value={name} onChange={(e) => setName(e.target.value)} required
                />
            </div>
            {/* Qty */}
            <div>
                <label htmlFor="itemQty" className="block text-xs font-medium mb-1">Qty</label>
                <input
                  id="itemQty" type="number" step="0.1" min="0.1" placeholder="1"
                  className={`w-full p-2 rounded-lg bg-input border border-border text-sm focus:ring-2 focus:ring-primary focus:outline-none`}
                  value={quantity} onChange={(e) => setQuantity(e.target.value)} required
                />
            </div>
            {/* Unit */}
             <div>
                <label htmlFor="itemUnit" className="block text-xs font-medium mb-1">Unit</label>
                <select
                  id="itemUnit"
                  className={`w-full p-2 rounded-lg bg-input border border-border text-sm focus:ring-2 focus:ring-primary focus:outline-none appearance-none`}
                  value={unit} onChange={(e) => setUnit(e.target.value)}
                >
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
            </div>
            {/* Category */}
             <div>
                <label htmlFor="itemCat" className="block text-xs font-medium mb-1">Category</label>
                <select
                  id="itemCat"
                  className={`w-full p-2 rounded-lg bg-input border border-border text-sm focus:ring-2 focus:ring-primary focus:outline-none appearance-none`}
                  value={category} onChange={(e) => setCategory(e.target.value)}
                >
                    {CATEGORIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
            </div>
            {/* Price */}
             <div>
                <label htmlFor="itemPrice" className="block text-xs font-medium mb-1">Total Price</label>
                <input
                  id="itemPrice" type="number" step="0.01" min="0" placeholder="0.00"
                  className={`w-full p-2 rounded-lg bg-input border border-border text-sm focus:ring-2 focus:ring-primary focus:outline-none`}
                  value={price} onChange={(e) => setPrice(e.target.value)} required
                />
            </div>
            {/* Add/Update Button */}
            <button
              type="submit"
              className={`flex items-center justify-center gap-2 p-2 rounded-lg font-medium ${
                isEditingId 
                ? 'bg-amber-500 hover:bg-amber-600 text-white' 
                : 'bg-primary text-primary-text primary-hover'
              } transition-colors text-sm`}
            >
              {isEditingId ? <Edit2 size={16} /> : <Plus size={16} />}
              {isEditingId ? 'Update' : 'Add'}
            </button>
        </form>

        {/* Error Message */}
        {error && (
            <p className="text-sm text-red-500 font-medium mb-2 text-center">{error}</p>
        )}

        {/* Divider */}
        <div className="border-t border-border mb-4"></div>

        {/* Items List */}
        <div className="flex-grow overflow-y-auto pr-2 space-y-2 min-h-[150px]">
            {currentItems.length === 0 ? (
                <p className="text-center text-text-secondary py-10">No items added yet.</p>
            ) : (
                currentItems.map(item => (
                    <ItemRow key={item.id} item={item} onEdit={handleEdit} onDelete={handleDelete} />
                ))
            )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-4 mt-4 border-t border-border">
            <div>
                <span className="font-semibold">Total Items: </span>{currentItems.length}
                <span className="font-semibold ml-4">Total Price: </span>{formatCurrency(currentItemsTotal)}
            </div>
            <div className="flex gap-3">
                 <button
                    type="button"
                    onClick={handleClose}
                    className={`px-4 py-2 rounded-lg font-medium hover:bg-black/10 dark:hover:bg-white/10 transition-colors`}
                    disabled={isSavingAll}
                >
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={handleSaveAllItems}
                    className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-70`}
                    disabled={isSavingAll || currentItems.length === 0}
                >
                    {isSavingAll ? (
                        <Loader2 size={18} className="animate-spin" />
                    ) : (
                        <Save size={18} />
                    )}
                    {isSavingAll ? "Saving..." : `Save All (${currentItems.length}) Items`}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

