"use client";

import ProfileSection from "./ProfileSection";
import AppearanceSection from "./AppearanceSection";
import SecuritySection from "./SecuritySection";
import UsageSection from "./UsageSection";
import PartnershipSection from "./PartnershipSection";

export default function AccountContent({ section }: { section: string }) {
  switch (section) {
    case "appearance":
      return <AppearanceSection />;
    case "partnership":
      return <PartnershipSection />;
    case "security":
      return <SecuritySection />;
    case "usage":
      return <UsageSection />;
    case "profile":
    default:
      return <ProfileSection />;
  }
}
