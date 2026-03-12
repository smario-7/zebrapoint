import { Link } from "react-router-dom";
import PublicLayout from "../components/layout/PublicLayout";
import Button from "../components/ui/Button";

export default function LandingPage() {
  return (
    <PublicLayout>
      <div className="flex flex-col items-center justify-center px-4 py-16 min-h-[60vh]">
        <div className="text-center max-w-2xl">
          <div className="text-7xl mb-6">🦓</div>
          <h1 className="text-5xl font-bold text-slate-800 mb-4">
            Zebra<span className="text-zebra-600">Point</span>
          </h1>
          <p className="text-xl text-slate-500 mb-10">
            Nie jesteś sam. Znajdź grupę wsparcia dla opiekunów osób z rzadkimi chorobami.
          </p>
          <div className="flex gap-4 justify-center">
            <Link to="/register">
              <Button size="lg">Dołącz bezpłatnie</Button>
            </Link>
            <Link to="/login">
              <Button variant="secondary" size="lg">
                Zaloguj się
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
