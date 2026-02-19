import type { Metadata } from "next";
import AccountContent from "@/components/account/AccountContent";

export const metadata: Metadata = {
  title: "Account",
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  const { section = "profile" } = await searchParams;
  return <AccountContent section={section} />;
}
