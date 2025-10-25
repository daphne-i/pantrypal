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
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "YOUR_AUTH_DOMAIN_HERE",
  projectId: "YOUR_PROJECT_ID_HERE",
  storageBucket: "YOUR_STORAGE_BUCKET_HERE",
  messagingSenderId: "YOUR_SENDER_ID_HERE",
  appId: "YOUR_APP_ID_HERE"
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
    if (error.code === 'auth/invalid-api-key') {
      console.error("Local Dev Fix: Please add your Firebase project's config to src/firebaseConfig.js");
    }
  }
};

export { db, auth, app };

