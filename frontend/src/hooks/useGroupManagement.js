import { useState, useCallback } from "react";
import api, { API_V2_AUTH_BASE } from "../services/api";
import toast from "react-hot-toast";
import i18n from "../i18n";
import useBootstrapStore from "../store/bootstrapStore";
import useAuthStore from "../store/authStore";

/**
 * v2: brak grup — dopasowanie przez soczewki (Celery).
 * Aktualizacja opisu objawów: PATCH /api/v2/auth/me/health-profile (pełny snapshot profilu).
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
        await useBootstrapStore.getState().fetchIfNeeded({ force: true });
        const u = useBootstrapStore.getState().user;
        if (!u) {
          toast.error(i18n.t("groupManagementHooks.updateDescError", { ns: "app" }));
          return false;
        }
        const payload = {
          symptom_description: (newDescription || "").trim() || null,
          hpo_ids: (u.hpo_profile || []).map((x) => x.hpo_id),
          diagnosis_confirmed: !!u.diagnosis_confirmed,
          orpha_id: u.diagnosis_confirmed ? u.orpha_id : null,
          consent_searchable_info: !!u.consent_searchable_info,
          searchable: !!u.searchable,
          location_city: u.location_city ?? null,
          location_country: u.location_country || "PL",
        };
        await api.patch(`${API_V2_AUTH_BASE}/me/health-profile`, payload);
        await useAuthStore.getState().fetchMe();
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
