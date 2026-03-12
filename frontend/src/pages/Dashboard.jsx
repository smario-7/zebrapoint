import { Link } from "react-router-dom";
import useAuthStore from "../store/authStore";
import AppShell from "../components/layout/AppShell";
import Avatar from "../components/ui/Avatar";
import Button from "../components/ui/Button";
import { SkeletonCard } from "../components/ui/Skeleton";
import ErrorMessage from "../components/ui/ErrorMessage";
import { useProfile } from "../hooks/useProfile";

export default function Dashboard() {
  const { user } = useAuthStore();
  const { group, loading, error, hasProfile, refetch } = useProfile();

  return (
    <AppShell>
      {/* Powitanie */}
      <div className="flex items-center gap-3 mb-8">
        <Avatar name={user?.display_name} size="lg" />
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Cześć, {user?.display_name}! 👋
          </h1>
          <p className="text-slate-400 text-sm">
            {hasProfile
              ? "Jesteś połączony z grupą wsparcia"
              : "Zacznij od opisania objawów"}
          </p>
        </div>
      </div>

      {/* Błąd */}
      {error && (
        <ErrorMessage message={error} onRetry={refetch} />
      )}

      {/* Ładowanie */}
      {loading && (
        <div className="space-y-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {/* Stan: brak profilu */}
      {!loading && !hasProfile && (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center">
          <div className="text-5xl mb-4">📝</div>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">
            Opisz objawy, żeby dołączyć do grupy
          </h2>
          <p className="text-slate-400 text-sm mb-6 max-w-sm mx-auto">
            System znajdzie osoby z podobnymi doświadczeniami
            i połączy Was w prywatnej grupie wsparcia.
          </p>
          <Link to="/symptoms/new">
            <Button size="lg">Opisz objawy →</Button>
          </Link>
        </div>
      )}

      {/* Stan: ma grupę */}
      {!loading && hasProfile && group && (
        <div className="space-y-4">
          {/* Kafelek grupy */}
          <div className="bg-white rounded-2xl border p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-zebra-600 uppercase tracking-widest mb-1">
                  Twoja grupa
                </p>
                <h2 className="text-lg font-bold text-slate-800">
                  {group.name}
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  {group.member_count}{" "}
                  {group.member_count === 1 ? "osoba" : "osób"} · od{" "}
                  {new Date(group.created_at).toLocaleDateString("pl-PL")}
                </p>
              </div>
              <Link to={`/groups/${group.id}`}>
                <Button size="sm">Wejdź do czatu →</Button>
              </Link>
            </div>
          </div>

          {/* Skrót akcji */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              to={`/groups/${group.id}`}
              className="bg-white rounded-xl border p-4 hover:border-zebra-300 hover:shadow-sm transition group"
            >
              <div className="text-2xl mb-2">💬</div>
              <p className="font-medium text-slate-700 group-hover:text-zebra-700 transition">
                Czat grupowy
              </p>
              <p className="text-xs text-slate-400">
                Porozmawiaj z innymi członkami
              </p>
            </Link>

            <Link
              to="/symptoms/new"
              className="bg-white rounded-xl border p-4 hover:border-zebra-300 hover:shadow-sm transition group"
            >
              <div className="text-2xl mb-2">✏️</div>
              <p className="font-medium text-slate-700 group-hover:text-zebra-700 transition">
                Zaktualizuj opis
              </p>
              <p className="text-xs text-slate-400">
                Popraw opis objawów
              </p>
            </Link>
          </div>
        </div>
      )}
    </AppShell>
  );
}
