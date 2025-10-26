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
      // --- UPDATED BASE ---
      "--color-background": "#1e293b", // Dark blue/gray (slate-800)
      "--color-text": "#e2e8f0", // slate-200
      "--color-text-secondary": "#94a3b8", // slate-400
      "--color-primary": "#06b6d4", // cyan-500 (Keep accent)
      "--color-primary-text": "#0f172a", // slate-900
      "--color-primary-hover": "#0891b2", // cyan-600
      // --- UPDATED SHADES ---
      "--color-glass": "rgba(51, 65, 85, 0.6)", // Adjusted glass (slate-700/60)
      "--color-border": "#475569", // Adjusted border (slate-600)
      "--color-input": "rgba(51, 65, 85, 0.8)", // Adjusted input (slate-700/80)
      "--color-icon": "#06b6d4", // cyan-400 (Keep accent)
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
    midnight: {
    name: "Midnight",
    css: {
      "--color-background": "#111827", // Very dark blue/gray (gray-900)
      "--color-text": "#f3f4f6", // Light gray text (gray-100)
      "--color-text-secondary": "#9ca3af", // Medium gray text (gray-400)
      "--color-primary": "#ec4899", // Pink primary (pink-500)
      "--color-primary-text": "#ffffff", // White
      "--color-primary-hover": "#db2777", // Pink darker (pink-600)
      "--color-glass": "rgba(31, 41, 55, 0.6)", // Darker gray glass (gray-800/60)
      "--color-border": "#374151", // Medium dark gray border (gray-700)
      "--color-input": "rgba(55, 65, 81, 0.8)", // Dark gray input (gray-700/80)
      "--color-icon": "#ec4899", // Pink icon
    },
  },
    mint: {
    name: "Mint",
    css: {
      "--color-background": "#f0fdf4", // Light green background (green-50)
      "--color-text": "#1f2937", // Dark gray text (gray-800)
      "--color-text-secondary": "#6b7280", // Gray text (gray-500)
      "--color-primary": "#10b981", // Emerald primary (emerald-500)
      "--color-primary-text": "#ffffff", // White
      "--color-primary-hover": "#059669", // Emerald darker (emerald-600)
      "--color-glass": "rgba(236, 253, 245, 0.7)", // Light emerald glass (emerald-100/70)
      "--color-border": "#d1fae5", // Lighter emerald border (emerald-200)
      "--color-input": "rgba(255, 255, 255, 0.8)", // White input
      "--color-icon": "#10b981", // Emerald icon
    },
  },

  serenity: {
    name: "Serenity", // Inspired by Mauve Serenity
    css: {
        "--color-background": "#2c2a3e", // Dark purple/blue base
        "--color-text": "#e5e7eb", // Light gray (gray-200)
        "--color-text-secondary": "#a1a1aa", // Lighter purple/gray (zinc-400)
        "--color-primary": "#a88aac", // Mauve primary
        "--color-primary-text": "#1f2937", // Dark text on primary
        "--color-primary-hover": "#9f7d9f", // Slightly darker mauve
        "--color-glass": "rgba(71, 68, 92, 0.6)", // Darker glass (base color / 60%)
        "--color-border": "#5c5a70", // Mid-tone border
        "--color-input": "rgba(71, 68, 92, 0.8)", // Darker input (base color / 80%)
        "--color-icon": "#a88aac", // Mauve icon
    },
  },
  elegance: {
    name: "Elegance", // Inspired by Neutral Elegance
    css: {
        "--color-background": "#f8f6f4", // Off-white / light beige
        "--color-text": "#3a3633", // Dark brown/gray text
        "--color-text-secondary": "#8c8783", // Muted gray/brown secondary
        "--color-primary": "#d1a39a", // Muted pink/peach primary (last color in palette)
        "--color-primary-text": "#3a3633", // Dark text on primary
        "--color-primary-hover": "#c1938a", // Darker muted pink
        "--color-glass": "rgba(232, 229, 226, 0.7)", // Light beige glass
        "--color-border": "#dcd8d4", // Light gray/beige border
        "--color-input": "rgba(255, 255, 255, 0.9)", // Mostly white input
        "--color-icon": "#d1a39a", // Muted pink/peach icon
    },
  },
  mocha: {
    name: "Mocha", // Inspired by Neutral Elegance (Dark Variant)
    css: {
        "--color-background": "#3f322a", // Dark warm brown base (added red undertone) <-- UPDATED BASE
        "--color-text": "#f5f5f4", // Lighter text (stone-100) - Kept text
        "--color-text-secondary": "#a8a29e", // Lighter taupe/gray (stone-400) - Kept secondary
        "--color-primary": "#d1a39a", // Muted pink/peach primary (from palette) - Kept primary
        "--color-primary-text": "#292524", // Darkest brown/gray for contrast (stone-800) - Kept contrast
        "--color-primary-hover": "#c1938a", // Darker muted pink - Kept hover
        "--color-glass": "rgba(68, 64, 60, 0.6)", // Dark brown glass (using base / 60%) <-- UPDATED SHADE
        "--color-border": "#57534e", // Medium-dark brown/taupe border (stone-600) <-- UPDATED SHADE
        "--color-input": "rgba(68, 64, 60, 0.8)", // Dark brown input (using base / 80%) <-- UPDATED SHADE
        "--color-icon": "#d1a39a", // Muted pink/peach icon - Kept primary
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