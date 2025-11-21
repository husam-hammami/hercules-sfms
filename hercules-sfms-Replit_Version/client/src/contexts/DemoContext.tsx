import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface DemoContextType {
  isDemoMode: boolean;
  enterDemoMode: () => void;
  exitDemoMode: () => void;
}

const DemoContext = createContext<DemoContextType | undefined>(undefined);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [isDemoMode, setIsDemoMode] = useState(() => {
    // Only check for REAL authentication (sessionId)
    const hasRealSession = !!localStorage.getItem('sessionId');
    
    // If user has real authentication, they're NOT in demo mode
    if (hasRealSession) {
      localStorage.removeItem('isDemoMode');
      return false;
    }
    
    // Check if demo mode is active
    const saved = localStorage.getItem('isDemoMode');
    return saved === 'true';
  });

  // Monitor for real authentication changes
  useEffect(() => {
    const checkAuthStatus = () => {
      const hasRealSession = !!localStorage.getItem('sessionId');
      
      // If user gets a real session, exit demo mode
      if (hasRealSession && isDemoMode) {
        setIsDemoMode(false);
        localStorage.removeItem('isDemoMode');
      }
    };

    // Check immediately
    checkAuthStatus();
    
    // Set up a periodic check to detect real login
    const interval = setInterval(checkAuthStatus, 1000);
    
    return () => clearInterval(interval);
  }, [isDemoMode]);

  const enterDemoMode = () => {
    setIsDemoMode(true);
    localStorage.setItem('isDemoMode', 'true');
    // Clear any existing real auth tokens
    localStorage.removeItem('sessionId');
  };

  const exitDemoMode = () => {
    setIsDemoMode(false);
    localStorage.removeItem('isDemoMode');
    window.location.href = '/';
  };

  return (
    <DemoContext.Provider value={{ isDemoMode, enterDemoMode, exitDemoMode }}>
      {children}
    </DemoContext.Provider>
  );
}

export function useDemo() {
  const context = useContext(DemoContext);
  if (context === undefined) {
    throw new Error('useDemo must be used within a DemoProvider');
  }
  return context;
}
