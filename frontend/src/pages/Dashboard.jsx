import useAuthStore from "../store/authStore";

export default function Dashboard() {
  const { user, logout } = useAuthStore();

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

      <main className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-6">🦓</div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">
          Witaj w ZebraPoint!
        </h2>
        <p className="text-slate-500 mb-8">
          Następny krok: opisz objawy, żebyśmy mogli dopasować Cię do grupy.
        </p>
        <button
          className="bg-zebra-600 hover:bg-zebra-700 text-white font-semibold px-8 py-3 rounded-xl transition"
          onClick={() => alert("Formularz objawów — Sprint 2!")}
        >
          Opisz objawy →
        </button>
      </main>
    </div>
  );
}
