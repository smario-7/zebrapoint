import { create } from "zustand";
import api from "../services/api";

const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  sessionChecked: false,
  isLoading: false,
  error: null,
  registerErrorDetail: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.post("/auth/login", { email, password });
      set({
        user: data.user,
        isAuthenticated: true,
        sessionChecked: true,
        isLoading: false,
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
        display_name: displayName,
      });
      set({ isLoading: false });
      return { success: true };
    } catch (err) {
      const d = err.response?.data?.detail;
      const msg =
        typeof d === "object" && d !== null ? d.message : d || "Błąd rejestracji";
      set({
        error: msg,
        registerErrorDetail: typeof d === "object" && d !== null ? d : null,
        isLoading: false,
      });
      return { success: false, error: msg };
    }
  },

  logout: async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      /* sesja i tak zerowana po stronie klienta */
    }
    set({
      user: null,
      isAuthenticated: false,
      sessionChecked: true,
      error: null,
    });
  },

  fetchMe: async () => {
    try {
      const { data } = await api.get("/auth/me");
      set({ user: data, isAuthenticated: true, sessionChecked: true });
    } catch {
      set({ user: null, isAuthenticated: false, sessionChecked: true });
    }
  },

  clearError: () => set({ error: null, registerErrorDetail: null }),
}));

export default useAuthStore;
