import React, { useState, useEffect } from "react";
import toast from 'react-hot-toast';
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../hooks/useAuth";
import { handleSaveBill } from "../firebaseUtils";
import { X, Loader2, Calendar, ShoppingBasket, DollarSign, ArrowRight } from "lucide-react";

export const AddBillModal = ({ isOpen, onClose, onBillCreated }) => {
  const { theme } = useTheme();
  const { userId, appId } = useAuth();
  const [shopName, setShopName] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [totalBill, setTotalBill] = useState(""); // Optional total
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  // Set today's date as default when modal opens
  useEffect(() => {
    if (isOpen) {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        setPurchaseDate(today);
        setShopName(""); // Reset fields on open
        setTotalBill("");
        setError(null);
    }
  }, [isOpen]);

  const handleClose = () => {
    if (isSaving) return;
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Basic validation
    if (!shopName.trim() || !purchaseDate) {
      setError("Please enter a shop name and select a date.");
      return;
    }
    const billAmount = totalBill.trim() === "" ? null : parseFloat(totalBill);
    if (billAmount !== null && (isNaN(billAmount) || billAmount < 0)) {
        setError("Please enter a valid positive number for the total bill, or leave it empty.");
        return;
    }

    if (!userId || !appId) {
      setError("Not connected. Please try again in a moment.");
      return;
    }

    setIsSaving(true);
    const toastId = toast.loading("Creating bill entry...");
    try {
      const billData = { shopName, purchaseDate, totalBill: billAmount };
      const newBillId = await handleSaveBill(billData, userId, appId);
      toast.success("Bill entry created!", { id: toastId });
      onBillCreated(newBillId, billData); // Pass ID and data back to App.jsx
      handleClose(); // Close this modal

    } catch (err) {
      console.error("Error adding bill document: ", err);
      setError("Failed to create bill entry. Please try again.");
      toast.error(`Failed to create bill: ${err.message}`, { id: toastId });
      setIsSaving(false);
    }
    // No finally setIsSaving(false) here, as we navigate away on success
  };

  if (!isOpen) return null;

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
          <h2 className="text-2xl font-bold">Start New Purchase Log</h2>
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
          <div className="relative">
            <label className="block text-sm font-medium mb-1">Shop Name</label>
            <ShoppingBasket size={18} className="absolute left-3 top-[38px] text-text-secondary" />
            <input
              type="text"
              placeholder="e.g., Local Supermarket"
              className={`w-full p-3 pl-10 rounded-lg bg-input border border-border focus:ring-2 focus:ring-primary focus:outline-none`}
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              disabled={isSaving}
              required
            />
          </div>

          {/* Purchase Date */}
          <div className="relative">
            <label className="block text-sm font-medium mb-1">Date of Purchase</label>
             <Calendar size={18} className="absolute left-3 top-[38px] text-text-secondary" />
            <input
              type="date"
              className={`w-full p-3 pl-10 rounded-lg bg-input border border-border focus:ring-2 focus:ring-primary focus:outline-none`}
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              disabled={isSaving}
              required
            />
          </div>

          {/* Total Bill (Optional) */}
          <div className="relative">
            <label className="block text-sm font-medium mb-1">Total Bill Amount (Optional)</label>
             <DollarSign size={18} className="absolute left-3 top-[38px] text-text-secondary" />
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="Enter if known (e.g., 55.75)"
              className={`w-full p-3 pl-10 rounded-lg bg-input border border-border focus:ring-2 focus:ring-primary focus:outline-none`}
              value={totalBill}
              onChange={(e) => setTotalBill(e.target.value)}
              disabled={isSaving}
            />
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
              className={`flex items-center justify-center gap-2 px-5 py-2 rounded-lg font-medium bg-primary text-primary-text primary-hover transition-colors disabled:opacity-70`}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <ArrowRight size={18} />
              )}
              {isSaving ? "Creating..." : "Next: Add Items"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
