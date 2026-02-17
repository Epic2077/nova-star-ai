import type { Metadata } from "next";
import CreatorLayoutClient from "./CreatorLayoutClient";

export const metadata: Metadata = {
  title: "Creator Admin Portal — Nova Star AI",
  description: "Admin portal for managing users and chats.",
};

export default function CreatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CreatorLayoutClient>{children}</CreatorLayoutClient>;
}
