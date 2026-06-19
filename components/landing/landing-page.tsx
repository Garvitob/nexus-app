import LandingNav from "./landing-nav";
import LandingHero from "./landing-hero";
import LandingFeatures from "./landing-features";
import LandingHowItWorks from "./landing-how-it-works";
import LandingIntegrations from "./landing-integrations";
import LandingCTA from "./landing-cta";
import LandingFooter from "./landing-footer";

export default function LandingPage() {
  return (
    <div style={{ background: "var(--bg)", color: "var(--text)", minHeight: "100vh" }}>
      <LandingNav />
      <main>
        <LandingHero />
        <LandingFeatures />
        <LandingHowItWorks />
        <LandingIntegrations />
        <LandingCTA />
      </main>
      <LandingFooter />
    </div>
  );
}