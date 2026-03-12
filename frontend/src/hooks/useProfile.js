import { useState, useEffect, useCallback } from "react";
import api from "../services/api";

export function useProfile() {
  const [profile, setProfile] = useState(null);
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const hasProfile = profile !== null;

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: profileData } = await api.get("/symptoms/me");
      setProfile(profileData);

      const { data: groupData } = await api.get("/groups/me");
      setGroup(groupData);
    } catch (err) {
      if (err.response?.status === 404) {
        setProfile(null);
        setGroup(null);
      } else {
        setError("Nie udało się pobrać danych. Odśwież stronę.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return { profile, group, loading, error, hasProfile, refetch: fetchProfile };
}
