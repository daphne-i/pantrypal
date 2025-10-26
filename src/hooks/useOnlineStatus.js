// src/hooks/useOnlineStatus.js
import { useState, useEffect } from 'react';

export const useOnlineStatus = () => {
  // Initialize state with the current online status
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // Handler to update state when browser goes online
    const handleOnline = () => setIsOnline(true);
    // Handler to update state when browser goes offline
    const handleOffline = () => setIsOnline(false);

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup function to remove listeners when the component unmounts
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []); // Empty dependency array means this effect runs only once on mount

  return isOnline;
};