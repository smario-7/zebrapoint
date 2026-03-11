import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import useAuthStore from "../store/authStore";

const schema = z.object({
  display_name: z.string().min(2, "Min. 2 znaki").max(100),
  email:        z.string().email("Nieprawidłowy email"),
  password:     z.string().min(8, "Min. 8 znaków"),
  confirm:      z.string()
}).refine((d) => d.password === d.confirm, {
  message: "Hasła nie są identyczne",
  path: ["confirm"]
});

export default function RegisterPage() {
  const { register: registerUser, isLoading, error } = useAuthStore();
  const navigate = useNavigate();
  const [success, setSuccess] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema)
  });

  const onSubmit = async (data) => {
    const result = await registerUser(data.email, data.password, data.display_name);
    if (result.success) {
      setSuccess(true);
      setTimeout(() => navigate("/login"), 1500);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-slate-800">Konto utworzone!</h2>
          <p className="text-slate-500">Przekierowuję do logowania...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🦓</div>
          <h1 className="text-2xl font-bold text-slate-800">Utwórz konto</h1>
          <p className="text-slate-500 text-sm mt-1">Bezpłatnie i anonimowo</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Pseudonim (widoczny dla innych)
            </label>
            <input
              {...register("display_name")}
              placeholder="np. Mama Zosi"
              className="w-full border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-zebra-500"
            />
            {errors.display_name && (
              <p className="text-red-500 text-xs mt-1">{errors.display_name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              {...register("email")}
              type="email"
              placeholder="twoj@email.com"
              className="w-full border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-zebra-500"
            />
            {errors.email && (
              <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Hasło</label>
            <input
              {...register("password")}
              type="password"
              placeholder="Min. 8 znaków"
              className="w-full border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-zebra-500"
            />
            {errors.password && (
              <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Potwierdź hasło
            </label>
            <input
              {...register("confirm")}
              type="password"
              placeholder="Powtórz hasło"
              className="w-full border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-zebra-500"
            />
            {errors.confirm && (
              <p className="text-red-500 text-xs mt-1">{errors.confirm.message}</p>
            )}
          </div>

          <button
            onClick={handleSubmit(onSubmit)}
            disabled={isLoading}
            className="w-full bg-zebra-600 hover:bg-zebra-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50"
          >
            {isLoading ? "Tworzę konto..." : "Utwórz konto"}
          </button>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          Masz już konto?{" "}
          <Link to="/login" className="text-zebra-600 font-medium hover:underline">
            Zaloguj się
          </Link>
        </p>
      </div>
    </div>
  );
}
