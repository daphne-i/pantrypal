import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "../firebaseConfig";

/**
 * A custom hook to fetch a Firestore collection in real-time.
 * [cite: 196-200]
 * @param {string} collectionPath The path to the collection.
 * @param {object} queryOptions Options for querying, e.g., { whereClauses, orderByClauses, docLimit }
 * @returns {object} { data, isLoading, error }
 */
export const useCollection = (collectionPath, queryOptions = {}) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!collectionPath) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let q = query(collection(db, collectionPath));

      if (queryOptions.whereClauses) {
        queryOptions.whereClauses.forEach((clause) => {
          q = query(q, where(...clause));
        });
      }

      if (queryOptions.orderByClauses) {
        queryOptions.orderByClauses.forEach((clause) => {
          q = query(q, orderBy(...clause));
        });
      }

      if (queryOptions.docLimit) {
        q = query(q, limit(queryOptions.docLimit));
      }

      const unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
          const documents = [];
          querySnapshot.forEach((doc) => {
            documents.push({ id: doc.id, ...doc.data() });
          });
          setData(documents);
          setIsLoading(false);
        },
        (err) => {
          console.error(`Error fetching collection ${collectionPath}:`, err);
          setError(err);
          setIsLoading(false);
        }
      );

      // Cleanup subscription on unmount
      return () => unsubscribe();
    } catch (err) {
      console.error(`Error setting up collection listener ${collectionPath}:`, err);
      setError(err);
      setIsLoading(false);
    }
  }, [collectionPath, JSON.stringify(queryOptions)]); // Re-run if path or options change

  return { data, isLoading, error };
};