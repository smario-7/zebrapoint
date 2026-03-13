import { Link } from "react-router-dom";
import LogoBrand from "../components/ui/LogoBrand";
import HeroSection from "../components/landing/HeroSection";
import HowItWorks from "../components/landing/HowItWorks";
import ForWhom from "../components/landing/ForWhom";
import PrivacySection from "../components/landing/PrivacySection";
import StatsSection from "../components/landing/StatsSection";
import CtaFooter from "../components/landing/CtaFooter";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            to="/"
            className="group font-bold text-xl text-slate-800 hover:text-zebra-600 transition"
            aria-label="ZebraPoint"
          >
            <LogoBrand className="h-8 w-auto" />
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm font-medium text-slate-600 hover:text-slate-800 transition px-3 py-1.5"
            >
              Zaloguj się
            </Link>
            <Link
              to="/register"
              className="text-sm font-semibold bg-zebra-600 hover:bg-zebra-700 text-white px-4 py-2 rounded-xl transition"
            >
              Dołącz bezpłatnie
            </Link>
          </div>
        </div>
      </nav>

      <HeroSection />
      <HowItWorks />
      <ForWhom />
      <PrivacySection />
      <StatsSection />
      <CtaFooter />
    </div>
  );
}
