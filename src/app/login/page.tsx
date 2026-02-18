import { LoginForm } from "@/components/login/LoginForm";
import { HeartIcon } from "lucide-react";
import Link from "next/link";
import Bubblebg from "@/components/login/Bubblebg";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login",
};

export default function LoginPage() {
  return (
    <section className="relative min-h-screen overflow-hidden flex items-center justify-center bg-background">
      <Bubblebg />
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
}
