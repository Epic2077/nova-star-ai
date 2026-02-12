import React from "react";
import ChatHeader from "@/components/chat/Header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="bg-chat-background">
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <ChatHeader />
          {children}
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
};

export default Layout;
