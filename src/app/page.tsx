import Hero from "@/components/landing/Hero";
import Philosophy from "@/components/landing/Philosophy";
import Feature from "@/components/landing/Feature";

export default function NovaLandingPage() {
  return (
    <div className="min-h-screen bg-linear-to-b from-background to-slate-100 text-slate-800">
      {/* Hero Section */}
      <Hero />
      {/* Features Section */}
      <Feature />

      {/* Philosophy Section */}
      <Philosophy />

      {/* Footer */}
      <footer className="py-10 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} Nova Star AI · Designed By Ashkan with love
        ❤️
      </footer>
    </div>
  );
}
