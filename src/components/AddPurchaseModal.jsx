import React, { useState, useEffect } from "react";
import toast from 'react-hot-toast'; // <-- Import toast
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../hooks/useAuth";
import { handleSavePurchase } from "../firebaseUtils";
import { X, Loader2, Plus, Check } from "lucide-react";

export const AddPurchaseModal = ({ isOpen, onClose }) => {
  const { theme } = useTheme();
  const { userId, appId } = useAuth();
  const [itemName, setItemName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("Produce");
  const [isSaving, setIsSaving] = useState(false);
  // Removed showSuccess state
  const [error, setError] = useState(null);

  // Reset form when modal opens or closes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        resetForm();
      }, 300); // Delay reset slightly after close animation
    } else {
         resetForm();
    }
  }, [isOpen]);


  const resetForm = () => {
    setItemName("");
    setPrice("");
    setCategory("Produce");
    setError(null);
  };

  const handleClose = () => {
    if (isSaving) return; // Prevent closing only during save API call
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!itemName.trim() || !price || isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      setError("Please enter a valid item name and price.");
      return;
    }

    if (!userId || !appId) {
      setError("Not connected. Please try again in a moment.");
      return;
    }

    setIsSaving(true);
    try {
      await handleSavePurchase(
        { name: itemName, price: price, category: category },
        userId,
        appId
      );

      toast.success('Purchase Saved!'); // <-- Toast feedback on success
      onClose(); // Close immediately on success

    } catch (err) {
      console.error("Error adding document: ", err);
      setError("Failed to save purchase. Please try again.");
      toast.error("Failed to save purchase."); // <-- Toast feedback on error
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  // Button content depends only on isSaving state now
  let buttonContent = isSaving
    ? <><Loader2 size={18} className="animate-spin" /> Saving...</>
    : <><Plus size={18} /> Save Purchase</>;

  let buttonClass = `flex items-center justify-center gap-2 px-5 py-2 rounded-lg font-medium bg-primary text-primary-text primary-hover transition-colors disabled:opacity-70`;
  if (isSaving) {
      buttonClass += ` cursor-not-allowed`;
  }


  return (
    // Backdrop
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center p-4"
      onClick={handleClose}
    >
      {/* Modal Content */}
      <div
        className={`w-full max-w-md p-6 rounded-2xl bg-glass border border-border shadow-xl z-50`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Log New Purchase</h2>
          <button
            onClick={handleClose}
            className={`p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10`}
            disabled={isSaving}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium mb-1">Item Name</label>
            <input
              type="text"
              placeholder="e.g., Organic Bananas"
              className={`w-full p-3 rounded-lg bg-input border border-border focus:ring-2 focus:ring-primary focus:outline-none`}
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              disabled={isSaving}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Price</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="$ 3.99"
              className={`w-full p-3 rounded-lg bg-input border border-border focus:ring-2 focus:ring-primary focus:outline-none`}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              disabled={isSaving}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select
              className={`w-full p-3 rounded-lg bg-input border border-border focus:ring-2 focus:ring-primary focus:outline-none appearance-none`}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={isSaving}
            >
              <option>Produce</option>
              <option>Dairy</option>
              <option>Meat</option>
              <option>Pantry</option>
              <option>Frozen</option>
              <option>Drinks</option>
              <option>Other</option>
            </select>
          </div>

          {error && (
            <p className="text-sm text-red-500 font-medium">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className={`px-5 py-2 rounded-lg font-medium hover:bg-black/10 dark:hover:bg-white/10 transition-colors`}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={buttonClass}
              disabled={isSaving}
            >
              {buttonContent}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

