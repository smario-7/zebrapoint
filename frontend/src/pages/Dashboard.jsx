import { useEffect } from "react";
import { Link } from "react-router-dom";
import useAuthStore from "../store/authStore";
import api from "../services/api";
import { useState } from "react";

export default function Dashboard() {
  const { user, logout } = useAuthStore();
  const [group, setGroup] = useState(null);
  const [hasProfile, setHasProfile] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        await api.get("/symptoms/me");
        setHasProfile(true);

        const { data } = await api.get("/groups/me");
        setGroup(data);
      } catch (err) {
        if (err.response?.status === 404) {
          setHasProfile(false);
        }
      } finally {
        setLoading(false);
      }
    };
    checkStatus();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-400">Ładowanie...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b px-6 py-4 flex justify-between items-center">
        <span className="text-xl font-bold text-slate-800">
          🦓 ZebraPoint
        </span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600">
            Cześć, <strong>{user?.display_name}</strong>
          </span>
          <button
            onClick={logout}
            className="text-sm text-slate-500 hover:text-red-500 transition"
          >
            Wyloguj
          </button>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-12">
        {!hasProfile ? (
          <div className="text-center">
            <div className="text-6xl mb-6">📝</div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">
              Witaj w ZebraPoint!
            </h2>
            <p className="text-slate-500 mb-8 max-w-md mx-auto">
              Opisz objawy własnymi słowami. System znajdzie osoby
              z podobnymi doświadczeniami i połączy Was w grupie.
            </p>
            <Link
              to="/symptoms/new"
              className="inline-block bg-zebra-600 hover:bg-zebra-700 text-white font-semibold px-8 py-3 rounded-xl transition"
            >
              Opisz objawy →
            </Link>
          </div>
        ) : (
          <div>
            <h2 className="text-2xl font-bold text-slate-800 mb-6">
              Twoja tablica
            </h2>

            {group && (
              <div className="bg-white rounded-2xl border p-6 mb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-zebra-600 font-semibold uppercase tracking-wide mb-1">
                      Twoja grupa
                    </p>
                    <h3 className="text-lg font-bold text-slate-800">
                      {group.name}
                    </h3>
                    <p className="text-slate-500 text-sm mt-1">
                      {group.member_count}{" "}
                      {group.member_count === 1 ? "osoba" : "osoby/osób"}
                    </p>
                  </div>
                  <Link
                    to={`/groups/${group.id}`}
                    className="bg-zebra-600 hover:bg-zebra-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition"
                  >
                    Wejdź do czatu →
                  </Link>
                </div>
              </div>
            )}

            <Link
              to="/symptoms/new"
              className="text-sm text-slate-400 hover:text-zebra-600 transition"
            >
              ✏️ Zaktualizuj opis objawów
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
