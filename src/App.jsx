import React, { useState } from "react";
import { ThemeProvider } from "./context/ThemeContext";
import { useAuth } from "./hooks/useAuth";
import { Layout } from "./components/Layout";
import { AddPurchaseModal } from "./components/AddPurchaseModal";
import { LoadingScreen } from "./components/LoadingScreen";
import { Dashboard } from "./pages/Dashboard";
import { SmartList } from "./pages/SmartList";
import { Reports } from "./pages/Reports";
import { Settings } from "./pages/Settings";

// Auth context provider to pass auth state down
const AuthContext = React.createContext();
const AuthProvider = ({ children }) => {
  const auth = useAuth();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
};
// Re-export useAuth from context for convenience
export const useAuthContext = () => React.useContext(AuthContext); // <-- FIX was here

export default function AppWrapper() {
  // We wrap the app in AuthProvider so all components can access auth state
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}

function App() {
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { isAuthReady } = useAuthContext(); // Get auth state

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
      >
        {/* Page "Router" */}
        {currentPage === "dashboard" && <Dashboard />}
        {currentPage === "smart-list" && <SmartList />}
        {currentPage === "reports" && <Reports />}
        {currentPage === "settings" && <Settings />}
      </Layout>

      {/* Global Modal */}
      <AddPurchaseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </ThemeProvider>
  );
}