import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, initializeAuth, appId } from "../firebaseConfig";

export const useAuth = () => {
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    let unsubscribe;
    const init = async () => {
      try {
        await initializeAuth();
        unsubscribe = onAuthStateChanged(auth, (user) => {
          setUser(user);
          if (user) {
            console.log("User is signed in with UID:", user.uid);
          } else {
            console.log("User is signed out.");
          }
          setIsAuthReady(true);
        });
      } catch (error) {
        console.error("Failed to initialize auth:", error);
        setIsAuthReady(true); // Unblock UI even on error
      }
    };
    init();

    // Cleanup subscription on unmount
    return () => unsubscribe && unsubscribe();
  }, []);

  return { 
    isAuthReady, 
    user, 
    userId: user?.uid, 
    appId 
  };
};