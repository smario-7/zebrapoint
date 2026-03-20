import { useState, useCallback, useRef } from "react";
import api from "../services/api";
import toast from "react-hot-toast";

const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Hook zarządzający stanem widoku zarządzania grupą.
 * Odpowiada za: ładowanie TOP 3, aktualizację opisu, zmianę grupy.
 */
export function useGroupManagement({ onGroupChanged } = {}) {
  const [matches, setMatches] = useState([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [changingGroup, setChangingGroup] = useState(false);
  const [updatingDesc, setUpdatingDesc] = useState(false);
  const matchesCacheRef = useRef(null);
  const cacheTimeRef = useRef(null);

  const loadMatches = useCallback(async () => {
    const now = Date.now();
    if (
      matchesCacheRef.current &&
      cacheTimeRef.current &&
      now - cacheTimeRef.current < CACHE_TTL_MS
    ) {
      setMatches(matchesCacheRef.current);
      return;
    }
    setLoadingMatches(true);
    try {
      const { data } = await api.get("/symptoms/my-matches");
      setMatches(data);
      matchesCacheRef.current = data;
      cacheTimeRef.current = now;
    } catch (err) {
      if (err.response?.status === 404) {
        setMatches([]);
      } else {
        toast.error("Nie udało się pobrać dopasowań");
      }
    } finally {
      setLoadingMatches(false);
    }
  }, []);

  const updateDescription = useCallback(async (newDescription) => {
    setUpdatingDesc(true);
    matchesCacheRef.current = null;
    cacheTimeRef.current = null;
    try {
      const { data } = await api.patch("/symptoms/me", {
        description: newDescription,
      });
      setMatches(data.matches);
      toast.success("Opis zaktualizowany — sprawdź nowe dopasowania");
      return true;
    } catch (err) {
      const msg =
        err.response?.data?.detail || "Błąd aktualizacji opisu";
      toast.error(Array.isArray(msg) ? msg[0]?.msg ?? msg : msg);
      return false;
    } finally {
      setUpdatingDesc(false);
    }
  }, []);

  const changeGroup = useCallback(
    async (match, profileId) => {
      if (changingGroup) return;
      setChangingGroup(true);
      try {
        const { data } = await api.post("/symptoms/choose-group", {
          profile_id: profileId,
          group_id: match.group_id,
          score: match.score_pct / 100,
        });
        toast.success(`Przeniesiono do grupy „${data.group_name}"! 🎉`);
        matchesCacheRef.current = null;
        cacheTimeRef.current = null;
        setMatches([]);
        if (onGroupChanged) {
          await onGroupChanged(data);
        }
        await loadMatches();
      } catch (err) {
        const msg = err.response?.data?.detail || "Błąd zmiany grupy";
        toast.error(Array.isArray(msg) ? msg[0]?.msg ?? msg : msg);
      } finally {
        setChangingGroup(false);
      }
    },
    [changingGroup, onGroupChanged, loadMatches]
  );

  return {
    matches,
    loadingMatches,
    changingGroup,
    updatingDesc,
    loadMatches,
    updateDescription,
    changeGroup,
  };
}
