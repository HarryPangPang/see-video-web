import React, { createContext, useContext } from 'react';

interface LayoutContextType {
  openProfileDialog: () => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export function LayoutProvider({
  children,
  openProfileDialog,
}: {
  children: React.ReactNode;
  openProfileDialog: () => void;
}) {
  return (
    <LayoutContext.Provider value={{ openProfileDialog }}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  const ctx = useContext(LayoutContext);
  if (ctx === undefined) {
    throw new Error('useLayout must be used within LayoutProvider');
  }
  return ctx;
}
