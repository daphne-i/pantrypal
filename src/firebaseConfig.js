// src/firebaseConfig.js

/* global __firebase_config, __initial_auth_token, __app_id */
import { initializeApp } from "firebase/app";
import { 
    getAuth, 
    signInAnonymously, 
    signInWithCustomToken, 
    GoogleAuthProvider,
    signInWithPopup,
    signOut              
} from "firebase/auth";
// Import Firestore methods needed for persistence
import { 
    getFirestore, 
    initializeFirestore,        
    persistentLocalCache,      // <-- Import this for the new way
    persistentMultipleTabManager // <-- Import this if you want multi-tab support
    // enableIndexedDbPersistence, // <-- No longer needed directly here
    // setLogLevel // <-- Can be set later if needed
} from "firebase/firestore";

// --- START: Local Development Fix ---
// Default Firebase config (REPLACE WITH YOUR ACTUAL CONFIG)
const defaultConfig = {
  apiKey: "AIzaSyDRAXBINfaepUUJgZDo-0XDwQdTTaNEpIA",
  authDomain: "pantrypal-4ebee.firebaseapp.com",
  projectId: "pantrypal-4ebee",
  storageBucket: "pantrypal-4ebee.firebasestorage.app",
  messagingSenderId: "266489467931",
  appId: "1:266489467931:web:11a5d8c7dc6958f03a94be",
  measurementId: "G-S05F5BZ8T8"
};
// --- END OF VALUES TO REPLACE ---

// Check if the global variable exists, otherwise use our local default
const localFirebaseConfig = (typeof __firebase_config !== 'undefined')
  ? __firebase_config
  : JSON.stringify(defaultConfig);

// Check for the global auth token, otherwise use null
const localAuthToken = (typeof __initial_auth_token !== 'undefined')
  ? __initial_auth_token
  : null;

// Check for the global app ID, otherwise use a local-specific ID
export const appId = (typeof __app_id !== 'undefined')
  ? __app_id
  : 'local-pantrypal-app';
// --- END: Local Development Fix ---


// Initialize Firebase App
let app;
let firebaseConfig;
try {
    firebaseConfig = JSON.parse(localFirebaseConfig);
    // Basic validation to catch the placeholder issue early
    if (!firebaseConfig.apiKey || firebaseConfig.apiKey.startsWith("YOUR_")) {
        throw new Error("Firebase apiKey is missing or still a placeholder. Please check your firebaseConfig.js.");
    }
    app = initializeApp(firebaseConfig);
} catch (error) {
    console.error("CRITICAL: Failed to initialize Firebase App. Check config.", error);
    // You might want to display an error overlay to the user here
    // For now, we'll let it fail, but the app won't work.
    throw error; // Stop execution if Firebase can't init
}

const auth = getAuth(app);

// --- Initialize Firestore WITH Persistence (New Method) ---
let db;
try {
  // Use initializeFirestore with the recommended cache setting
  db = initializeFirestore(app, {
      // Use persistentLocalCache for offline support.
      // Optionally add persistentMultipleTabManager() if you need multi-tab sync (more complex setup)
      localCache: persistentLocalCache(/*{ tabManager: persistentMultipleTabManager() }*/) 
  });
  console.log("Firestore offline persistence enabled (using persistentLocalCache).");
} catch (error) {
    // Fallback if persistence fails (e.g., unsupported environment)
    console.error("Firestore Persistence Error:", error);
    console.warn("Falling back to in-memory Firestore cache.");
    db = getFirestore(app); 
}
// --- End Persistence Initialization ---

// Optional: Set log level if needed for debugging
// import { setLogLevel } from "firebase/firestore"; // Move import up if using
// setLogLevel('debug'); 

// Function to get the user ID
export const getUserId = () => {
  return auth.currentUser?.uid || null; 
};

// --- Authentication Functions ---
const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    // Ensure Firebase app initialized correctly before trying auth
    if (!app) throw new Error("Firebase App not initialized."); 
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    console.log("Signed in with Google:", user.displayName, user.uid);
    return user;
  } catch (error) {
    console.error("Google Sign-In Error:", error.code, error.message);
    // Add specific check for invalid API key during sign-in attempt
    if (error.code === 'auth/invalid-api-key' || error.message.includes('api-key-not-valid')) {
        alert("Configuration Error: The Firebase API Key is invalid. Please check your setup.");
    }
    throw error; 
  }
};

export const logOut = async () => {
  try {
    await signOut(auth);
    console.log("User signed out.");
  } catch (error) {
    console.error("Sign Out Error:", error);
    throw error;
  }
};

// Authentication initialization
let authInitialized = false;
export const initializeAuth = async () => {
  if (authInitialized || !app) return; // Don't run if already run or if app init failed
  authInitialized = true;

  if (localAuthToken) {
    try {
        await signInWithCustomToken(auth, localAuthToken);
        console.log("Firebase Auth: Signed in with custom token.");
    } catch(error) {
        console.error("Firebase Auth: Custom token sign-in error:", error);
    }
  } else {
     console.log("Firebase Auth: No custom token found. Waiting for user sign-in or existing session.");
  }
};

export { db, auth, app };