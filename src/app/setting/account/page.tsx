import type { Metadata } from "next";
import AccountContent from "@/components/account/AccountContent";

export const metadata: Metadata = {
  title: "Account",
};

export default function AccountPage() {
  return <AccountContent />;
}
