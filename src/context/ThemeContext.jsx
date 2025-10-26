import React, {
  useState,
  useEffect,
  createContext,
  useContext,
  useMemo,
} from "react";
import { useDocument } from "../hooks/useDocument";
import { useAuth } from "../hooks/useAuth";

// Define themes with '--color-text-secondary' added
const themes = {
  ocean: {
    name: "Ocean",
    css: {
      "--color-background": "#f0f9ff",
      "--color-text": "#1e293b", // slate-800
      "--color-text-secondary": "#64748b", // slate-500 <-- ADDED
      "--color-primary": "#3b82f6",
      "--color-primary-text": "#ffffff",
      "--color-primary-hover": "#2563eb",
      "--color-glass": "rgba(255, 255, 255, 0.6)",
      "--color-border": "#e2e8f0",
      "--color-input": "rgba(255, 255, 255, 0.8)",
      "--color-icon": "#3b82f6",
    },
  },
  obsidian: {
    name: "Obsidian",
    css: {
      "--color-background": "#0f172a",
      "--color-text": "#e2e8f0", // slate-200
      "--color-text-secondary": "#94a3b8", // slate-400 <-- ADDED
      "--color-primary": "#06b6d4",
      "--color-primary-text": "#0f172a",
      "--color-primary-hover": "#0891b2",
      "--color-glass": "rgba(30, 41, 59, 0.6)",
      "--color-border": "#334155",
      "--color-input": "rgba(30, 41, 59, 0.8)",
      "--color-icon": "#06b6d4",
    },
  },
  sunset: {
    name: "Sunset",
    css: {
      "--color-background": "#fff7ed",
      "--color-text": "#1e293b", // slate-800
      "--color-text-secondary": "#64748b", // slate-500 <-- ADDED
      "--color-primary": "#f97316",
      "--color-primary-text": "#ffffff",
      "--color-primary-hover": "#ea580c",
      "--color-glass": "rgba(255, 255, 255, 0.6)",
      "--color-border": "#e2e8f0",
      "--color-input": "rgba(255, 255, 255, 0.8)",
      "--color-icon": "#f97316",
    },
  },
  forest: {
    name: "Forest",
    css: {
      "--color-background": "#0f172a",
      "--color-text": "#e2e8f0", // slate-200
      "--color-text-secondary": "#94a3b8", // slate-400 <-- ADDED
      "--color-primary": "#22c55e",
      "--color-primary-text": "#ffffff",
      "--color-primary-hover": "#16a34a",
      "--color-glass": "rgba(30, 41, 59, 0.6)",
      "--color-border": "#334155",
      "--color-input": "rgba(30, 41, 59, 0.8)",
      "--color-icon": "#22c55e",
    },
  },
};

const ThemeContext = createContext();
export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  const [themeName, setThemeName] = useState("ocean");
  const { userId, appId } = useAuth();

  const { data: userProfile, updateDocument } = useDocument(
    userId && appId ? `artifacts/${appId}/users/${userId}/profile` : null, // Corrected path
    userId
  );

  // Load theme from Firestore
  useEffect(() => {
    if (userProfile?.theme && themes[userProfile.theme]) {
      setThemeName(userProfile.theme);
    }
  }, [userProfile]);

  // Apply theme CSS variables
  useEffect(() => {
    const theme = themes[themeName]?.css || themes.ocean.css;
    const root = document.documentElement;
    Object.keys(theme).forEach((key) => {
      root.style.setProperty(key, theme[key]);
    });
  }, [themeName]);

  // Save theme to Firestore
  const setCurrentTheme = async (name) => {
    if (themes[name]) {
      setThemeName(name);
      if (userId && updateDocument) { // Check if userId exists before saving
        try {
          await updateDocument({ theme: name }, { merge: true });
        } catch (error) {
          console.error("Failed to save theme:", error);
        }
      }
    }
  };

  const themeValue = useMemo(
    () => ({
      theme: themes[themeName],
      setCurrentTheme,
      themes,
      themeName,
    }),
    [themeName] // Removed setCurrentTheme from deps as it's stable
  );

  return (
    <ThemeContext.Provider value={themeValue}>
      <div
        className={`w-full min-h-screen bg-background text-text font-sans transition-colors duration-300`}
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
};