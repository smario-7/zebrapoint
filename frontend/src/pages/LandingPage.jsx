import HeroSection from "../components/landing/HeroSection";
import HowItWorks from "../components/landing/HowItWorks";
import ForWhom from "../components/landing/ForWhom";
import PrivacySection from "../components/landing/PrivacySection";
import FaqSection from "../components/landing/FaqSection";
import StatsSection from "../components/landing/StatsSection";
import CtaFooter from "../components/landing/CtaFooter";
import LandingNav from "../components/landing/LandingNav";

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-white dark:bg-slate-900">
      <LandingNav />
      <HeroSection />
      <HowItWorks />
      <ForWhom />
      <PrivacySection />
      <FaqSection />
      <StatsSection />
      <CtaFooter />
    </div>
  );
}
