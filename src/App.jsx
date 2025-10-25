import React, { useState } from "react";
import { ThemeProvider } from "./context/ThemeContext";
import { useAuth } from "./hooks/useAuth";
import { Layout } from "./components/Layout";
// Import the new Modals
import { AddBillModal } from "./components/AddBillModal";
import { AddItemsModal } from "./components/AddItemsModal";
// Removed AddPurchaseModal import
import { LoadingScreen } from "./components/LoadingScreen";
import { Dashboard } from "./pages/Dashboard";
import { SmartList } from "./pages/SmartList";
import { Reports } from "./pages/Reports";
import { Settings } from "./pages/Settings";
import { Toaster } from 'react-hot-toast';
import { Timestamp } from "firebase/firestore"; // Import Timestamp

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
  const { isAuthReady } = useAuthContext();

  // State for the modals
  const [isAddBillOpen, setIsAddBillOpen] = useState(false);
  const [isAddItemsOpen, setIsAddItemsOpen] = useState(false);
  const [currentBillId, setCurrentBillId] = useState(null);
  const [currentBillData, setCurrentBillData] = useState(null);

   // Function called by AddBillModal on successful save
   const handleBillCreated = (billId, billData) => {
       setCurrentBillId(billId);
       setCurrentBillData(billData);
       setIsAddBillOpen(false);
       setIsAddItemsOpen(true);
   };

   // Function to close the AddItemsModal
   const handleCloseAddItems = () => {
       setIsAddItemsOpen(false);
       setCurrentBillId(null);
       setCurrentBillData(null);
   };


  if (!isAuthReady) {
    return <LoadingScreen />;
  }

  return (
    <ThemeProvider>
       <Toaster
         position="top-center"
         reverseOrder={false}
         toastOptions={{
           duration: 3000,
           style: {
             background: 'var(--color-glass)',
             color: 'var(--color-text)',
             border: '1px solid var(--color-border)',
             boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
           },
           success: { duration: 2000, iconTheme: { primary: '#22c55e', secondary: 'white' } },
           error: { duration: 4000, iconTheme: { primary: '#ef4444', secondary: 'white' } },
           loading: { iconTheme: { primary: 'var(--color-primary)', secondary: 'transparent' } }
         }}
       />
      <Layout
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        setIsModalOpen={setIsAddBillOpen} // FAB now opens AddBillModal
      >
        {/* Page "Router" */}
        {currentPage === "dashboard" && <Dashboard />}
        {currentPage === "smart-list" && <SmartList />}
        {currentPage === "reports" && <Reports />}
        {currentPage === "settings" && <Settings />}
      </Layout>

      {/* Render Modals */}
      <AddBillModal
        isOpen={isAddBillOpen}
        onClose={() => setIsAddBillOpen(false)}
        onBillCreated={handleBillCreated}
      />

       <AddItemsModal
         isOpen={isAddItemsOpen}
         onClose={handleCloseAddItems}
         billId={currentBillId}
         billData={currentBillData}
       />

        {/* BillDetailsModal is rendered inside Dashboard now */}

    </ThemeProvider>
  );
}

