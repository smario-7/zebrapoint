import { create } from "zustand";

import api from "../services/api";

const CACHE_TTL_MS = 30_000;
const UNREAD_POLL_MS = 30_000;

function isFresh(ts) {
  if (!ts) return false;
  return Date.now() - ts < CACHE_TTL_MS;
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
  _unreadIntervalId: null,

  fetchIfNeeded: async ({ force = false } = {}) => {
    const state = get();

    if (!force && isFresh(state.lastFetchedAt)) return;
    if (state._inFlight) return state._inFlight;

    const p = (async () => {
      set({ loading: true, error: null });
      try {
        // Preferujemy 1 request (bootstrap). Gdy endpoint jeszcze nie istnieje
        // albo mamy starszą wersję backendu, robimy fallback do 3 requestów.
        const { data } = await api.get("/bootstrap/me");
        set({
          user: data.user ?? null,
          symptomsProfile: data.symptoms_profile ?? null,
          myGroup: data.my_group ?? null,
          unreadCount: data.unread_count ?? 0,
          lastFetchedAt: Date.now(),
          loading: false,
        });
      } catch (err) {
        if (err?.response?.status === 404) {
          try {
            const [meRes, profileRes, groupRes, unreadRes] = await Promise.allSettled([
              api.get("/auth/me"),
              api.get("/symptoms/me"),
              api.get("/groups/me"),
              api.get("/dm/conversations/unread-count"),
            ]);

            set({
              user: meRes.status === "fulfilled" ? meRes.value.data : null,
              symptomsProfile:
                profileRes.status === "fulfilled" ? profileRes.value.data : null,
              myGroup: groupRes.status === "fulfilled" ? groupRes.value.data : null,
              unreadCount:
                unreadRes.status === "fulfilled"
                  ? unreadRes.value.data?.unread_count ?? 0
                  : 0,
              lastFetchedAt: Date.now(),
              loading: false,
            });
          } catch {
            set({
              error: "Nie udało się pobrać danych. Odśwież stronę.",
              loading: false,
            });
          }
        } else {
          set({
            error: "Nie udało się pobrać danych. Odśwież stronę.",
            loading: false,
          });
        }
      } finally {
        set({ _inFlight: null });
      }
    })();

    set({ _inFlight: p });
    return p;
  },

  refresh: async () => get().fetchIfNeeded({ force: true }),

  // Polling tylko dla unread badge (może działać stale w tle).
  startUnreadPolling: () => {
    const state = get();
    if (state._unreadIntervalId) return;

    const tick = async () => {
      try {
        const { data } = await api.get("/dm/conversations/unread-count");
        set({ unreadCount: data?.unread_count ?? 0 });
      } catch {
        // cicho — badge ma nie spamować błędami
      }
    };

    tick();
    const id = setInterval(tick, UNREAD_POLL_MS);
    set({ _unreadIntervalId: id });
  },

  stopUnreadPolling: () => {
    const { _unreadIntervalId } = get();
    if (_unreadIntervalId) clearInterval(_unreadIntervalId);
    set({ _unreadIntervalId: null });
  },
}));

export default useBootstrapStore;

