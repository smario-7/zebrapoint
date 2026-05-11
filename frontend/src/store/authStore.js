import { create } from "zustand";
import api, { API_V2_AUTH_BASE } from "../services/api";

function normalizeUser(user) {
  if (!user) return null;
  return {
    ...user,
    display_name: user.display_name ?? user.username ?? "",
  };
}

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
      const { data } = await api.post(`${API_V2_AUTH_BASE}/login`, { email, password });
      set({
        user: normalizeUser(data.user),
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
      await api.post(`${API_V2_AUTH_BASE}/register`, {
        email,
        password,
        username: displayName,
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
      await api.post(`${API_V2_AUTH_BASE}/logout`);
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
      const { data } = await api.get(`${API_V2_AUTH_BASE}/me`);
      set({
        user: normalizeUser(data),
        isAuthenticated: true,
        sessionChecked: true,
      });
    } catch {
      set({ user: null, isAuthenticated: false, sessionChecked: true });
    }
  },

  clearError: () => set({ error: null, registerErrorDetail: null }),
}));

export default useAuthStore;
