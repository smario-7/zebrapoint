import { create } from "zustand";

const THEME_KEY = "zp_theme";
const LEGACY_KEY = "zp_landing_theme";

function readStored() {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(THEME_KEY);
    if (v === "light" || v === "dark") return v;
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy === "light" || legacy === "dark") {
      localStorage.setItem(THEME_KEY, legacy);
      return legacy;
    }
    return null;
  } catch {
    return null;
  }
}

function prefersDark() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

const useThemeStore = create((set) => ({
  dark: (() => {
    const stored = readStored();
    if (stored !== null) return stored === "dark";
    return prefersDark();
  })(),

  toggle: () => {
    set((state) => {
      const next = !state.dark;
      try {
        localStorage.setItem(THEME_KEY, next ? "dark" : "light");
      } catch (err) {
        if (err instanceof Error) void err;
      }
      return { dark: next };
    });
  },

  setDark: (value) => {
    set({ dark: !!value });
    try {
      localStorage.setItem(THEME_KEY, value ? "dark" : "light");
    } catch (err) {
      if (err instanceof Error) void err;
    }
  },
}));

export default useThemeStore;
