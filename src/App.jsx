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
import { Toaster } from 'react-hot-toast'; // <-- Import Toaster

// Auth context provider (no changes)
const AuthContext = React.createContext();
const AuthProvider = ({ children }) => {
  const auth = useAuth();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
};
export const useAuthContext = () => React.useContext(AuthContext);


export default function AppWrapper() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}

function App() {
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { isAuthReady } = useAuthContext();

  if (!isAuthReady) {
    return <LoadingScreen />;
  }

  return (
    <ThemeProvider>
       {/* Add Toaster component here - manages rendering toasts */}
       <Toaster
         position="top-center"
         reverseOrder={false}
         toastOptions={{
           duration: 3000, // Default duration
           style: {
             background: 'var(--color-glass)', // Use theme variable
             color: 'var(--color-text)',       // Use theme variable
             border: '1px solid var(--color-border)', // Use theme variable
             boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
           },
           success: {
             duration: 2000, // Shorter duration for success
             iconTheme: {
               primary: '#22c55e', // Green checkmark
               secondary: 'white',
             },
           },
           error: {
             duration: 4000, // Longer for errors
              iconTheme: {
               primary: '#ef4444', // Red X
               secondary: 'white',
             },
           },
         }}
       />
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
