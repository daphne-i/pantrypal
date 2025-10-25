import { useState, useEffect, useCallback } from "react";
import {
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebaseConfig";

/**
 * A custom hook to fetch and update a single Firestore document.
 * [cite: 201-204]
 * @param {string} docPath The path to the document.
 * @param {string} docId The ID of the document.
 * @returns {object} { data, isLoading, error, updateDocument }
 */
export const useDocument = (docPath, docId) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!docPath || !docId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const docRef = doc(db, docPath, docId);
      const unsubscribe = onSnapshot(
        docRef,
        (docSnap) => {
          if (docSnap.exists()) {
            setData({ id: docSnap.id, ...docSnap.data() });
          } else {
            setData(null); // Document does not exist
          }
          setIsLoading(false);
        },
        (err) => {
          console.error(`Error fetching document ${docPath}/${docId}:`, err);
          setError(err);
          setIsLoading(false);
        }
      );

      // Cleanup subscription on unmount
      return () => unsubscribe();
    } catch (err) {
      console.error(`Error setting up document listener ${docPath}/${docId}:`, err);
      setError(err);
      setIsLoading(false);
    }
  }, [docPath, docId]);

  // Function to update the document [cite: 204]
  const updateDocument = useCallback(
    async (updateData, options = { merge: false }) => {
      if (!docPath || !docId) return;

      const docRef = doc(db, docPath, docId);
      try {
        if (options.merge) {
          // Use set with merge: true for "upsert" behavior [cite: 171]
          await setDoc(docRef, updateData, { merge: true });
        } else {
          await updateDoc(docRef, updateData);
        }
      } catch (err) {
        console.error("Error updating document:", err);
        throw err; // Re-throw to be caught by caller
      }
    },
    [docPath, docId]
  );

  return { data, isLoading, error, updateDocument };
};