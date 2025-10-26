import React, { useState } from "react";
import { ThemeProvider } from "./context/ThemeContext";
import { useAuth } from "./hooks/useAuth";
import { Layout } from "./components/Layout";
import { AddBillModal } from "./components/AddBillModal";
import { AddItemsModal } from "./components/AddItemsModal";
import { LoadingScreen } from "./components/LoadingScreen";
import { Dashboard } from "./pages/Dashboard";
import { SmartList } from "./pages/SmartList";
import { Reports } from "./pages/Reports";
import { Settings } from "./pages/Settings";
import { Toaster } from 'react-hot-toast';
import { Timestamp } from "firebase/firestore"; // Import Timestamp
import { LoginScreen } from "./components/LoginScreen";

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
  const { user, isAuthReady } = useAuthContext();

  // --- Modal Management ---
  const [isAddBillModalOpen, setIsAddBillModalOpen] = useState(false);
  const [isAddItemsModalOpen, setIsAddItemsModalOpen] = useState(false);
  const [currentBillId, setCurrentBillId] = useState(null);
  const [currentBillDate, setCurrentBillDate] = useState(null); // This will be the YYYY-MM-DD string

   // --- Open Add Bill Modal ---
   const openNewBillProcess = () => {
       setIsAddBillModalOpen(true);
   };

   // --- Handle Bill Save Success ---
   const handleBillSaved = (billId, billData) => {
        setIsAddBillModalOpen(false);
        setCurrentBillId(billId);
        // This is now guaranteed to be the YYYY-MM-DD string from AddBillModal
        setCurrentBillDate(billData?.purchaseDate);
        setIsAddItemsModalOpen(true);
   };

    // --- **NEW FUNCTION** ---
    // Allows any page to open the AddItems modal for an existing bill
    const openAddItemsToBill = (billId, billDate) => {
        if (!billId || !billDate) {
            console.error("Missing billId or billDate");
            return;
        }

        // Ensure billDate is a YYYY-MM-DD string
        let dateString;
        if (billDate instanceof Timestamp) {
            const dateObj = billDate.toDate();
            const year = dateObj.getFullYear();
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const day = String(dateObj.getDate()).padStart(2, '0');
            dateString = `${year}-${month}-${day}`;
        } else if (typeof billDate === 'string' && billDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
            dateString = billDate;
        } else if (billDate instanceof Date) {
            const year = billDate.getFullYear();
            const month = String(billDate.getMonth() + 1).padStart(2, '0');
            const day = String(billDate.getDate()).padStart(2, '0');
            dateString = `${year}-${month}-${day}`;
        } else {
            console.error("Invalid date format provided:", billDate);
            return;
        }

        setCurrentBillId(billId);
        setCurrentBillDate(dateString);
        setIsAddItemsModalOpen(true);
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

 if (!user) {
   return (
     <ThemeProvider> {/* ThemeProvider might be needed for LoginScreen styling */}
       <LoginScreen />
     </ThemeProvider>
   );
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
        {/* Pass the new function to Dashboard and Reports */}
        {currentPage === "dashboard" && <Dashboard openAddItemsToBill={openAddItemsToBill} />}
        {currentPage === "smart-list" && <SmartList />}
        {currentPage === "reports" && <Reports openAddItemsToBill={openAddItemsToBill} />}
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
         billDate={currentBillDate} // Pass the bill date string
       />
    </ThemeProvider>
  );
}

