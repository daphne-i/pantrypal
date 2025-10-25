import React, { useState } from "react";
import { ThemeProvider } from "./context/ThemeContext";
import { useAuth } from "./hooks/useAuth";
import { Layout } from "./components/Layout";
import { AddBillModal } from "./components/AddBillModal";
import { AddItemsModal } from "./components/AddItemsModal";
import { ConfirmModal } from "./components/ConfirmModal";
import { LoadingScreen } from "./components/LoadingScreen";
import { Dashboard } from "./pages/Dashboard";
import { SmartList } from "./pages/SmartList";
import { Reports } from "./pages/Reports";
import { Settings } from "./pages/Settings";
import { Toaster } from 'react-hot-toast';

// Auth context provider (no change)
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

  // --- Modal Management ---
  const [isAddBillModalOpen, setIsAddBillModalOpen] = useState(false);
  const [isAddItemsModalOpen, setIsAddItemsModalOpen] = useState(false);
  const [currentBillId, setCurrentBillId] = useState(null);
  const [currentBillDate, setCurrentBillDate] = useState(null); // This will now store the YYYY-MM-DD string

   // --- Open Add Bill Modal ---
   const openNewBillProcess = () => {
       setIsAddBillModalOpen(true);
   };

   // --- Handle Bill Save Success ---
   const handleBillSaved = (billId, billData) => {
        setIsAddBillModalOpen(false); // Close bill modal
        setCurrentBillId(billId); // Store the ID of the newly created/saved bill
        
        // --- FIX: Pass the YYYY-MM-DD string (billData.purchaseDate) directly ---
        // This was the line causing the bug. It no longer converts to a new Date().
        setCurrentBillDate(billData?.purchaseDate); 

        setIsAddItemsModalOpen(true); // Open item modal
   };

    // --- Handle Item Modal Close ---
    const handleItemsModalClose = () => {
        setIsAddItemsModalOpen(false);
        setCurrentBillId(null); 
        setCurrentBillDate(null);
    };

  if (!isAuthReady) {
    return <LoadingScreen />;
  }

  return (
    <ThemeProvider>
       {/* Toaster for notifications */}
       <Toaster
          position="top-center"
          reverseOrder={false}
          toastOptions={{
              duration: 3000,
          }}
       />

      <Layout
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        setIsModalOpen={openNewBillProcess} 
      >
        {/* Page "Router" */}
        {currentPage === "dashboard" && <Dashboard />}
        {currentPage === "smart-list" && <SmartList />}
        {currentPage === "reports" && <Reports />}
        {currentPage === "settings" && <Settings />}
      </Layout>

      {/* --- Render Modals --- */}
      <AddBillModal
        isOpen={isAddBillModalOpen}
        onClose={() => setIsAddBillModalOpen(false)}
        onSuccess={handleBillSaved}
      />

       <AddItemsModal
         isOpen={isAddItemsModalOpen}
         onClose={handleItemsModalClose}
         billId={currentBillId}
         billDate={currentBillDate} // Pass the correct YYYY-MM-DD string
       />

    </ThemeProvider>
  );
}

