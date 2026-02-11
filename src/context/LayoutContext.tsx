import React, { createContext, useState, useContext } from 'react';

interface LayoutContextType {
    sidebarCollapsed: boolean;
    toggleSidebar: () => void;
}

const LayoutContext = createContext<LayoutContextType>({
    sidebarCollapsed: false,
    toggleSidebar: () => {},
});

export const LayoutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    const toggleSidebar = () => {
        setSidebarCollapsed(prev => !prev);
    };

    return (
        <LayoutContext.Provider value={{ sidebarCollapsed, toggleSidebar }}>
            {children}
        </LayoutContext.Provider>
    );
};

export const useLayout = () => useContext(LayoutContext);
