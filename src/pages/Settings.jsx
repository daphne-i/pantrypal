import React, { useState, useEffect, useRef } from "react";
import toast from 'react-hot-toast';
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../hooks/useAuth";
import { useDocument } from "../hooks/useDocument";
import { handleBackupData, handleRestoreData } from "../firebaseUtils";
import { formatCurrency } from '../utils'; // Import currency formatter
import { Check, Copy, Loader2, Save, Upload, Download, AlertTriangle, LogOut } from "lucide-react";
import { logOut } from "../firebaseConfig";

// ThemeSelector Component (No changes needed here)
const ThemeSelector = () => {
  const { setCurrentTheme, themes, themeName } = useTheme();

  return (
    <div>
      <h3 className="text-lg font-semibold mb-3">Select Theme</h3>
      <div className="grid grid-cols-2 gap-4">
        {Object.values(themes).map((t) => (
          <button
            key={t.name}
            onClick={() => setCurrentTheme(t.name.toLowerCase())}
            className={`p-4 rounded-lg border-2
              ${themeName === t.name.toLowerCase() ? "border-primary" : "border-border"}
              bg-background text-text shadow-sm hover:shadow-md transition-all`}
          >
            <div className="flex justify-between items-center mb-3">
              <span className="font-semibold">{t.name}</span>
              {themeName === t.name.toLowerCase() && (
                <div
                  className={`w-5 h-5 rounded-full bg-primary flex items-center justify-center`}
                >
                  <Check size={14} className={`text-primary-text`} />
                </div>
              )}
            </div>
            {/* Theme preview swatches */}
            <div className="flex gap-1">
              <div
                className={`w-1/2 h-5 rounded`}
                style={{ backgroundColor: t.css["--color-primary"] }}
              ></div>
              <div
                className={`w-1/2 h-5 rounded border`}
                style={{
                  backgroundColor: t.css["--color-glass"],
                  borderColor: t.css["--color-border"],
                }}
              ></div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

// --- Confirmation Modal ---
const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message }) => {
    if (!isOpen) return null;

    return (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          onClick={onClose}
        >
          <div
            className={`w-full max-w-md p-6 rounded-2xl bg-glass border border-border shadow-xl z-50`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
                 <div className="p-2 bg-red-500/20 rounded-full">
                     <AlertTriangle size={24} className="text-red-500" />
                 </div>
                 <h2 className="text-xl font-bold">{title}</h2>
            </div>
            <p className="text-sm text-text-secondary mb-6">{message}</p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className={`px-5 py-2 rounded-lg font-medium hover:bg-black/10 dark:hover:bg-white/10 transition-colors`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className={`flex items-center justify-center gap-2 px-5 py-2 rounded-lg font-medium bg-red-600 text-white hover:bg-red-700 transition-colors`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
    );
};


// Settings Page Component
export const Settings = () => {
  const { userId, appId } = useAuth();
  const { data: userProfile, isLoading: isLoadingProfile, updateDocument } = useDocument(
     userId && appId ? `artifacts/${appId}/users/${userId}/profile` : null,
     userId
   );

  const [budgetInput, setBudgetInput] = useState('');
  const [isSavingBudget, setIsSavingBudget] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [fileToRestore, setFileToRestore] = useState(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const fileInputRef = useRef(null); // Ref for hidden file input

  // Update input when profile loads
  useEffect(() => {
    if (userProfile && userProfile.monthlyBudget !== undefined && userProfile.monthlyBudget !== null) {
      setBudgetInput(String(userProfile.monthlyBudget));
    } else if (!isLoadingProfile) {
        setBudgetInput(''); // Clear if no budget set after loading
    }
  }, [userProfile, isLoadingProfile]);

  const handleBudgetSave = async () => {
    setIsSavingBudget(true);
    const newBudget = parseFloat(budgetInput);

    if (isNaN(newBudget) || newBudget < 0) {
      toast.error('Please enter a valid positive number for the budget.');
      setIsSavingBudget(false);
      return;
    }

    try {
      await updateDocument({ monthlyBudget: newBudget }, { merge: true });
      toast.success('Monthly budget updated!');
    } catch (error) {
      console.error("Error saving budget:", error);
      toast.error('Failed to save budget.');
    } finally {
      setIsSavingBudget(false);
    }
  };


  // Copy User ID to clipboard
  const handleCopy = (text) => {
    navigator.clipboard.writeText(text)
      .then(() => toast.success('User ID copied!'))
      .catch(() => toast.error('Failed to copy User ID.'));
  };

  // --- Backup Logic ---
  const triggerBackup = async () => {
      if (!userId || !appId) {
          toast.error("User not authenticated.");
          return;
      }
      setIsBackingUp(true);
      const toastId = toast.loading('Starting backup...');
      try {
          await handleBackupData(userId, appId);
          toast.success('Data backup successful! Check your downloads.', { id: toastId });
      } catch (error) {
          console.error("Backup failed:", error);
          toast.error(`Backup failed: ${error.message}`, { id: toastId });
      } finally {
          setIsBackingUp(false);
      }
  };

  // --- Restore Logic ---
  const triggerRestore = () => {
      // Programmatically click the hidden file input
      fileInputRef.current?.click();
  };

  const handleFileSelected = (event) => {
      const file = event.target.files?.[0];
      if (file && file.type === 'application/json') {
          setFileToRestore(file);
          setIsConfirmModalOpen(true); // Show confirmation modal
      } else if (file) {
          toast.error('Invalid file type. Please select a .json backup file.');
      }
      // Reset file input value so the same file can be selected again
      if (fileInputRef.current) {
          fileInputRef.current.value = '';
      }
  };

  const confirmRestore = async () => {
      setIsConfirmModalOpen(false); // Close confirmation
      if (!fileToRestore || !userId || !appId) return;

      setIsRestoring(true);
      const toastId = toast.loading('Restoring data... This may take a moment.');

      try {
          await handleRestoreData(fileToRestore, userId, appId);
          toast.success('Data restored successfully!', { id: toastId, duration: 4000 });
          // Optionally force a refresh or rely on hooks to update data
      } catch (error) {
          console.error("Restore failed:", error);
          toast.error(`Restore failed: ${error.message}`, { id: toastId, duration: 5000 });
      } finally {
          setIsRestoring(false);
          setFileToRestore(null);
      }
  };

  const cancelRestore = () => {
      setIsConfirmModalOpen(false);
      setFileToRestore(null);
  }

  // --- Logout Handler ---
  const handleLogout = async () => {
      setIsLoggingOut(true);
      try {
          await logOut();
          toast.success("Logged out successfully.");
          // No need to redirect, App.jsx will handle the state change
      } catch (error) {
          console.error("Logout failed:", error);
          toast.error(`Logout failed: ${error.message}`);
          setIsLoggingOut(false); // Only reset if error occurs
      }
      // Don't set isLoggingOut back to false on success, as the component will unmount/rerender
  };

  // Display current budget safely
  const currentBudget = userProfile?.monthlyBudget;

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-3xl font-bold">Settings</h1>
      <div
        className={`p-6 rounded-2xl bg-glass border border-border shadow-lg space-y-6`}
      >
        {/* Theme Selector */}
        <ThemeSelector />

        {/* Monthly Budget */}
        <div>
           <h3 className="text-lg font-semibold mb-2">Monthly Budget</h3>
           <p className="text-xs text-text-secondary mb-2">
                Set a monthly budget to track your spending progress on the dashboard.
                Current: {isLoadingProfile ? 'Loading...' : (currentBudget ? formatCurrency(currentBudget) : 'Not Set')}
           </p>
           <div className="flex items-center gap-2">
               <input
                 type="number"
                 step="10" // Adjust step as needed
                 min="0"
                 placeholder="5000" // Example placeholder in Rupees
                 value={budgetInput}
                 onChange={(e) => setBudgetInput(e.target.value)}
                 disabled={isSavingBudget || isLoadingProfile}
                 className={`flex-grow p-2 rounded-md bg-input border border-border focus:ring-1 focus:ring-primary focus:outline-none disabled:opacity-50`}
               />
               <button
                  onClick={handleBudgetSave}
                  disabled={isSavingBudget || isLoadingProfile}
                  className="flex items-center justify-center gap-1 px-4 py-2 rounded-lg font-medium bg-primary text-primary-text primary-hover transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
               >
                 {isSavingBudget ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                 {isSavingBudget ? 'Saving...' : 'Save'}
               </button>
           </div>
        </div>

        {/* User Info */}
        <div>
          <h3 className="text-lg font-semibold mb-2">Account</h3>
          <div className={`p-4 rounded-lg bg-input border border-border`}>
            <p className="text-sm font-medium">App ID:</p>
            <p className="text-xs truncate mb-2">{appId}</p>
            <p className="text-sm font-medium">User ID:</p>
            <div className="flex justify-between items-center gap-2">
              <p className="text-xs truncate">{userId}</p>
              <Copy
                size={16}
                className="cursor-pointer hover:text-primary"
                onClick={() => handleCopy(userId)}
              />
            </div>
          </div>
        </div>

        {/* Data Management */}
        <div>
          <h3 className="text-lg font-semibold mb-2">Data Management</h3>
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Hidden file input */}
            <input
                type="file"
                accept=".json"
                ref={fileInputRef}
                onChange={handleFileSelected}
                style={{ display: 'none' }}
            />
            {/* Backup Button */}
            <button
               onClick={triggerBackup}
               disabled={isBackingUp || isRestoring}
               className={`flex w-full sm:w-auto items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed`}
            >
              {isBackingUp ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              {isBackingUp ? 'Backing up...' : 'Backup My Data'}
            </button>
            {/* Restore Button */}
            <button
               onClick={triggerRestore}
               disabled={isRestoring || isBackingUp}
               className={`flex w-full sm:w-auto items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium bg-orange-600 text-white hover:bg-orange-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed`}
            >
              {isRestoring ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {isRestoring ? 'Restoring...' : 'Restore from Backup'}
            </button>
          </div>
        </div>
        {/* Logout Button */}
        <div>
           <h3 className="text-lg font-semibold mb-2">Sign Out</h3>
            <button
               onClick={handleLogout}
               disabled={isLoggingOut || isBackingUp || isRestoring}
               className={`flex w-full sm:w-auto items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed`}
            >
              {isLoggingOut ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
              {isLoggingOut ? 'Logging out...' : 'Log Out'}
            </button>
        </div>
      </div>

       {/* Confirmation Modal for Restore */}
       <ConfirmationModal
          isOpen={isConfirmModalOpen}
          onClose={cancelRestore}
          onConfirm={confirmRestore}
          title="Confirm Data Restore"
          message={`Restoring from "${fileToRestore?.name || 'backup'}" will OVERWRITE all current data in your account. This action cannot be undone. Are you sure you want to proceed?`}
       />
    </div>
  );
};

