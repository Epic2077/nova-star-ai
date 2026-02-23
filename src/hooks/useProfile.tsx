"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import React from "react";

type profileContextType = {
  role: string | null;
  isloading: boolean;
};

const profileContext = React.createContext<profileContextType | undefined>(
  undefined,
);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const supabase = React.useMemo(() => createSupabaseBrowserClient(), []);
  const [role, setRole] = React.useState<string | null>(null);
  const [isloading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let isMounted = true;

    const loadingProfile = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          if (isMounted) setRole(null);
          return;
        }

        const { data, error } = await supabase
          .from("user_profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();
        if (error) {
          // RLS may block access or row may not exist yet — treat as no role
          console.warn("useProfile: could not load role —", error.message);
          if (isMounted) setRole(null);
          return;
        }
        if (isMounted) {
          setRole(data?.role ?? null);
        }
      } catch (error) {
        console.error("Error loading profile:", error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadingProfile();

    return () => {
      isMounted = false;
    };
  }, [supabase]);

  return (
    <profileContext.Provider value={{ role, isloading }}>
      {children}
    </profileContext.Provider>
  );
}

export function useProfile() {
  const context = React.useContext(profileContext);
  if (context === undefined) {
    throw new Error("useProfile must be used within a ProfileProvider");
  }
  return context;
}
