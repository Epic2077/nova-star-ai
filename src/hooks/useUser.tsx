"use client";

import * as React from "react";
import type { Session, User } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type UserContextValue = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
};

const UserContext = React.createContext<UserContextValue | undefined>(
  undefined,
);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const supabase = React.useMemo(() => createSupabaseBrowserClient(), []);
  const [user, setUser] = React.useState<User | null>(null);
  const [session, setSession] = React.useState<Session | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!isMounted) return;
        if (error) {
          console.error("Failed to load session:", error.message);
        }
        setSession(data.session ?? null);
        setUser(data.session?.user ?? null);
      } catch (err) {
        if (!isMounted) return;
        console.error("Supabase unreachable:", err);
        setSession(null);
        setUser(null);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void loadSession();

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
      },
    );

    return () => {
      isMounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [supabase]);

  const signOut = React.useCallback(async () => {
    await supabase.auth.signOut();
  }, [supabase]);

  return (
    <UserContext.Provider value={{ user, session, isLoading, signOut }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = React.useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
