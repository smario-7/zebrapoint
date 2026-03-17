import { create } from "zustand";
import api from "../services/api";

const TOKEN_KEY = "zp_token";

const useAuthStore = create((set, get) => ({
  user:                null,
  token:               localStorage.getItem(TOKEN_KEY),
  isAuthenticated:     !!localStorage.getItem(TOKEN_KEY),
  isLoading:           false,
  error:               null,
  registerErrorDetail: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.post("/auth/login", { email, password });
      localStorage.setItem(TOKEN_KEY, data.access_token);
      set({
        user:            data.user,
        token:           data.access_token,
        isAuthenticated: true,
        isLoading:       false
      });
      return { success: true };
    } catch (error) {
      const msg = error.response?.data?.detail || "Błąd logowania";
      set({ error: msg, isLoading: false });
      return { success: false, error: msg };
    }
  },

  register: async (email, password, displayName) => {
    set({ isLoading: true, error: null, registerErrorDetail: null });
    try {
      await api.post("/auth/register", {
        email,
        password,
        display_name: displayName
      });
      set({ isLoading: false });
      return { success: true };
    } catch (err) {
      const d = err.response?.data?.detail;
      const msg = typeof d === "object" && d !== null ? d.message : (d || "Błąd rejestracji");
      set({
        error: msg,
        registerErrorDetail: typeof d === "object" && d !== null ? d : null,
        isLoading: false
      });
      return { success: false, error: msg };
    }
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    set({ user: null, token: null, isAuthenticated: false, error: null });
  },

  fetchMe: async () => {
    try {
      const { data } = await api.get("/auth/me");
      set({ user: data, isAuthenticated: true });
    } catch {
      get().logout();
    }
  },

  clearError: () => set({ error: null, registerErrorDetail: null })
}));

export default useAuthStore;
