import { useState, useCallback } from "react";
import api, { API_V2_AUTH_BASE } from "../services/api";
import toast from "react-hot-toast";
import i18n from "../i18n";
import useBootstrapStore from "../store/bootstrapStore";

/**
 * v2: brak grup — dopasowanie przez soczewki (Celery).
 * Jedyna akcja: aktualizacja opisu objawów przez PATCH /api/v2/auth/me.
 */
export function useGroupManagement({ onGroupChanged } = {}) {
  const [matches] = useState([]);
  const [loadingMatches] = useState(false);
  const [changingGroup] = useState(false);
  const [updatingDesc, setUpdatingDesc] = useState(false);

  const loadMatches = useCallback(async () => {}, []);

  const updateDescription = useCallback(
    async (newDescription) => {
      setUpdatingDesc(true);
      try {
        await api.patch(`${API_V2_AUTH_BASE}/me`, {
          symptom_description: newDescription,
        });
        await useBootstrapStore.getState().refresh();
        toast.success(i18n.t("groupManagementHooks.updateDescSuccess", { ns: "app" }));
        if (onGroupChanged) onGroupChanged();
        return true;
      } catch (err) {
        const msg =
          err.response?.data?.detail ||
          i18n.t("groupManagementHooks.updateDescError", { ns: "app" });
        toast.error(Array.isArray(msg) ? msg[0]?.msg ?? msg : msg);
        return false;
      } finally {
        setUpdatingDesc(false);
      }
    },
    [onGroupChanged]
  );

  const changeGroup = useCallback(async () => {
    toast(
      i18n.t("groupManagementHooks.changeGroupV2Notice", { ns: "app" })
    );
  }, []);

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
