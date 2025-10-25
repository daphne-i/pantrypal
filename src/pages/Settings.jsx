import React, { useState, useEffect, useRef } from "react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../hooks/useAuth";
import { useDocument } from "../hooks/useDocument";
import { handleBackupData, handleRestoreData } from "../firebaseUtils";
import { Check, Copy, Loader2, Save, Upload, Download, AlertTriangle } from "lucide-react";

// ThemeSelector Component
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


// Settings Page Component
export const Settings = () => {
  const { userId, appId } = useAuth();
  const [budgetInput, setBudgetInput] = useState("");
  const [isSavingBudget, setIsSavingBudget] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [restoreError, setRestoreError] = useState(null);
  const fileInputRef = useRef(null);


  // Fetch user profile
  const { data: userProfile, updateDocument, isLoading } = useDocument(
    `artifacts/${appId}/users/${userId}/profile`,
    userId
  );

  // Load budget into input when profile data loads
  useEffect(() => {
    setBudgetInput(userProfile?.monthlyBudget !== undefined ? String(userProfile.monthlyBudget) : "");
  }, [userProfile]);


  const handleCopy = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 1500); // Reset after 1.5s
    }).catch(err => {
        console.error('Failed to copy text: ', err);
    });
  };

  // Handle Budget Save
  const handleSaveBudget = async () => {
    const newBudget = parseFloat(budgetInput);
    // Allow saving 0 or empty string as clearing the budget
    if (budgetInput !== "" && (isNaN(newBudget) || newBudget < 0)) {
      alert("Please enter a valid positive number for the budget, or leave it empty to clear."); // Improve later
      return;
    }

    // Use null for empty string to potentially remove the field in Firestore
    const budgetToSave = budgetInput === "" ? null : newBudget;

    setIsSavingBudget(true);
    try {
      await updateDocument({ monthlyBudget: budgetToSave }, { merge: true });
      // Optionally show a success message or rely on input disabling/enabling
    } catch (error) {
      console.error("Failed to save budget:", error);
      alert("Failed to save budget. Please try again."); // Improve later
    } finally {
      setIsSavingBudget(false);
    }
  };

  // --- Handle Backup ---
  const triggerBackup = async () => {
      setIsBackingUp(true);
      try {
          await handleBackupData(userId, appId);
      } catch (error) {
          console.error("Backup failed:", error);
          alert("Failed to create backup. Check console for details."); // Improve UI later
      } finally {
          setIsBackingUp(false);
      }
  };

  // --- Handle Restore ---
  const triggerRestore = () => {
    // Open the file picker
    fileInputRef.current?.click();
  };

  const onFileSelected = (event) => {
      const file = event.target.files?.[0];
      if (file) {
          // Reset error and show confirmation modal before proceeding
          setRestoreError(null);
          setShowRestoreConfirm(true);
      }
      // Reset file input value so the same file can be selected again if needed
      if (fileInputRef.current) {
         fileInputRef.current.value = "";
      }
  };

  const confirmRestore = async () => {
      setShowRestoreConfirm(false); // Close confirmation modal
      const file = fileInputRef.current?.files?.[0];
      if (!file) return;

      setIsRestoring(true);
      setRestoreError(null); // Clear previous errors
      try {
          await handleRestoreData(file, userId, appId);
          alert("Restore successful! Data has been updated."); // Improve UI later
          // Data will update automatically via onSnapshot listeners
      } catch (error) {
          console.error("Restore failed:", error);
          setRestoreError(`Restore failed: ${error.message}. Check console for details.`); // Show error
      } finally {
          setIsRestoring(false);
           // Reset file input again
          if (fileInputRef.current) {
             fileInputRef.current.value = "";
          }
      }
  };


  const budgetChanged = budgetInput !== (userProfile?.monthlyBudget !== undefined ? String(userProfile.monthlyBudget) : "");


  return (
    <> {/* Added Fragment to allow modal */}
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
             <div className="flex items-center gap-2">
               <span className="text-lg font-medium">$</span>
               <input
                 type="number"
                 step="0.01"
                 min="0"
                 placeholder="e.g., 500.00"
                 value={budgetInput}
                 onChange={(e) => setBudgetInput(e.target.value)}
                 disabled={isLoading || isSavingBudget}
                 className={`flex-grow p-2 rounded-lg bg-input border border-border focus:ring-2 focus:ring-primary focus:outline-none`}
               />
               <button
                 onClick={handleSaveBudget}
                 disabled={isLoading || isSavingBudget || !budgetChanged} // Disable if unchanged
                 className={`flex items-center gap-1 px-3 py-2 rounded-lg font-medium bg-primary text-primary-text primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed`} // Added cursor-not-allowed
               >
                 {isSavingBudget ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                 Save
               </button>
             </div>
             <p className="text-xs text-text-secondary mt-1">Leave empty to clear budget tracking.</p>
          </div>


          {/* User Info */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Account</h3>
            <div className={`p-4 rounded-lg bg-input border border-border`}>
              <p className="text-sm font-medium">App ID:</p>
              <p className="text-xs truncate mb-2">{appId || "Loading..."}</p>
              <p className="text-sm font-medium">User ID:</p>
              <div className="flex justify-between items-center gap-2">
                <p className="text-xs truncate">{userId || "Loading..."}</p>
                <button onClick={() => handleCopy(userId)} className="text-text-secondary hover:text-primary disabled:opacity-50" disabled={!userId}>
                  {copySuccess ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                </button>
              </div>
            </div>
          </div>

          {/* --- Data Management --- */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Data Management</h3>
            <div className="flex flex-col sm:flex-row gap-4"> {/* Adjusted layout for buttons */}
              <button
                onClick={triggerBackup}
                disabled={isBackingUp || isRestoring}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isBackingUp ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                Backup My Data
              </button>
              <button
                 onClick={triggerRestore}
                 disabled={isBackingUp || isRestoring}
                 className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
               >
                 {isRestoring ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                 Restore from Backup
              </button>
              {/* Hidden file input */}
              <input
                type="file"
                ref={fileInputRef}
                accept=".json" // Accept only JSON files
                style={{ display: 'none' }}
                onChange={onFileSelected}
              />
            </div>
             {restoreError && (
                 <p className="text-sm text-red-500 mt-2">{restoreError}</p>
             )}
            <p className="text-xs text-text-secondary mt-2">
                Save your data (purchases, unique items, settings) to a JSON file, or restore from a previously saved backup.
                <span className="font-semibold text-red-500"> Warning: Restoring will overwrite current data.</span>
            </p>
          </div>
        </div>
      </div>

      {/* --- Restore Confirmation Modal --- */}
      {showRestoreConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center p-4">
              <div className={`w-full max-w-md p-6 rounded-2xl bg-glass border border-border shadow-xl z-50`}>
                 <div className="flex items-start gap-4">
                     <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                          <AlertTriangle className="h-6 w-6 text-red-600" aria-hidden="true" />
                     </div>
                     <div className="mt-0 text-left">
                          <h3 className="text-lg font-semibold leading-6 text-text" id="modal-title">
                             Restore Data Confirmation
                          </h3>
                          <div className="mt-2">
                              <p className="text-sm text-text-secondary">
                                 Are you sure you want to restore data from the selected file?
                                 <strong className="text-red-500"> This action cannot be undone and will overwrite all current purchases, items, and settings.</strong>
                              </p>
                          </div>
                     </div>
                 </div>
                 <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse gap-3">
                     <button
                         type="button"
                         className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:ml-3 sm:w-auto"
                         onClick={confirmRestore}
                      >
                         Yes, Overwrite and Restore
                      </button>
                      <button
                          type="button"
                          className="mt-3 inline-flex w-full justify-center rounded-md bg-input px-3 py-2 text-sm font-semibold text-text shadow-sm ring-1 ring-inset ring-border hover:bg-black/5 dark:hover:bg-white/5 sm:mt-0 sm:w-auto"
                          onClick={() => {
                              setShowRestoreConfirm(false);
                              setRestoreError(null);
                               // Reset file input again on cancel
                              if (fileInputRef.current) {
                                  fileInputRef.current.value = "";
                              }
                          }}
                       >
                          Cancel
                       </button>
                  </div>
              </div>
          </div>
      )}
    </>
  );
};

