import Aside from "@/components/account/Aside";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";

export default function SettingAccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/" className="text-base">
              Home
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/setting/account" className="text-base">
              Settings
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbPage className="text-base">Account</BreadcrumbPage>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Page heading */}
      <div className="mt-4 mb-6">
        <h2 className="text-2xl font-semibold text-foreground">Account</h2>
        <p className="text-muted-foreground">
          Manage your profile, appearance, and security
        </p>
      </div>

      <Separator />

      {/* Sidebar + content */}
      <div className="mt-6 flex flex-col gap-6 md:flex-row">
        <Aside />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </section>
  );
}
