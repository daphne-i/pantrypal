// src/components/LoginScreen.jsx (New File)
import React from 'react';
import { signInWithGoogle } from '../firebaseConfig'; // Adjust path if needed
import { Leaf } from 'lucide-react'; // Example icon

export const LoginScreen = () => {
  const handleLogin = async () => {
    try {
      await signInWithGoogle();
      // No need to redirect here, the App component will re-render
      // because the useAuth hook will update the user state.
    } catch (error) {
      // Handle login errors (e.g., display a message to the user)
      alert(`Login Failed: ${error.message}`);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-cyan-50 to-blue-100">
       <Leaf size={48} className="text-primary mb-4" />
      <h1 className="text-3xl font-bold mb-2 text-slate-800">Welcome to PantryPal</h1>
      <p className="text-slate-600 mb-6">Sign in to track your pantry across devices.</p>
      <button
        onClick={handleLogin}
        className="flex items-center gap-2 px-6 py-3 bg-white border border-border rounded-lg shadow-md hover:shadow-lg transition-shadow"
      >
        {/* Simple Google Icon Placeholder */}
        <svg className="w-5 h-5" viewBox="0 0 48 48">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.53-4.18 7.09-10.36 7.09-17.65z"></path>
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
          <path fill="none" d="M0 0h48v48H0z"></path>
        </svg>
        Sign in with Google
      </button>
    </div>
  );
};