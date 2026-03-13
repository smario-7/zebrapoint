import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import useAuthStore from "../store/authStore";
import PublicLayout from "../components/layout/PublicLayout";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";

const schema = z.object({
  email: z.string().email("Nieprawidłowy email"),
  password: z.string().min(1, "Podaj hasło"),
});

export default function LoginPage() {
  const { login, isLoading, error } = useAuthStore();
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    const result = await login(data.email, data.password);
    if (result.success) {
      navigate("/dashboard");
    }
  };

  return (
    <PublicLayout>
      <div className="flex items-center justify-center px-4 py-16">
        <div className="bg-white rounded-2xl shadow-sm border p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <img src="/logo_circle.svg" alt="" className="h-16 w-auto mx-auto mb-2" />
            <h1 className="text-2xl font-bold text-slate-800">Zaloguj się</h1>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
              error={errors.password?.message}
              {...register("password")}
            />
            <Button type="submit" fullWidth loading={isLoading}>
              {isLoading ? "Loguję..." : "Zaloguj się"}
            </Button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Nie masz konta?{" "}
            <Link to="/register" className="text-zebra-600 font-medium hover:underline">
              Zarejestruj się
            </Link>
          </p>
        </div>
      </div>
    </PublicLayout>
  );
}
