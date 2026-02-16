"use client";

import React from "react";
import { toast } from "sonner";
import type { AdminResponse } from "@/types/admin";

type CreatorAdminContextValue = {
  email: string;
  setEmail: React.Dispatch<React.SetStateAction<string>>;
  isLoading: boolean;
  result: AdminResponse | null;
  lookupByEmail: (emailOverride?: string) => Promise<void>;
};

const CreatorAdminContext =
  React.createContext<CreatorAdminContextValue | null>(null);

const STORAGE_KEY = "creator-admin-last-email";

export function CreatorAdminProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [email, setEmail] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [result, setResult] = React.useState<AdminResponse | null>(null);

  const runLookup = React.useCallback(async (emailToLookup: string) => {
    const trimmed = emailToLookup.trim();

    if (!trimmed) {
      toast.error("Please enter an email address.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        `/api/admin/user-data?email=${encodeURIComponent(trimmed)}`,
      );
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || "Lookup failed");
      }

      setEmail(trimmed);
      setResult(payload as AdminResponse);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, trimmed);
      }
    } catch (error) {
      setResult(null);
      toast.error(error instanceof Error ? error.message : "Lookup failed");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const lookupByEmail = React.useCallback(
    async (emailOverride?: string) => {
      void runLookup(emailOverride ?? email);
    },
    [email, runLookup],
  );

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const storedEmail = window.localStorage.getItem(STORAGE_KEY);
    if (!storedEmail) return;

    setEmail(storedEmail);
    void runLookup(storedEmail);
  }, [runLookup]);

  const value = React.useMemo<CreatorAdminContextValue>(
    () => ({
      email,
      setEmail,
      isLoading,
      result,
      lookupByEmail,
    }),
    [email, isLoading, result, lookupByEmail],
  );

  return (
    <CreatorAdminContext.Provider value={value}>
      {children}
    </CreatorAdminContext.Provider>
  );
}

export function useCreatorAdmin() {
  const context = React.useContext(CreatorAdminContext);
  if (!context) {
    throw new Error("useCreatorAdmin must be used within CreatorAdminProvider");
  }

  return context;
}
