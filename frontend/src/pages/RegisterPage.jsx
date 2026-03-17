import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm, useController } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import useAuthStore from "../store/authStore";
import PublicLayout from "../components/layout/PublicLayout";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import NickInput from "../components/auth/NickInput";

const schema = z
  .object({
    display_name: z
      .string()
      .min(3, "Min. 3 znaki")
      .max(30, "Max. 30 znaków")
      .regex(/^[a-zA-Z0-9_-]+$/, "Dozwolone: litery, cyfry, _ i -"),
    email: z.string().email("Nieprawidłowy email"),
    password: z.string().min(8, "Min. 8 znaków"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Hasła nie są identyczne",
    path: ["confirm"],
  });

export default function RegisterPage() {
  const { register: registerUser, isLoading, error, registerErrorDetail, clearError } = useAuthStore();
  const navigate = useNavigate();
  const [success, setSuccess] = useState(false);

  const { register, control, handleSubmit, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  const { field: displayNameField } = useController({
    name: "display_name",
    control,
  });

  useEffect(() => {
    if (registerErrorDetail) clearError();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- clear only when user changes nick
  }, [displayNameField.value]);

  const onSubmit = async (data) => {
    const result = await registerUser(data.email, data.password, data.display_name);
    if (result.success) {
      setSuccess(true);
      setTimeout(() => navigate("/login"), 1500);
    }
  };

  if (success) {
    return (
      <PublicLayout>
        <div className="flex items-center justify-center px-4 py-16">
          <div className="text-center bg-white rounded-2xl shadow-sm border p-8 w-full max-w-md">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-slate-800">Konto utworzone!</h2>
            <p className="text-slate-500">Przekierowuję do logowania...</p>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="flex items-center justify-center px-4 py-16">
        <div className="bg-white rounded-2xl shadow-sm border p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <img src="/logo_circle.svg" alt="" className="h-16 w-auto mx-auto mb-2" />
            <h1 className="text-2xl font-bold text-slate-800">Utwórz konto</h1>
            <p className="text-slate-500 text-sm mt-1">Bezpłatnie i anonimowo</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">
              <p>{error}</p>
              {registerErrorDetail?.field === "display_name" && registerErrorDetail?.suggestions?.length > 0 && (
                <div className="mt-2">
                  <p className="text-slate-600 text-xs mb-1">Dostępne alternatywy:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {registerErrorDetail.suggestions.map((s, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setValue("display_name", s)}
                        className="text-xs bg-white border border-red-200 hover:bg-red-50 text-red-700 px-2.5 py-1 rounded-full transition"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <NickInput
              value={displayNameField.value}
              onChange={displayNameField.onChange}
              error={errors.display_name?.message}
            />
            <Input
              label="Email"
              type="email"
              placeholder="twoj@email.com"
              error={errors.email?.message}
              {...register("email")}
            />
            <Input
              label="Hasło"
              type="password"
              placeholder="Min. 8 znaków"
              hint="Min. 8 znaków"
              error={errors.password?.message}
              {...register("password")}
            />
            <Input
              label="Potwierdź hasło"
              type="password"
              placeholder="Powtórz hasło"
              error={errors.confirm?.message}
              {...register("confirm")}
            />
            <Button type="submit" fullWidth loading={isLoading}>
              {isLoading ? "Tworzę konto..." : "Utwórz konto"}
            </Button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Masz już konto?{" "}
            <Link to="/login" className="text-zebra-600 font-medium hover:underline">
              Zaloguj się
            </Link>
          </p>
        </div>
      </div>
    </PublicLayout>
  );
}
