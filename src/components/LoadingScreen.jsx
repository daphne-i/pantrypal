import React from "react";
import { Loader2 } from "lucide-react";

export const LoadingScreen = () => {
  return (
    <div
      className={`w-full min-h-screen bg-gradient-to-br from-cyan-50 to-blue-100 text-slate-800 flex flex-col gap-4 items-center justify-center`}
    >
      <div className={`text-blue-500 animate-spin`}>
        <Loader2 size={48} />
      </div>
      <h1 className="text-2xl font-bold">PantryPal</h1>
      <p className="text-lg">Initializing your pantry...</p>
    </div>
  );
};