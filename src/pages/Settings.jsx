import React, { useState, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../hooks/useAuth";
import { useDocument } from "../hooks/useDocument"; // <-- Added useDocument
import { Check, Copy, Loader2, Save } from "lucide-react"; // <-- Added Save

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
  const [copySuccess, setCopySuccess] = useState(false); // To show feedback on copy

  // Fetch user profile
  const { data: userProfile, updateDocument, isLoading } = useDocument(
    `artifacts/${appId}/users/${userId}/profile`,
    userId
  );

  // Load budget into input when profile data loads
  useEffect(() => {
    // Set budget only if it exists in the profile, otherwise keep it empty
    // Convert to string to handle potential 0 value correctly
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

  // Determine if the budget has changed from the loaded profile value
  const budgetChanged = budgetInput !== (userProfile?.monthlyBudget !== undefined ? String(userProfile.monthlyBudget) : "");


  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-3xl font-bold">Settings</h1>
      <div
        className={`p-6 rounded-2xl bg-glass border border-border shadow-lg space-y-6`}
      >
        {/* Theme Selector */}
        <ThemeSelector />

        {/* --- Monthly Budget --- */}
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

        {/* Data Management (Sprint 3) */}
        <div>
          <h3 className="text-lg font-semibold mb-2">Data Management</h3>
          <div className="flex gap-4">
            <button
              className={`px-4 py-2 rounded-lg font-medium bg-green-500 text-white hover:bg-green-600 transition-colors opacity-50 cursor-not-allowed`} // Placeholder style
              disabled // Feature for Sprint 3
            >
              Backup My Data
            </button>
            <button
              className={`px-4 py-2 rounded-lg font-medium bg-red-500 text-white hover:bg-red-600 transition-colors opacity-50 cursor-not-allowed`} // Placeholder style
              disabled // Feature for Sprint 3
            >
              Restore from Backup
            </button>
          </div>
          <p className="text-xs text-text-secondary mt-1">(Coming in Sprint 3)</p>
        </div>
      </div>
    </div>
  );
};

