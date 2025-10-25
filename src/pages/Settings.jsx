import React from "react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../hooks/useAuth";
import { Check, Copy, Loader2 } from "lucide-react";

// ThemeSelector Component (moved from App.jsx)
const ThemeSelector = () => {
  const { setCurrentTheme, themes, themeName } = useTheme();

  return (
    <div>
      <h3 className="text-lg font-semibold mb-3">Select Theme</h3>
      <div className="grid grid-cols-2 gap-4">
        {Object.values(themes).map((t) => (
          <button
            key={t.name}
            onClick={() => setCurrentTheme(t.name.toLowerCase())} // <-- FIX: Removed the invalid comment from here
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

  // Copy User ID to clipboard
  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    // Add a visual cue, e.g., show a "Copied!" message
  };

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-3xl font-bold">Settings</h1>
      <div
        className={`p-6 rounded-2xl bg-glass border border-border shadow-lg space-y-6`}
      >
        {/* Theme Selector */}
        <ThemeSelector />

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

        {/* Data Management (Sprint 3) */}
        <div>
          <h3 className="text-lg font-semibold mb-2">Data Management</h3>
          <div className="flex gap-4">
            <button
              className={`px-4 py-2 rounded-lg font-medium bg-green-500 text-white hover:bg-green-600 transition-colors`}
            >
              Backup My Data
            </button>
            <button
              className={`px-4 py-2 rounded-lg font-medium bg-red-500 text-white hover:bg-red-600 transition-colors`}
            >
              Restore from Backup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};