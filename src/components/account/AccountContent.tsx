"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import ProfileSection from "./ProfileSection";
import AppearanceSection from "./AppearanceSection";
import SecuritySection from "./SecuritySection";
import { Skeleton } from "@/components/ui/skeleton";

function AccountSections() {
  const searchParams = useSearchParams();
  const section = searchParams.get("section") ?? "profile";

  switch (section) {
    case "appearance":
      return <AppearanceSection />;
    case "security":
      return <SecuritySection />;
    case "profile":
    default:
      return <ProfileSection />;
  }
}

export default function AccountContent() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 space-y-6 p-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
          <Skeleton className="mt-6 h-40 w-full" />
        </div>
      }
    >
      <AccountSections />
    </Suspense>
  );
}
