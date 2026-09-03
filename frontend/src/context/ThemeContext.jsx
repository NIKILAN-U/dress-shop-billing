import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    localStorage.setItem('app-theme', 'light');
    const root = document.documentElement;
    root.classList.add('light');
    root.classList.remove('dark');
  }, []);

  const toggleTheme = () => {
    // Disabled theme toggling — permanently light theme
    setTheme('light');
  };

  return (
    <ThemeContext.Provider value={{ theme: 'light', setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
