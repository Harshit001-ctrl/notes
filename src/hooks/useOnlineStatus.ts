'use client';

import { useState, useEffect } from 'react';

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState<boolean>(true); // Default to true, will be updated by effect

  useEffect(() => {
    // Initial check
    if (typeof navigator !== 'undefined') {
      setOnline(navigator.onLine);
    }
    
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return online;
}
