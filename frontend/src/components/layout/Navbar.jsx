import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import useAuthStore from "../../store/authStore";
import api from "../../services/api";
import Avatar from "../ui/Avatar";
import LogoBrand from "../ui/LogoBrand";

function UnreadBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const fetchCount = () => {
      api
        .get("/dm/conversations/unread-count")
        .then((r) => setCount(r.data.unread_count ?? 0))
        .catch(() => {});
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, []);

  if (count === 0) return null;

  return (
    <span
      className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center"
      aria-label={`${count} nieprzeczytanych wiadomości`}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}

const NAV_LINKS = [
  { to: "/dashboard", label: "Tablica" },
  { to: "/profile", label: "Profil" },
];

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const links =
    user?.role === "admin"
      ? [...NAV_LINKS, { to: "/admin", label: "Panel admin" }]
      : NAV_LINKS;

  const handleLogout = () => {
    logout();
    toast.success("Wylogowano pomyślnie");
    navigate("/login");
  };

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link
          to="/dashboard"
          className="group flex items-center gap-2 font-bold text-xl text-slate-800 hover:text-zebra-600 transition"
          aria-label="ZebraPoint"
        >
          <LogoBrand className="h-8 w-auto" />
        </Link>

        <div className="hidden sm:flex items-center gap-1">
          {links.map((link) => {
            const isActive =
              link.to === "/admin"
                ? location.pathname.startsWith("/admin")
                : location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? "bg-zebra-50 text-zebra-700"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/messages"
            className={`relative p-2 rounded-xl transition ${
              location.pathname.startsWith("/messages")
                ? "bg-zebra-50 text-zebra-700"
                : "text-slate-600 hover:bg-slate-100"
            }`}
            title="Wiadomości"
            aria-label="Wiadomości"
          >
            💬
            <UnreadBadge />
          </Link>
          <Link to="/profile" className="flex items-center gap-2 group">
            <Avatar name={user?.display_name} size="sm" />
            <span className="hidden sm:block text-sm text-slate-600 group-hover:text-slate-800 transition">
              {user?.display_name}
            </span>
          </Link>
          <button
            onClick={handleLogout}
            className="text-sm text-slate-400 hover:text-red-500 transition px-2 py-1 rounded-lg"
          >
            Wyloguj
          </button>
        </div>
      </div>
    </nav>
  );
}
