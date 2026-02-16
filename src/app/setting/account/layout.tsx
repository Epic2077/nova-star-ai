import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Meteors } from "@/components/ui/meteors";

const layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <section className="flex p-20">
      <div className="w-full ">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/account" className="text-lg">
                Account
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbPage className="text-lg">Edit Profile</BreadcrumbPage>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="bg-transparent w-full mt-5 flex">
          <div className="flex flex-col w-full">
            <div className="flex items-center justify-between">
              <div className="w-full">
                <h2 className="text-2xl text-foreground font-semibold mb-2">
                  Edit Profile
                </h2>
                <p className="text-muted-foreground text-lg">
                  Manage your personal information and preferences
                </p>
              </div>
              <Input
                type="search"
                placeholder="Search..."
                className="w-100 mr-4"
              />
              <Button type="submit" variant="default">
                Search
              </Button>
            </div>
            <div className="flex flex-col gap-5">
              <Button variant="default"></Button>
            </div>
          </div>
        </div>
      </div>
      <Meteors number={20} />
    </section>
  );
};

export default layout;
