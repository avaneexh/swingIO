// src/context/ThemeContext.jsx
import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  // 🌓 Get initial value from localStorage (optional)
  const [dark, setDark] = useState(() => {
    return localStorage.getItem("theme") === "dark";
  });

  // 🔁 Toggle between dark/light
  const toggle = () => setDark((prev) => !prev);

  // 🧠 Apply the theme to <html> when dark changes
  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [dark]);

  return (
    <ThemeContext.Provider value={{ dark, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
};

// 🪄 Custom hook to use theme anywhere
export const useTheme = () => useContext(ThemeContext);
