import React, { createContext, useContext, useState, useEffect } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { light, dark } from "./colors";

const ThemeContext = createContext(null);
const THEME_KEY = "theme_preference_v1"; // "system" | "light" | "dark"

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState("system");

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_KEY);
        if (stored === "light" || stored === "dark" || stored === "system") {
          setThemeMode(stored);
        }
      } catch (e) {
        console.warn("Ошибка чтения темы", e);
      }
    })();
  }, []);

  const effectiveScheme =
    themeMode === "system" ? systemScheme || "light" : themeMode;
  const isDark = effectiveScheme === "dark";
  const colors = isDark ? dark : light;

  const updateThemeMode = async (mode) => {
    setThemeMode(mode);
    try {
      await AsyncStorage.setItem(THEME_KEY, mode);
    } catch (e) {
      console.warn("Ошибка сохранения темы", e);
    }
  };

  return (
    <ThemeContext.Provider
      value={{ colors, isDark, themeMode, setThemeMode: updateThemeMode }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
