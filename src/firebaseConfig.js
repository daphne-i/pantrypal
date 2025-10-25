/* global __firebase_config, __initial_auth_token, __app_id */
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, signInWithCustomToken } from "firebase/auth";
import { getFirestore, setLogLevel } from "firebase/firestore";

// --- START: Local Development Fix ---
// These variables are injected by the Canvas environment.
// We provide default values here for local development.

// 1. A default, *dummy* Firebase config.
//    Replace this with your *actual* Firebase project config
//    from the Firebase console to run locally.
const defaultConfig = {
  // --- PASTE YOUR COPIED VALUES HERE ---
  apiKey: "AIzaSyDRAXBINfaepUUJgZDo-0XDwQdTTaNEpIA", // <-- Replace
  authDomain: "pantrypal-4ebee.firebaseapp.com",      // <-- Replace
  projectId: "pantrypal-4ebee",                      // <-- Replace
  storageBucket: "pantrypal-4ebee.firebasestorage.app", // <-- Replace
  messagingSenderId: "266489467931",                 // <-- Replace
  appId: "1:266489467931:web:11a5d8c7dc6958f03a94be", // <-- Replace
  measurementId: "G-S05F5BZ8T8" // <-- Replace (Optional, keep if you have it)
  // --- END OF VALUES TO PASTE ---
};

// Check if the global variable exists, otherwise use our local default
const localFirebaseConfig = (typeof __firebase_config !== 'undefined')
  ? __firebase_config
  : JSON.stringify(defaultConfig);

// Check for the global auth token, otherwise use null (to trigger anonymous sign-in)
const localAuthToken = (typeof __initial_auth_token !== 'undefined')
  ? __initial_auth_token
  : null;

// Check for the global app ID, otherwise use a local-specific ID
export const appId = (typeof __app_id !== 'undefined')
  ? __app_id
  : 'local-pantrypal-app';
// --- END: Local Development Fix ---


// Initialize Firebase
const firebaseConfig = JSON.parse(localFirebaseConfig);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
setLogLevel('debug'); // See Firebase logs in your browser console

// Function to get the user ID
export const getUserId = () => {
  return auth.currentUser?.uid || crypto.randomUUID();
};

// Authentication handler
let authInitialized = false;
export const initializeAuth = async () => {
  if (authInitialized) return;
  authInitialized = true;

  try {
    if (localAuthToken) {
      // This will run in the Canvas environment
      await signInWithCustomToken(auth, localAuthToken);
    } else {
      // This will run in your local environment
      console.log("No custom token found, signing in anonymously for local dev...");
      await signInAnonymously(auth);
    }
    console.log("Firebase Auth initialized. User UID:", auth.currentUser?.uid);
  } catch (error) {
    console.error("Firebase Auth Error:", error);
    // Removed the specific API key error message as it's less likely now
  }
};

export { db, auth, app };
