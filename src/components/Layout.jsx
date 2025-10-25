import React from "react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../hooks/useAuth";
import {
  LayoutDashboard,
  ShoppingCart,
  BarChart3,
  Settings as SettingsIcon,
  Plus,
  User,
  Leaf,
} from "lucide-react";

export const Layout = ({
  children,
  currentPage,
  setCurrentPage,
  setIsModalOpen,
}) => {
  const { theme } = useTheme();
  const { userId } = useAuth();

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
        className={`hidden md:block fixed bottom-8 right-8 z-50 bg-primary text-primary-text p-4 rounded-full shadow-lg cursor-pointer primary-hover transition-all duration-300 transform hover:scale-110`} // <-- FIX: Removed invalid comment
        onClick={() => setIsModalOpen(true)}
      >
        <Plus size={28} />
      </div>
    </div>
  );
};

// --- Sidebar (Desktop) ---
const Sidebar = ({ currentPage, setCurrentPage, userId }) => {
  return (
    <nav
      className={`w-64 min-h-screen bg-glass border-r border-border p-6 flex flex-col justify-between shadow-lg`}
    >
      <div>
        {/* Logo */}
        <div
          className={`flex items-center gap-2 mb-10 text-icon cursor-pointer`}
          onClick={() => setCurrentPage("dashboard")}
        >
          <Leaf size={32} />
          <span className="text-2xl font-bold text-text">PantryPal</span>
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
            icon={SettingsIcon}
            isActive={currentPage === "settings"}
            onClick={() => setCurrentPage("settings")}
          />
        </ul>
      </div>

      {/* User / Logout */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-black/5 dark:bg-white/5">
        <div className={`p-2 rounded-full bg-glass border border-border`}>
          <User size={20} />
        </div>
        <div className="flex-1 overflow-hidden">
          <span className="text-xs font-medium">User ID</span>
          <p className="text-xs truncate" title={userId}>
            {userId ? userId : "Loading..."}
          </p>
        </div>
      </div>
    </nav>
  );
};

// --- BottomNav (Mobile) ---
const BottomNav = ({ currentPage, setCurrentPage, setIsModalOpen }) => {
  return (
    <nav
      className={`bg-glass border-t border-border flex justify-around items-center p-2 shadow-inner-top`}
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
        className={`-mt-10 z-50 bg-primary text-primary-text p-4 rounded-full shadow-lg cursor-pointer primary-hover transition-all duration-300 transform hover:scale-110`}
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
        icon={SettingsIcon}
        isActive={currentPage === "settings"}
        onClick={() => setCurrentPage("settings")}
        isMobile
      />
    </nav>
  );
};

// --- NavItem (Used by Sidebar & BottomNav) ---
const NavItem = ({ label, icon: Icon, isActive, onClick, isMobile }) => {
  if (isMobile) {
    return (
      <button
        onClick={onClick}
        className={`flex flex-col items-center justify-center p-2 rounded-lg ${
          isActive ? "text-icon" : "text-slate-500"
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
            ? `bg-primary text-primary-text shadow-md`
            : `hover:bg-black/5 dark:hover:bg-white/5`
        } transition-all duration-200`}
      >
        <Icon size={20} />
        <span>{label}</span>
      </button>
    </li>
  );
};