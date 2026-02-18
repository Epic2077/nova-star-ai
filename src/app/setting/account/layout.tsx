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

const SettingAccountLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <section className="flex p-20">
      <div className="w-full ">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/setting/account" className="text-lg">
                Account
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbPage className="text-lg">Edit Profile</BreadcrumbPage>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="bg-transparent w-full mt-5 flex">
          <div className="flex flex-col w-full">
            <div className="w-full">
              <h2 className="text-2xl text-foreground font-semibold mb-2">
                Edit Profile
              </h2>
              <p className="text-muted-foreground text-lg">
                Manage your personal information and preferences
              </p>
            </div>
            <Separator />
            <div className="flex flex-col md:flex-row">
              <Aside />
              <div>{children}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SettingAccountLayout;
