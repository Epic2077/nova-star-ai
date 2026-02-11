import { LoginForm } from "@/components/login/LoginForm";
import { HeartIcon } from "lucide-react";
import Link from "next/link";

const page = () => {
  return (
    <section className="relative min-h-screen overflow-hidden flex items-center justify-center bg-background">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(60rem_40rem_at_10%_10%,color-mix(in_oklch,var(--secondary)_65%,transparent),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(50rem_35rem_at_90%_15%,color-mix(in_oklch,var(--accent)_60%,transparent),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(40rem_30rem_at_50%_90%,color-mix(in_oklch,var(--primary)_60%,transparent),transparent_70%)]" />

        <span className="absolute -top-10 -left-8 h-48 w-48 rounded-full bg-chart-4 opacity-35 blur-2xl" />
        <span className="absolute top-24 right-10 h-36 w-36 rounded-full bg-chart-1 opacity-35 blur-2xl" />
        <span className="absolute bottom-16 left-16 h-56 w-56 rounded-full bg-chart-2 opacity-30 blur-3xl" />
        <span className="absolute bottom-10 right-24 h-40 w-40 rounded-full bg-chart-5 opacity-35 blur-2xl" />
      </div>

      <div className="flex w-full max-w-sm flex-col gap-6 z-10">
        <Link
          href="/"
          className="flex items-center gap-2 self-center font-medium"
        >
          <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
            <HeartIcon className="size-4" />
          </div>
          Nova Star
        </Link>
        <LoginForm />
      </div>
    </section>
  );
};

export default page;
