import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { useCollection } from '../hooks/useCollection'; // Import useCollection
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
  const suggestionBoxRef = useRef(null); // Ref for suggestion box
  const nameInputRef = useRef(null); // Ref for name input

  // --- Fetch Unique Items for Suggestions ---
  const { data: uniqueItems } = useCollection(
    // Fetch unique items only when the modal is potentially open and user is logged in
    isOpen && userId && appId ? `artifacts/${appId}/users/${userId}/unique_items` : null
  );

  // --- Form state ---
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState(UNITS[0]); // Default to first unit 'pcs'
  const [category, setCategory] = useState(CATEGORIES[0].name); // Default to first category 'Bakery'
  const [price, setPrice] = useState("");
  const [error, setError] = useState(null);

  // --- Suggestion State ---
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // --- State for last used category/unit ---
  const [lastUsedUnit, setLastUsedUnit] = useState(UNITS[0]);
  const [lastUsedCategory, setLastUsedCategory] = useState(CATEGORIES[0].name);

  // --- List state ---
  const [currentItems, setCurrentItems] = useState([]);
  const [isEditingId, setIsEditingId] = useState(null); // Tracks ID of item being edited
  const [isSavingAll, setIsSavingAll] = useState(false);

  // Clear everything when modal is closed
  useEffect(() => {
    if (isOpen) {
        resetForm(true); // Full reset on open
        setCurrentItems([]);
        setIsSavingAll(false);
        setSuggestions([]);
        setShowSuggestions(false);
    }
  }, [isOpen]); // Dependency: isOpen

  // Reset form fields
  const resetForm = (isOpening = false) => {
    setName("");
    setQuantity(1);
    // Reset to defaults only when opening, otherwise use last used
    setUnit(isOpening ? UNITS[0] : lastUsedUnit);
    setCategory(isOpening ? CATEGORIES[0].name : lastUsedCategory);
    setPrice("");
    setIsEditingId(null);
    setError(null);
    setShowSuggestions(false); // Hide suggestions on reset
  };

  // --- Handle Name Input Change & Suggestions ---
  const handleNameChange = (e) => {
      const value = e.target.value;
      setName(value);
      setError(null); // Clear error on typing

      // Show suggestions if input is not empty and uniqueItems are loaded
      if (value.length > 0 && uniqueItems) {
          const filtered = uniqueItems
              .filter(item => item.displayName.toLowerCase().includes(value.toLowerCase()))
              .slice(0, 5); // Limit to top 5 suggestions
          setSuggestions(filtered);
          setShowSuggestions(filtered.length > 0);
      } else {
          setSuggestions([]);
          setShowSuggestions(false);
      }
  };

  // --- Handle Selecting a Suggestion ---
  const handleSuggestionClick = (suggestion) => {
      setName(suggestion.displayName);
      setCategory(suggestion.category || lastUsedCategory); // Use suggestion's category or fallback

      // --- Determine Unit ---
      // Try to get the unit from the most recent purchase of this specific item
      // Note: We need to query purchases collection for this, which is async.
      // For simplicity, we'll keep using the overall last used unit for now.
      // A more complex implementation could involve fetching the last purchase
      // record for this item name when a suggestion is clicked.
      setUnit(lastUsedUnit); // Keep using the session's last used unit

      // Pre-fill last price
      const lastPriceEntry = suggestion.priceHistory?.[0];
      const priceToFill = lastPriceEntry?.price ?? suggestion.lastPrice; // Use history first, fallback to old field
      setPrice(priceToFill !== undefined ? String(priceToFill) : "");

      // Clear and hide suggestions
      setShowSuggestions(false);
      setSuggestions([]);
      // Focus on quantity input for faster workflow
      document.getElementById('itemQty')?.focus();
  };


   // --- Close suggestions on outside click ---
   useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if suggestion box exists and click is outside input AND suggestion box
      if (
          showSuggestions &&
          nameInputRef.current && !nameInputRef.current.contains(event.target) &&
          suggestionBoxRef.current && !suggestionBoxRef.current.contains(event.target)
          ) {
        setShowSuggestions(false);
      }
    };
    // Add listener when suggestions are shown
    if (showSuggestions) {
        document.addEventListener('mousedown', handleClickOutside);
    }
    // Cleanup listener
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSuggestions]); // Re-run only when showSuggestions changes


  // --- Form Actions ---
  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);
    setShowSuggestions(false); // Ensure suggestions are hidden on submit

    // Validation
    if (!name.trim() || !price || isNaN(parseFloat(price)) || parseFloat(price) < 0 || !quantity || isNaN(parseFloat(quantity)) || parseFloat(quantity) <= 0) {
      setError("Please enter a valid name, price, and quantity.");
      return;
    }

    const itemToSave = {
      id: isEditingId || crypto.randomUUID(), // Use existing ID if editing
      name: name.trim(),
      quantity: parseFloat(quantity),
      unit, // Use the current unit state
      category, // Use the current category state
      price: parseFloat(price),
    };

    // --- Remember last used category/unit ---
    setLastUsedUnit(unit); // Update the last used unit
    setLastUsedCategory(category); // Update the last used category

    if (isEditingId) {
        // Update item in list
        setCurrentItems(currentItems.map(item => item.id === isEditingId ? itemToSave : item));
        toast.success("Item updated", { duration: 1500 });
    } else {
        // Add new item to list (prepend for visibility)
        setCurrentItems([itemToSave, ...currentItems]);
    }

    resetForm(false); // Partial reset (keeps last used cat/unit)
    nameInputRef.current?.focus(); // Focus name input for next item addition
  };

  // Handle Edit/Delete
  const handleEdit = (item) => {
      setIsEditingId(item.id);
      setName(item.name);
      setQuantity(item.quantity);
      setUnit(item.unit);
      setCategory(item.category);
      setPrice(item.price);
      setShowSuggestions(false); // Hide suggestions when editing starts
      nameInputRef.current?.focus(); // Focus name input when editing
  };

  const handleDelete = (id) => {
      setCurrentItems(currentItems.filter(item => item.id !== id));
      // If the deleted item was being edited, reset the form
      if (id === isEditingId) {
          resetForm(false);
      }
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
          // Pass the `billDate` (string) to the save function
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

  // --- Handle Close ---
  const handleClose = () => {
    if (isSavingAll) return; // Prevent closing while saving all
    onClose();
  };

  // Calculate total for items in the current list
  const currentItemsTotal = useMemo(() => {
      return currentItems.reduce((sum, item) => sum + (item.price || 0), 0);
  }, [currentItems]);


  if (!isOpen) return null;

  return (
    // Backdrop
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center p-4"
      onClick={handleClose} // Close on backdrop click
    >
      {/* Modal Content */}
      <div
        className={`w-full max-w-2xl p-6 rounded-2xl bg-glass border border-border shadow-xl z-50 flex flex-col max-h-[90vh] pb-24 md:pb-6`}
        onClick={(e) => e.stopPropagation()} // Prevent click propagation to backdrop
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4 pb-4 border-b border-border flex-shrink-0">
          <h2 className="text-2xl font-bold">{isEditingId ? 'Edit Item' : 'Add Items to Bill'}</h2>
          <button
            onClick={handleClose}
            className={`p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10`}
            disabled={isSavingAll}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end mb-4 flex-shrink-0" onSubmit={handleSubmit}>
            {/* Name (with Suggestions) */}
            <div className="md:col-span-2 relative">
                <label htmlFor="itemName" className="block text-xs font-medium mb-1">Item Name</label>
                <input
                  id="itemName" type="text" placeholder="e.g., Apple"
                  className={`w-full p-2 rounded-lg bg-input border border-border text-sm focus:ring-2 focus:ring-primary focus:outline-none`}
                  value={name}
                  onChange={handleNameChange} // Use suggestion handler
                  onFocus={() => name.length > 0 && setShowSuggestions(suggestions.length > 0)} // Show suggestions on focus if conditions met
                  ref={nameInputRef} // Add ref to input
                  autoComplete="off" // Disable browser autocomplete
                  required
                />
                {/* Suggestions Dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                    <div ref={suggestionBoxRef} className="absolute top-full left-0 mt-1 w-full max-h-40 overflow-y-auto bg-input border border-border rounded-md shadow-lg z-20">
                        {suggestions.map(sugg => (
                            <button
                                type="button" // Important: Prevent form submission on click
                                key={sugg.id}
                                onClick={() => handleSuggestionClick(sugg)}
                                className="block w-full text-left px-3 py-1.5 text-sm hover:bg-primary/10 transition-colors duration-100"
                            >
                                {sugg.displayName} <span className="text-xs text-text-secondary">({sugg.category})</span>
                            </button>
                        ))}
                    </div>
                )}
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
                ? 'bg-amber-500 hover:bg-amber-600 text-white' // Amber color for update
                : 'bg-primary text-primary-text primary-hover'
              } transition-colors text-sm`}
              aria-label={isEditingId ? 'Update item' : 'Add item'}
            >
              {isEditingId ? <Edit2 size={16} /> : <Plus size={16} />}
              {isEditingId ? 'Update' : 'Add'}
            </button>
        </form>

        {/* Error Message */}
        {error && (
            <p className="text-sm text-red-500 font-medium mb-2 text-center flex-shrink-0">{error}</p>
        )}

        {/* Divider */}
        <div className="border-t border-border mb-4 flex-shrink-0"></div>

        {/* Items List - Scrollable */}
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
        <div className="flex justify-between items-center pt-4 mt-4 border-t border-border flex-shrink-0">
            {/* Totals */}
            <div className="text-sm">
                <span className="font-semibold">Items: </span>{currentItems.length}
                <span className="font-semibold ml-4">Total: </span>{formatCurrency(currentItemsTotal)}
            </div>
            {/* Action Buttons */}
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

