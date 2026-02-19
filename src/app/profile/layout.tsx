import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      {/* Breadcrumb */}
      <Link href="/chat" className="flex gap-4 items-center text-lg mb-5">
        <ChevronLeft />
        Back
      </Link>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/chat" className="text-base">
              Chat
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="text-base">Nova Profile</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Page heading */}
      <div className="mt-4 mb-6">
        <h2 className="text-2xl font-semibold text-foreground">Nova Profile</h2>
        <p className="text-muted-foreground">
          See what Nova knows about you, your partner, and your relationship
        </p>
      </div>

      <Separator />

      <main className="mt-6">{children}</main>
    </section>
  );
}
