import React, {
  useState,
  useEffect,
  createContext,
  useContext,
  useMemo,
} from "react";
import {
  // initializeApp, // <-- Unused for now
  // We'll need these later for our components
} from "firebase/app";
import {
  // getAuth, // <-- Unused for now
  onAuthStateChanged,
  // We'll need these later
} from "firebase/auth";
import {
  getFirestore, // <-- Un-commented
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  db, // <-- Un-commented
  auth,
  initializeAuth,
  // getUserId, // <-- Unused for now
  appId,
} from "./firebaseConfig.js"; // <-- FIX: Re-added .js extension

// --- Import Icons ---
import {
  LayoutDashboard,
  ShoppingCart,
  BarChart3,
  Settings as SettingsIcon, // <-- FIX: Renamed icon to avoid conflict
  Sun,
  Moon,
  Plus,
  LogOut,
  User,
  Check,
  ChevronDown,
  X,
  Loader2,
  Leaf,
} from "lucide-react";

// === 1. THEME CONTEXT ===
// As defined in our design: "Ocean" (light) and "Obsidian" (dark)
const themes = {
  ocean: {
    name: "Ocean",
    bg: "bg-gradient-to-br from-cyan-50 to-blue-100",
    text: "text-slate-800",
    primary: "blue-500",
    primaryText: "text-white",
    primaryHover: "hover:bg-blue-600",
    glass: "bg-white/60 backdrop-blur-lg",
    border: "border-slate-200",
    input: "bg-white/80 border-slate-300",
    icon: "text-blue-500",
  },
  obsidian: {
    name: "Obsidian",
    bg: "bg-gradient-to-br from-slate-900 to-gray-900",
    text: "text-slate-200",
    primary: "cyan-500",
    primaryText: "text-slate-900",
    primaryHover: "hover:bg-cyan-400",
    glass: "bg-slate-800/60 backdrop-blur-lg",
    border: "border-slate-700",
    input: "bg-slate-800/80 border-slate-600",
    icon: "text-cyan-400",
  },
  // We can add more themes here later
  sunset: {
    name: "Sunset",
    bg: "bg-gradient-to-br from-rose-50 to-orange-100",
    text: "text-slate-800",
    primary: "orange-500",
    primaryText: "text-white",
    primaryHover: "hover:bg-orange-600",
    glass: "bg-white/60 backdrop-blur-lg",
    border: "border-slate-200",
    input: "bg-white/80 border-slate-300",
    icon: "text-orange-500",
  },
  forest: {
    name: "Forest",
    bg: "bg-gradient-to-br from-slate-900 to-green-900",
    text: "text-slate-200",
    primary: "green-500",
    primaryText: "text-white",
    primaryHover: "hover:bg-green-600",
    glass: "bg-slate-800/60 backdrop-blur-lg",
    border: "border-slate-700",
    input: "bg-slate-800/80 border-slate-600",
    icon: "text-green-400",
  },
};

const ThemeContext = createContext();
const useTheme = () => useContext(ThemeContext);

const ThemeProvider = ({ children }) => {
  const [themeName, setThemeName] = useState("ocean"); // Default theme
  const theme = themes[themeName];

  // This function will be used by the Settings page
  const setCurrentTheme = (name) => {
    if (themes[name]) {
      setThemeName(name);
      // We'll add localStorage persistence later
    }
  };

  const themeValue = useMemo(
    () => ({ theme, setCurrentTheme, themes, themeName }),
    [theme, themeName]
  );

  return (
    <ThemeContext.Provider value={themeValue}>
      <div
        className={`w-full min-h-screen ${theme.bg} ${theme.text} font-sans transition-colors duration-300`}
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
};

// === 2. MAIN APP COMPONENT ===
export default function App() {
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [userId, setUserId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Initialize Firebase Auth on app load
  useEffect(() => {
    const init = async () => {
      try {
        await initializeAuth();
        // Set up auth state listener
        onAuthStateChanged(auth, (user) => {
          if (user) {
            setUserId(user.uid);
            console.log("User is signed in with UID:", user.uid);
          } else {
            setUserId(null); // User is signed out
            console.log("User is signed out.");
          }
          setIsAuthReady(true);
        });
      } catch (error) {
        console.error("Failed to initialize auth:", error);
        setIsAuthReady(true); // Still set to true to unblock UI, even on error
      }
    };
    init();
  }, []);

  // Show loading screen until Firebase is ready
  if (!isAuthReady) {
    return <LoadingScreen />;
  }

  return (
    <ThemeProvider>
      <Layout
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        setIsModalOpen={setIsModalOpen}
        userId={userId}
      >
        {/* This is our "Router" - it swaps the content based on state */}
        {currentPage === "dashboard" && <Dashboard db={db} userId={userId} appId={appId} />}
        {currentPage === "smart-list" && <SmartList />}
        {currentPage === "reports" && <Reports />}
        {currentPage === "settings" && (
          <Settings userId={userId} appId={appId} />
        )}
      </Layout>

      {/* The "Add Purchase" modal, controlled by state */}
      <AddPurchaseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        db={db}
        userId={userId}
        appId={appId}
      />
    </ThemeProvider>
  );
}

// === 3. LAYOUT & NAVIGATION ===
const Layout = ({
  children,
  currentPage,
  setCurrentPage,
  setIsModalOpen,
  userId,
}) => {
  const { theme } = useTheme();

  return (
    <div className="flex w-full min-h-screen">
      {/* Sidebar (Desktop) */}
      <div className="hidden md:flex md:w-64">
        <Sidebar
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          userId={userId}
        />
      </div>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 max-h-screen overflow-y-auto">
        <div className="max-w-7xl mx-auto w-full">{children}</div>
      </main>

      {/* Bottom Nav (Mobile) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0">
        <BottomNav
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          setIsModalOpen={setIsModalOpen}
        />
      </div>

      {/* FAB (Floating Action Button) - Desktop */}
      <div
        className={`hidden md:block fixed bottom-8 right-8 z-50 ${theme.primary} ${theme.primaryText} p-4 rounded-full shadow-lg cursor-pointer ${theme.primaryHover} transition-all duration-300 transform hover:scale-110`}
        onClick={() => setIsModalOpen(true)}
      >
        <Plus size={28} />
      </div>
    </div>
  );
};

// --- Sidebar (Desktop) ---
const Sidebar = ({ currentPage, setCurrentPage, userId }) => {
  const { theme } = useTheme();

  return (
    <nav
      className={`w-64 min-h-screen ${theme.glass} border-r ${theme.border} p-6 flex flex-col justify-between shadow-lg`}
    >
      <div>
        {/* Logo */}
        <div
          className={`flex items-center gap-2 mb-10 ${theme.icon} cursor-pointer`}
          onClick={() => setCurrentPage("dashboard")}
        >
          <Leaf size={32} />
          <span className="text-2xl font-bold">PantryPal</span>
        </div>

        {/* Nav Items */}
        <ul className="space-y-3">
          <NavItem
            label="Dashboard"
            icon={LayoutDashboard}
            isActive={currentPage === "dashboard"}
            onClick={() => setCurrentPage("dashboard")}
          />
          <NavItem
            label="Smart List"
            icon={ShoppingCart}
            isActive={currentPage === "smart-list"}
            onClick={() => setCurrentPage("smart-list")}
          />
          <NavItem
            label="Reports"
            icon={BarChart3}
            isActive={currentPage === "reports"}
            onClick={() => setCurrentPage("reports")}
          />
          <NavItem
            label="Settings"
            icon={SettingsIcon} // <-- FIX: Use renamed icon
            isActive={currentPage === "settings"}
            onClick={() => setCurrentPage("settings")}
          />
        </ul>
      </div>

      {/* User / Logout */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-black/5 dark:bg-white/5">
        <div
          className={`p-2 rounded-full ${theme.glass} border ${theme.border}`}
        >
          <User size={20} />
        </div>
        <div className="flex-1 overflow-hidden">
          <span className="text-xs font-medium">User ID</span>
          <p className="text-xs truncate" title={userId}>
            {userId ? userId : "Loading..."}
          </p>
        </div>
        {/* <LogOut size={20} className="text-slate-500 cursor-pointer" /> */}
      </div>
    </nav>
  );
};

// --- BottomNav (Mobile) ---
const BottomNav = ({ currentPage, setCurrentPage, setIsModalOpen }) => {
  const { theme } = useTheme();

  return (
    <nav
      className={`${theme.glass} border-t ${theme.border} flex justify-around items-center p-2 shadow-inner-top`}
    >
      <NavItem
        label="Dashboard"
        icon={LayoutDashboard}
        isActive={currentPage === "dashboard"}
        onClick={() => setCurrentPage("dashboard")}
        isMobile
      />
      <NavItem
        label="Smart List"
        icon={ShoppingCart}
        isActive={currentPage === "smart-list"}
        onClick={() => setCurrentPage("smart-list")}
        isMobile
      />

      {/* Mobile FAB */}
      <div
        className={`-mt-10 z-50 ${theme.primary} ${theme.primaryText} p-4 rounded-full shadow-lg cursor-pointer ${theme.primaryHover} transition-all duration-300 transform hover:scale-110`}
        onClick={() => setIsModalOpen(true)}
      >
        <Plus size={32} />
      </div>

      <NavItem
        label="Reports"
        icon={BarChart3}
        isActive={currentPage === "reports"}
        onClick={() => setCurrentPage("reports")}
        isMobile
      />
      <NavItem
        label="Settings"
        icon={SettingsIcon} // <-- FIX: Use renamed icon
        isActive={currentPage === "settings"} // <-- FIX: Removed stray 's'
        onClick={() => setCurrentPage("settings")}
        isMobile
      />
    </nav>
  );
};

// --- NavItem (Used by Sidebar & BottomNav) ---
const NavItem = ({ label, icon: Icon, isActive, onClick, isMobile }) => {
  const { theme } = useTheme();

  if (isMobile) {
    return (
      <button
        onClick={onClick}
        className={`flex flex-col items-center justify-center p-2 rounded-lg ${
          isActive ? theme.icon : "text-slate-500"
        } transition-colors duration-200`}
      >
        <Icon size={22} />
        <span className="text-xs font-medium">{label}</span>
      </button>
    );
  }

  return (
    <li>
      <button
        onClick={onClick}
        className={`w-full flex items-center gap-3 p-3 rounded-lg font-medium ${
          isActive
            ? `${theme.primary} ${theme.primaryText} shadow-md`
            : `hover:bg-black/5 dark:hover:bg-white/5`
        } transition-all duration-200`}
      >
        <Icon size={20} />
        <span>{label}</span>
      </button>
    </li>
  );
};

// === 4. PAGE COMPONENTS (PLACEHOLDERS) ===

// --- Dashboard ---
const Dashboard = ({ db, userId, appId }) => {
  const { theme } = useTheme();
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <div
        className={`p-6 rounded-2xl ${theme.glass} border ${theme.border} shadow-lg`}
      >
        <p>This is the Dashboard. Widgets will go here.</p>
      </div>
    </div>
  );
};

// --- SmartList ---
const SmartList = () => {
  const { theme } = useTheme();
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Smart Shopping List</h1>
      <div
        className={`p-6 rounded-2xl ${theme.glass} border ${theme.border} shadow-lg`}
      >
        <p>This is the Smart List. The item list will go here.</p>
      </div>
    </div>
  );
};

// --- Reports ---
const Reports = () => {
  const { theme } = useTheme();
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Reports</h1>
      <div
        className={`p-6 rounded-2xl ${theme.glass} border ${theme.border} shadow-lg`}
      >
        <p>This is the Reports page. Charts will go here.</p>
      </div>
    </div>
  );
};

// --- Settings ---
const Settings = ({ userId, appId }) => {
  const { theme } = useTheme();
  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-3xl font-bold">Settings</h1>
      <div
        className={`p-6 rounded-2xl ${theme.glass} border ${theme.border} shadow-lg space-y-6`}
      >
        {/* Theme Selector */}
        <ThemeSelector />

        {/* User Info */}
        <div>
          <h3 className="text-lg font-semibold mb-2">Account</h3>
          <div
            className={`p-4 rounded-lg ${theme.input} border ${theme.border}`}
          >
            <p className="text-sm font-medium">App ID:</p>
            <p className="text-xs truncate mb-2">{appId}</p>
            <p className="text-sm font-medium">User ID:</p>
            <p className="text-xs truncate">{userId}</p>
          </div>
        </div>

        {/* Data Management */}
        <div>
          <h3 className="text-lg font-semibold mb-2">Data Management</h3>
          <div className="flex gap-4">
            <button
              className={`px-4 py-2 rounded-lg font-medium bg-green-500 text-white hover:bg-green-600 transition-colors`}
            >
              Backup Data
            </button>
            <button
              className={`px-4 py-2 rounded-lg font-medium bg-red-500 text-white hover:bg-red-600 transition-colors`}
            >
              Restore Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// === 5. MODAL & HELPER COMPONENTS ===

// --- AddPurchaseModal ---
const AddPurchaseModal = ({ isOpen, onClose, db, userId, appId }) => {
  const { theme } = useTheme();
  const [itemName, setItemName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("Produce"); // Default category
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null); // For user-facing errors

  const resetForm = () => {
    setItemName("");
    setPrice("");
    setCategory("Produce");
    setError(null);
  };

  const handleClose = () => {
    if (isSaving) return; // Don't close while saving
    resetForm();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null); // Clear previous errors

    if (!db || !userId || !appId) {
      console.error("Database connection or user not ready");
      setError("Not connected. Please try again in a moment.");
      return;
    }

    // Basic validation
    if (!itemName.trim() || !price || isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      console.error("Invalid input");
      setError("Please enter a valid item name and price.");
      return;
    }

    setIsSaving(true);
    try {
      // Use the private data path
      const collectionPath = `/artifacts/${appId}/users/${userId}/purchases`;
      const docRef = await addDoc(collection(db, collectionPath), {
        name: itemName.trim(),
        price: parseFloat(price),
        category: category,
        purchaseDate: serverTimestamp(),
        userId: userId,
      });

      console.log("Document written with ID: ", docRef.id);
      handleClose(); // Reset form and close modal on success
    } catch (err) {
      console.error("Error adding document: ", err);
      setError("Failed to save purchase. Please try again.");
    } finally {
      setIsSaving(false);
    }
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
        className={`w-full max-w-md p-6 rounded-2xl ${theme.glass} border ${theme.border} shadow-xl z-50`}
        onClick={(e) => e.stopPropagation()} // Prevent click-through
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
              className={`w-full p-3 rounded-lg ${theme.input} border ${theme.border} focus:ring-2 focus:${theme.primary} focus:outline-none`}
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
              min="0.01" // Price should be greater than 0
              placeholder="$ 3.99"
              className={`w-full p-3 rounded-lg ${theme.input} border ${theme.border} focus:ring-2 focus:${theme.primary} focus:outline-none`}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              disabled={isSaving}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select
              className={`w-full p-3 rounded-lg ${theme.input} border ${theme.border} focus:ring-2 focus:${theme.primary} focus:outline-none appearance-none`}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={isSaving}
            >
              <option>Produce</option>
              <option>Dairy</option>
              <option>Meat</option>
              <option>Pantry</option>
              <option>Frozen</option>
              <option>Other</option>
            </select>
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
              className={`flex items-center justify-center gap-2 px-5 py-2 rounded-lg font-medium ${theme.primary} ${theme.primaryText} ${theme.primaryHover} transition-colors disabled:opacity-70`}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Plus size={18} />
              )}
              {isSaving ? "Saving..." : "Save Purchase"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- ThemeSelector (for Settings page) ---
const ThemeSelector = () => {
  const { theme, setCurrentTheme, themes, themeName } = useTheme();

  return (
    <div>
      <h3 className="text-lg font-semibold mb-3">Select Theme</h3>
      <div className="grid grid-cols-2 gap-4">
        {Object.values(themes).map((t) => (
          <button
            key={t.name}
            onClick={() => setCurrentTheme(t.name.toLowerCase())}
            className={`p-4 rounded-lg border-2 ${
              themeName === t.name.toLowerCase()
                ? `border-${t.primary}`
                : theme.border
            } ${t.bg} ${t.text} shadow-sm hover:shadow-md transition-all`}
          >
            <div className="flex justify-between items-center mb-3">
              <span className="font-semibold">{t.name}</span>
              {themeName === t.name.toLowerCase() && (
                <div
                  className={`w-5 h-5 rounded-full bg-${t.primary} flex items-center justify-center`}
                >
                  <Check size={14} className={`${t.primaryText}`} />
                </div>
              )}
            </div>
            <div className="flex gap-1">
              <div className={`w-1/2 h-5 rounded bg-${t.primary}`}></div>
              <div
                className={`w-1/2 h-5 rounded ${t.glass} border border-${t.border}`}
              ></div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

// --- LoadingScreen ---
const LoadingScreen = () => {
  // Use a simple theme for the loading screen
  const theme = themes.ocean;
  return (
    <div
      className={`w-full min-h-screen ${theme.bg} ${theme.text} flex flex-col gap-4 items-center justify-center`}
    >
      <div className={`${theme.icon} animate-spin`}>
        <Loader2 size={48} />
      </div>
      <h1 className="text-2xl font-bold">PantryPal</h1>
      <p className="text-lg">Initializing your pantry...</p>
    </div>
  );
};

