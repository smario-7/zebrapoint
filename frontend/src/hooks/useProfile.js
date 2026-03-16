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
      const [profileRes, groupRes] = await Promise.allSettled([
        api.get("/symptoms/me"),
        api.get("/groups/me"),
      ]);
      if (profileRes.status === "fulfilled") {
        setProfile(profileRes.value.data);
      } else {
        setProfile(null);
      }
      if (groupRes.status === "fulfilled") {
        setGroup(groupRes.value.data);
      } else {
        setGroup(null);
      }
      const profileFailed = profileRes.status === "rejected" && profileRes.reason?.response?.status !== 404;
      const groupFailed = groupRes.status === "rejected" && groupRes.reason?.response?.status !== 404;
      if (profileFailed || groupFailed) {
        setError("Nie udało się pobrać danych. Odśwież stronę.");
      }
    } catch {
      setError("Nie udało się pobrać danych. Odśwież stronę.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return { profile, group, loading, error, hasProfile, refetch: fetchProfile };
}
