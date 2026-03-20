import { useEffect, useMemo } from "react";

import useBootstrapStore from "../store/bootstrapStore";

export function useProfile() {
  const profile = useBootstrapStore((s) => s.symptomsProfile);
  const group = useBootstrapStore((s) => s.myGroup);
  const loading = useBootstrapStore((s) => s.loading);
  const error = useBootstrapStore((s) => s.error);
  const fetchIfNeeded = useBootstrapStore((s) => s.fetchIfNeeded);
  const refresh = useBootstrapStore((s) => s.refresh);

  const hasProfile = useMemo(() => profile !== null, [profile]);

  useEffect(() => {
    fetchIfNeeded();
  }, [fetchIfNeeded]);

  return { profile, group, loading, error, hasProfile, refetch: refresh };
}
