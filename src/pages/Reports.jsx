import React from "react";
import { useTheme } from "../context/ThemeContext";

export const Reports = () => {
  const { theme } = useTheme();
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Reports</h1>
      <div
        className={`p-6 rounded-2xl bg-glass border border-border shadow-lg`}
      >
        <p>This is the Reports page. Charts will go here. (Sprint 2) [cite: 214]</p>
      </div>
    </div>
  );
};