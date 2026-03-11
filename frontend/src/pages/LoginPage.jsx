import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import useAuthStore from "../store/authStore";

const schema = z.object({
  email:    z.string().email("Nieprawidłowy email"),
  password: z.string().min(1, "Podaj hasło")
});

export default function LoginPage() {
  const { login, isLoading, error } = useAuthStore();
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema)
  });

  const onSubmit = async (data) => {
    const result = await login(data.email, data.password);
    if (result.success) {
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🦓</div>
          <h1 className="text-2xl font-bold text-slate-800">Zaloguj się</h1>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
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
              className="w-full border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-zebra-500"
            />
            {errors.password && (
              <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
            )}
          </div>

          <button
            onClick={handleSubmit(onSubmit)}
            disabled={isLoading}
            className="w-full bg-zebra-600 hover:bg-zebra-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50"
          >
            {isLoading ? "Loguję..." : "Zaloguj się"}
          </button>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          Nie masz konta?{" "}
          <Link to="/register" className="text-zebra-600 font-medium hover:underline">
            Zarejestruj się
          </Link>
        </p>
      </div>
    </div>
  );
}
