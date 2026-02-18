import type { Metadata } from "next";
import NovaProfileDashboard from "@/components/profile/NovaProfileDashboard";

export const metadata: Metadata = {
  title: "Nova Profile",
};

export default function ProfilePage() {
  return <NovaProfileDashboard />;
}
