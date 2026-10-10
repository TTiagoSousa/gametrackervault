import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type ThemeMode = 'dark' | 'light' | 'auto';

interface ThemeContextType {
  mode: ThemeMode;
  /** The theme actually on screen (resolves 'auto'). */
  isDark: boolean;
  handleDarkMode: () => void;
  handleLightMode: () => void;
  handleAutoMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  // Light is the Vault's original theme
  const [mode, setMode] = useState<ThemeMode>('light');

  // Loads the mode from localStorage once, on initial load
  useEffect(() => {
    const storedMode = localStorage.getItem('mode') as ThemeMode | null;
    if (storedMode) {
      setMode(storedMode);
    }
  }, []);

  // Updates the body class whenever "mode" changes
  useEffect(() => {
    if (mode === 'light') {
      document.body.className = 'Light_Mode';
    } else if (mode === 'dark') {
      document.body.className = 'Dark_Mode';
    } else {
      // auto mode — switches based on the time of day
      const currentTime = new Date().getHours();
      if (currentTime >= 20 || currentTime < 7) {
        document.body.className = 'Dark_Mode';
      } else {
        document.body.className = 'Light_Mode';
      }
    }
  }, [mode]);

  // Functions to switch theme
  const handleDarkMode = () => {
    localStorage.setItem('mode', 'dark');
    setMode('dark');
  };

  const handleLightMode = () => {
    localStorage.setItem('mode', 'light');
    setMode('light');
  };

  const handleAutoMode = () => {
    localStorage.setItem('mode', 'auto');
    setMode('auto');
  };

  const hour = new Date().getHours();
  const isDark = mode === 'dark' || (mode === 'auto' && (hour >= 20 || hour < 7));

  return (
    <ThemeContext.Provider
      value={{
        mode,
        isDark,
        handleDarkMode,
        handleLightMode,
        handleAutoMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  
  return context;
}