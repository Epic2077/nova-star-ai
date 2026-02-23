import Hero from "@/components/landing/Hero";
import Philosophy from "@/components/landing/Philosophy";
import Feature from "@/components/landing/Feature";
import DailyQuote from "@/components/landing/DailyQuote";
import Capabilities from "@/components/landing/Capabilities";
import CTA from "@/components/landing/CTA";

export default function NovaLandingPage() {
  return (
    <div className="min-h-screen bg-linear-to-b from-background dark:from-background to-slate-100 dark:to-muted text-slate-800 dark:text-foreground">
      {/* Hero Section */}
      <Hero />
      {/* Daily Quote */}
      <DailyQuote />
      {/* Features Section */}
      <Feature />
      {/* Capabilities */}
      <Capabilities />
      {/* Philosophy Section */}
      <Philosophy />
      {/* Call to Action */}
      <CTA />

      {/* Footer */}
      <footer className="border-t py-10 text-center text-sm text-muted-foreground">
        <p>
          © {new Date().getFullYear()} Nova Star AI · Designed by Ashkan with
          love ❤️
        </p>
      </footer>
    </div>
  );
}
