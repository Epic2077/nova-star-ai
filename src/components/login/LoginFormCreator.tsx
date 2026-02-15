"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { BackgroundBeams } from "../ui/background-beams";
import { useTheme } from "next-themes";

export function LoginFormCreator({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();
  const supabase = React.useMemo(() => createSupabaseBrowserClient(), []);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { setTheme } = useTheme();

  React.useEffect(() => {
    setTheme("dark");
  }, [setTheme]);
  const handleAdminLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") || "");
    const password = String(formData.get("password") || "");

    if (!email || !password) {
      toast.error("Email and password are required.");
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message);
      setIsSubmitting(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .single();

    if (profileError) {
      await supabase.auth.signOut();
      toast.error("Could not verify admin access.");
      setIsSubmitting(false);
      return;
    }

    const role = profile?.role;

    if (role !== "admin") {
      await supabase.auth.signOut();
      toast.error("Admin access required.");
      setIsSubmitting(false);
      return;
    }

    router.replace("/creator");
    router.refresh();
    setIsSubmitting(false);
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="z-10">
        <CardHeader>
          <CardTitle>Login to your creator portal</CardTitle>
          <CardDescription>
            Enter your email below to login to your admin account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdminLogin}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                />
              </Field>
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="***********"
                  required
                />
              </Field>
              <Field>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Checking..." : "Login"}
                </Button>

                <FieldDescription className="text-center">
                  Don&apos;t have an account? <a href="#">Sign up</a>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
      <BackgroundBeams />
    </div>
  );
}
