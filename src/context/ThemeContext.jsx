import React, {
  useState,
  useEffect,
  createContext,
  useContext,
  useMemo,
} from "react";
import { useDocument } from "../hooks/useDocument"; // We'll create this hook next
import { useAuth } from "../hooks/useAuth"; // And this one

// As defined in App.jsx and your plan [cite: 46, 47]
const themes = {
  ocean: {
    name: "Ocean",
    css: {
      "--color-background": "#f0f9ff", // slate-100/blue-100 gradient
      "--color-text": "#1e293b", // slate-800
      "--color-primary": "#3b82f6", // blue-500
      "--color-primary-text": "#ffffff", // white
      "--color-primary-hover": "#2563eb", // blue-600
      "--color-glass": "rgba(255, 255, 255, 0.6)", // bg-white/60
      "--color-border": "#e2e8f0", // slate-200
      "--color-input": "rgba(255, 255, 255, 0.8)", // bg-white/80
      "--color-icon": "#3b82f6", // blue-500
    },
  },
  obsidian: {
    name: "Obsidian",
    css: {
      "--color-background": "#0f172a", // slate-900/gray-900 gradient
      "--color-text": "#e2e8f0", // slate-200
      "--color-primary": "#06b6d4", // cyan-500
      "--color-primary-text": "#0f172a", // slate-900
      "--color-primary-hover": "#0891b2", // cyan-400
      "--color-glass": "rgba(30, 41, 59, 0.6)", // bg-slate-800/60
      "--color-border": "#334155", // slate-700
      "--color-input": "rgba(30, 41, 59, 0.8)", // bg-slate-800/80
      "--color-icon": "#06b6d4", // cyan-400
    },
  },
  sunset: {
    name: "Sunset",
    css: {
      "--color-background": "#fff7ed", // rose-50/orange-100 gradient
      "--color-text": "#1e293b", // slate-800
      "--color-primary": "#f97316", // orange-500
      "--color-primary-text": "#ffffff", // white
      "--color-primary-hover": "#ea580c", // orange-600
      "--color-glass": "rgba(255, 255, 255, 0.6)", // bg-white/60
      "--color-border": "#e2e8f0", // slate-200
      "--color-input": "rgba(255, 255, 255, 0.8)", // bg-white/80
      "--color-icon": "#f97316", // orange-500
    },
  },
  forest: {
    name: "Forest",
    css: {
      "--color-background": "#0f172a", // slate-900/green-900 gradient
      "--color-text": "#e2e8f0", // slate-200
      "--color-primary": "#22c55e", // green-500
      "--color-primary-text": "#ffffff", // white
      "--color-primary-hover": "#16a34a", // green-600
      "--color-glass": "rgba(30, 41, 59, 0.6)", // bg-slate-800/60
      "--color-border": "#334155", // slate-700
      "--color-input": "rgba(30, 41, 59, 0.8)", // bg-slate-800/80
      "--color-icon": "#22c55e", // green-400
    },
  },
};

const ThemeContext = createContext();
export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  const [themeName, setThemeName] = useState("ocean");
  const { userId, appId } = useAuth();
  
  // Use our new hook to get the user's profile doc 
  const { data: userProfile, updateDocument } = useDocument(
    `artifacts/${appId}/users/${userId}/profile`,
    userId // The document ID is the same as the user ID [cite: 153]
  );

  // Load theme from Firestore once userProfile is available
  useEffect(() => {
    if (userProfile?.theme && themes[userProfile.theme]) {
      setThemeName(userProfile.theme);
    }
  }, [userProfile]);

  // Apply theme CSS variables to the root element
  useEffect(() => {
    const theme = themes[themeName]?.css || themes.ocean.css;
    const root = document.documentElement;
    Object.keys(theme).forEach((key) => {
      root.style.setProperty(key, theme[key]);
    });
  }, [themeName]);

  // This function saves the theme to Firestore [cite: 132]
  const setCurrentTheme = async (name) => {
    if (themes[name]) {
      setThemeName(name);
      if (updateDocument) {
        try {
          // Asynchronously update the theme in Firestore
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
    [themeName, setCurrentTheme]
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