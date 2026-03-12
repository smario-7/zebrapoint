import { useState, useEffect } from "react";
import api from "../services/api";

export function useGroupMembers(groupId) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!groupId) return;

    const fetchMembers = async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/groups/${groupId}/members`);
        setMembers(data);
      } catch {
        setError("Nie udało się pobrać listy członków.");
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [groupId]);

  return { members, loading, error };
}
