import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../services/api";

export default function GroupPage() {
  const { groupId } = useParams();
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [groupRes, membersRes] = await Promise.all([
          api.get(`/groups/${groupId}`),
          api.get(`/groups/${groupId}/members`)
        ]);
        setGroup(groupRes.data);
        setMembers(membersRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [groupId]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center text-slate-400">
      Ładowanie grupy...
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b px-6 py-4">
        <Link to="/dashboard" className="text-sm text-slate-400 hover:text-slate-600">
          ← Dashboard
        </Link>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-10">
        <div className="text-4xl mb-4">🦓</div>
        <h1 className="text-2xl font-bold text-slate-800 mb-1">
          {group?.name}
        </h1>
        <p className="text-slate-500 mb-8">
          {group?.member_count} {group?.member_count === 1 ? "osoba" : "osób"} w grupie
        </p>

        <div className="bg-white rounded-2xl border p-6 mb-6">
          <h2 className="font-semibold text-slate-700 mb-4">Członkowie grupy</h2>
          <div className="space-y-2">
            {members.map((m) => (
              <div key={m.user_id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-zebra-100 flex items-center justify-center text-zebra-700 font-bold text-sm">
                  {m.display_name[0].toUpperCase()}
                </div>
                <span className="text-slate-700">{m.display_name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
          <p className="text-amber-700 text-sm font-medium">
            💬 Czat grupowy będzie dostępny w następnym etapie
          </p>
        </div>
      </main>
    </div>
  );
}
