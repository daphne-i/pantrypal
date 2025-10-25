import React, { useState, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../hooks/useAuth";
import { handleSaveBill, handleUpdateBill } from "../firebaseUtils";
import toast from 'react-hot-toast';
import { X, Loader2, Save, Calendar as CalendarIcon, Store } from "lucide-react";

// Helper to format date for input type="date" (YYYY-MM-DD)
const formatDateForInput = (date) => {
    if (!date) return '';
    const d = date instanceof Date ? date : date.toDate ? date.toDate() : new Date(date);
    if (isNaN(d)) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};


export const AddBillModal = ({ isOpen, onClose, onSuccess, initialData }) => {
  const { theme } = useTheme();
  const { userId, appId } = useAuth();

  const isEditing = Boolean(initialData);

  const [shopName, setShopName] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [totalBill, setTotalBill] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
      if (isOpen) {
          if (isEditing && initialData) {
              setShopName(initialData.shopName || "");
              setPurchaseDate(formatDateForInput(initialData.purchaseDate));
              setTotalBill(initialData.totalBill !== null && initialData.totalBill !== undefined ? String(initialData.totalBill) : "");
          } else {
              setShopName("");
              setPurchaseDate(formatDateForInput(new Date())); // Default to today
              setTotalBill("");
          }
          setError(null);
      }
  }, [isOpen, isEditing, initialData]);


  const handleClose = () => {
    if (isSaving) return;
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!shopName.trim()) {
      setError("Please enter a shop name.");
      return;
    }
    if (!purchaseDate) {
      setError("Please select a purchase date.");
      return;
    }

    setIsSaving(true);
    try {
      const billData = {
        shopName: shopName.trim(),
        purchaseDate: purchaseDate, // This is the YYYY-MM-DD string
        totalBill: totalBill,
      };

      if (isEditing) {
          await handleUpdateBill(initialData.id, billData, userId, appId);
          toast.success("Bill updated successfully!");
          onSuccess(initialData.id, billData); // Pass updated data back
      } else {
          const billId = await handleSaveBill(billData, userId, appId);
          toast.success("Bill created successfully! Now add items.");
          
          // --- THIS WAS THE BUG ---
          // Must pass billData back so App.jsx knows the date
          onSuccess(billId, billData); 
      }
      handleClose();

    } catch (err) {
      console.error("Error saving/updating bill: ", err);
      setError(`Failed to ${isEditing ? 'update' : 'save'} bill. Please try again.`);
      toast.error(`Error: ${err.message || `Failed to ${isEditing ? 'update' : 'save'} bill.`}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div
        className={`w-full max-w-md p-6 rounded-2xl bg-glass border border-border shadow-xl z-50`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">{isEditing ? 'Edit Purchase Entry' : 'New Purchase Entry'}</h2>
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
          {/* Shop Name */}
          <div>
            <label htmlFor="shopName" className="block text-sm font-medium mb-1">Shop Name</label>
            <div className="relative">
                <Store size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                <input
                  id="shopName"
                  type="text"
                  placeholder="e.g., Local Supermarket"
                  className={`w-full p-3 pl-10 rounded-lg bg-input border border-border focus:ring-2 focus:ring-primary focus:outline-none`}
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  disabled={isSaving}
                  required
                />
            </div>
          </div>

          {/* Purchase Date */}
          <div>
            <label htmlFor="purchaseDate" className="block text-sm font-medium mb-1">Date of Purchase</label>
             <div className="relative">
                 <CalendarIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                <input
                  id="purchaseDate"
                  type="date"
                  className={`w-full p-3 pl-10 rounded-lg bg-input border border-border focus:ring-2 focus:ring-primary focus:outline-none`}
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  disabled={isSaving}
                  required
                />
            </div>
          </div>

          {/* Total Bill Amount (Optional) */}
          <div>
            <label htmlFor="totalBill" className="block text-sm font-medium mb-1">Total Bill Amount (Optional)</label>
             <div className="relative">
                 <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary font-semibold">₹</span>
                <input
                  id="totalBill"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g., 1500.50"
                  className={`w-full p-3 pl-8 rounded-lg bg-input border border-border focus:ring-2 focus:ring-primary focus:outline-none`}
                  value={totalBill}
                  onChange={(e) => setTotalBill(e.target.value)}
                  disabled={isSaving}
                />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <p className="text-sm text-red-500 font-medium">{error}</p>
          )}

          {/* Action Buttons */}
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
              className={`flex items-center justify-center gap-2 px-5 py-2 rounded-lg font-medium bg-primary text-primary-text primary-hover transition-colors disabled:opacity-70`}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                 isEditing ? <Save size={18} /> : <span className="text-lg font-bold">&rarr;</span>
              )}
              {isSaving ? (isEditing ? 'Saving...' : 'Saving...') : (isEditing ? 'Save Changes' : 'Next: Add Items')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

