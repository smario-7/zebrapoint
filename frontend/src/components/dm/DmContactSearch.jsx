import { useState, useEffect } from "react";
import Avatar from "../ui/Avatar";
import api from "../../services/api";
import { useTranslation } from "react-i18next";

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 400;

/**
 * Wyszukiwarka użytkowników po nicku (do rozpoczęcia konwersacji DM).
 * Debounce ogranicza liczbę zapytań do API; wyniki w dropdownie.
 */
export default function DmContactSearch({ onSelectUser }) {
  const { t } = useTranslation("app");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (searchQuery.trim().length < MIN_QUERY_LENGTH) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await api.get(
          `/dm/search-users?q=${encodeURIComponent(searchQuery.trim())}`
        );
        setSearchResults(data ?? []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectUser = (user) => {
    onSelectUser?.(user.id);
    setSearchQuery("");
    setSearchResults([]);
  };

  const showDropdown = searchResults.length > 0 || searching;

  return (
    <div className="relative mb-4">
      <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 rounded-2xl px-4 py-2.5">
        <span className="text-slate-400 dark:text-slate-500 text-lg">🔍</span>
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t("dm.search")}
          className="flex-1 bg-transparent text-sm focus:outline-none text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500"
          type="text"
          autoComplete="off"
        />
        {searchQuery && (
          <button
            onClick={() => {
              setSearchQuery("");
              setSearchResults([]);
            }}
            className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
            type="button"
          >
            ×
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg z-10 overflow-hidden">
          {searching ? (
            <div className="px-4 py-3 text-sm text-slate-400 dark:text-slate-500">{t("dm.searching")}</div>
          ) : searchResults.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-400 dark:text-slate-500">
              {t("dm.noUser")}
            </div>
          ) : (
            searchResults.map((user) => (
              <button
                key={user.id}
                onClick={() => handleSelectUser(user)}
                className="w-full flex items-center gap-3 px-4 py-3
                           hover:bg-slate-50 dark:hover:bg-slate-700 transition text-left
                           border-b border-slate-50 dark:border-slate-700 last:border-0"
                type="button"
              >
                <Avatar name={user.display_name} size="sm" className="flex-shrink-0" />

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                    {user.display_name}
                  </p>

                  <div className="flex items-center gap-1.5 mt-0.5">
                    {user.group ? (
                      <>
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: user.group.accent_color }}
                        />
                        <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {user.group.name}
                        </span>
                        {user.is_same_group ? (
                          <span className="text-xs bg-zebra-100 dark:bg-teal-900/40 text-zebra-700 dark:text-teal-300
                                           font-semibold px-1.5 py-0.5 rounded-full
                                           flex-shrink-0 flex items-center gap-0.5">
                            <span>✓</span>
                            <span>{t("dm.yourGroup")}</span>
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0">
                            · {t("dm.otherGroup")}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-xs text-slate-400 dark:text-slate-500">{t("dm.noGroup")}</span>
                    )}
                  </div>
                </div>

                <span className="text-slate-300 dark:text-slate-500 flex-shrink-0 text-sm">✉️</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
