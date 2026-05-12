import { create } from "zustand";

import api, { API_V2_AUTH_BASE } from "../services/api";

const CACHE_TTL_MS = 30_000;

function isFresh(ts) {
  if (!ts) return false;
  return Date.now() - ts < CACHE_TTL_MS;
}

/**
 * Profil objawów w kształcie zbliżonym do v1 — hooki (np. useProfile) nie muszą znać v2.
 */
function deriveSymptomsProfile(user) {
  if (!user?.symptom_description) return null;
  return {
    description: user.symptom_description,
    id: null,
    group_id: null,
    match_score: null,
    created_at: user.updated_at ?? null,
  };
}

const useBootstrapStore = create((set, get) => ({
  user: null,
  symptomsProfile: null,
  myGroup: null,
  unreadCount: 0,

  loading: false,
  error: null,
  lastFetchedAt: 0,

  _inFlight: null,

  fetchIfNeeded: async ({ force = false } = {}) => {
    const state = get();

    if (!force && isFresh(state.lastFetchedAt)) return;
    if (state._inFlight) return state._inFlight;

    const p = (async () => {
      set({ loading: true, error: null });
      try {
        const { data: user } = await api.get(`${API_V2_AUTH_BASE}/me`);
        set({
          user: user ?? null,
          symptomsProfile: deriveSymptomsProfile(user),
          myGroup: null,
          unreadCount: 0,
          lastFetchedAt: Date.now(),
          loading: false,
        });
      } catch {
        set({
          error: "Nie udało się pobrać danych. Odśwież stronę.",
          loading: false,
        });
      } finally {
        set({ _inFlight: null });
      }
    })();

    set({ _inFlight: p });
    return p;
  },

  refresh: async () => get().fetchIfNeeded({ force: true }),

  startUnreadPolling: () => {},
  stopUnreadPolling: () => {},
}));

export default useBootstrapStore;
