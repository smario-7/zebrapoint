import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import useAuthStore from "../store/authStore";
import AppShell from "../components/layout/AppShell";
import Avatar from "../components/ui/Avatar";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import NickInput from "../components/auth/NickInput";
import api from "../services/api";
import { useProfile } from "../hooks/useProfile";
import { SkeletonCard } from "../components/ui/Skeleton";

const nameSchema = z.object({
  display_name: z
    .string()
    .min(3, "Min. 3 znaki")
    .max(30, "Max. 30 znaków")
    .regex(/^[a-zA-Z0-9_-]+$/, "Dozwolone: litery, cyfry, _ i -")
    .transform((v) => v.trim()),
});

const passwordSchema = z
  .object({
    current_password: z.string().min(1, "Podaj aktualne hasło"),
    new_password: z.string().min(8, "Min. 8 znaków"),
    confirm_password: z.string(),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    message: "Hasła nie są identyczne",
    path: ["confirm_password"],
  });

export default function ProfilePage() {
  const { user, fetchMe } = useAuthStore();
  const { group, loading } = useProfile();
  const [editingName, setEditingName] = useState(false);
  const [editingPassword, setEditingPassword] = useState(false);
  const [nickValue, setNickValue] = useState(user?.display_name ?? "");
  const [nickStatus, setNickStatus] = useState(null);
  const [nameSaving, setNameSaving] = useState(false);

  useEffect(() => {
    if (editingName) {
      setNickValue(user?.display_name ?? "");
      setNickStatus(null);
    }
  }, [editingName, user?.display_name]);

  const nameSchemaParsed = nameSchema.safeParse({ display_name: nickValue.trim() });
  const nameValid = nameSchemaParsed.success;
  const nameError = nameSchemaParsed.success ? null : nameSchemaParsed.error?.errors?.[0]?.message ?? null;
  const canSaveName =
    nameValid &&
    (nickStatus === "available" ||
      (nickStatus === null &&
        user?.display_name &&
        nickValue.trim().toLowerCase() === user.display_name.toLowerCase()));
  const nameSubmitDisabled = !canSaveName || nameSaving;

  const {
    register: regPwd,
    handleSubmit: submitPwd,
    reset: resetPwd,
    formState: { errors: pwdErrors, isSubmitting: pwdSaving },
  } = useForm({ resolver: zodResolver(passwordSchema) });

  const onSaveName = async (e) => {
    e.preventDefault();
    const parsed = nameSchema.safeParse({ display_name: nickValue.trim() });
    if (!parsed.success) return;
    setNameSaving(true);
    try {
      await api.patch("/auth/me", { display_name: parsed.data.display_name });
      await fetchMe();
      setEditingName(false);
      setNickValue(user?.display_name ?? "");
      setNickStatus(null);
      toast.success("Nazwa zaktualizowana!");
    } catch (err) {
      const detail = err.response?.data?.detail;
      const msg =
        typeof detail === "object" && detail?.message
          ? detail.message
          : detail || "Nie udało się zapisać nazwy.";
      toast.error(msg);
    } finally {
      setNameSaving(false);
    }
  };

  const onChangePassword = async (data) => {
    try {
      await api.patch("/auth/me/password", {
        current_password: data.current_password,
        new_password: data.new_password,
      });
      resetPwd();
      setEditingPassword(false);
      toast.success("Hasło zostało zmienione!");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Nie udało się zmienić hasła.");
    }
  };

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-800 mb-8">Twój profil</h1>

        <section className="bg-white rounded-2xl border p-6 mb-4">
          <div className="flex items-center gap-4 mb-6">
            <Avatar name={user?.display_name} size="lg" />
            <div>
              <p className="font-semibold text-slate-800 text-lg">
                {user?.display_name}
              </p>
              <p className="text-sm text-slate-400">{user?.email}</p>
              <p className="text-xs text-slate-300 mt-0.5">
                Konto od:{" "}
                {user?.created_at
                  ? new Date(user.created_at).toLocaleDateString("pl-PL")
                  : "—"}
              </p>
            </div>
          </div>

          {editingName ? (
            <form onSubmit={onSaveName} className="space-y-3">
              <NickInput
                label="Nowa nazwa (pseudonim)"
                value={nickValue}
                onChange={setNickValue}
                currentNick={user?.display_name}
                onStatusChange={setNickStatus}
                error={nameError}
              />
              <div className="flex gap-2">
                <Button
                  type="submit"
                  size="sm"
                  disabled={nameSubmitDisabled}
                  loading={nameSaving}
                >
                  Zapisz
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  type="button"
                  onClick={() => {
                    setEditingName(false);
                    setNickValue(user?.display_name ?? "");
                    setNickStatus(null);
                  }}
                >
                  Anuluj
                </Button>
              </div>
            </form>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setEditingName(true)}
            >
              ✏️ Zmień nazwę
            </Button>
          )}
        </section>

        <section className="bg-white rounded-2xl border p-6 mb-4">
          <h2 className="font-semibold text-slate-700 mb-4">Twoja grupa</h2>
          {loading ? (
            <SkeletonCard />
          ) : group ? (
            <div>
              <p className="text-slate-800 font-medium">{group.name}</p>
              <p className="text-sm text-slate-400 mt-1">
                {group.member_count}{" "}
                {group.member_count === 1 ? "osoba" : "osób"} w grupie
              </p>
              <Link
                to={`/groups/${group.id}`}
                className="inline-block mt-3 text-sm text-zebra-600 font-medium hover:underline"
              >
                Przejdź do czatu grupy →
              </Link>
            </div>
          ) : (
            <div>
              <p className="text-slate-400 text-sm mb-3">
                Nie należysz jeszcze do żadnej grupy.
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => (window.location.href = "/symptoms/new")}
              >
                Opisz objawy, żeby dołączyć
              </Button>
            </div>
          )}
        </section>

        <section className="bg-white rounded-2xl border p-6 mb-4">
          <h2 className="font-semibold text-slate-700 mb-4">Bezpieczeństwo</h2>

          {editingPassword ? (
            <form onSubmit={submitPwd(onChangePassword)} className="space-y-3">
              <Input
                label="Aktualne hasło"
                type="password"
                error={pwdErrors.current_password?.message}
                {...regPwd("current_password")}
              />
              <Input
                label="Nowe hasło"
                type="password"
                hint="Min. 8 znaków"
                error={pwdErrors.new_password?.message}
                {...regPwd("new_password")}
              />
              <Input
                label="Powtórz nowe hasło"
                type="password"
                error={pwdErrors.confirm_password?.message}
                {...regPwd("confirm_password")}
              />
              <div className="flex gap-2">
                <Button type="submit" size="sm" loading={pwdSaving}>
                  Zmień hasło
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setEditingPassword(false);
                    resetPwd();
                  }}
                >
                  Anuluj
                </Button>
              </div>
            </form>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setEditingPassword(true)}
            >
              🔒 Zmień hasło
            </Button>
          )}
        </section>

        <section className="bg-white rounded-2xl border border-red-100 p-6">
          <h2 className="font-semibold text-slate-700 mb-2">Strefa niebezpieczna</h2>
          <p className="text-sm text-slate-400 mb-4">
            Usunięcie konta jest nieodwracalne. Wszystkie Twoje dane zostaną
            usunięte.
          </p>
          <Button
            variant="danger"
            size="sm"
            onClick={() =>
              toast.error("Funkcja usunięcia konta będzie dostępna wkrótce.")
            }
          >
            Usuń konto
          </Button>
        </section>
      </div>
    </AppShell>
  );
}
