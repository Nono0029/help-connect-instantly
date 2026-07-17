import { useState, useEffect, useCallback, useMemo, createContext, useContext } from "react";

type Theme = "light" | "dark";

const ThemeContext = createContext<{
  theme: Theme;
  toggleTheme: () => void;
}>({ theme: "light", toggleTheme: () => {} });

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem("demande-theme");
    return (saved as Theme) || "light";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("demande-theme", theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    document.documentElement.style.transition = "background-color 0.3s ease, color 0.3s ease";
    setTimeout(() => {
      document.documentElement.style.transition = "";
    }, 300);
    setTheme(t => (t === "light" ? "dark" : "light"));
  }, []);

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
