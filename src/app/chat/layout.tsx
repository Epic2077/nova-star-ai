import React from "react";
import ChatHeader from "@/components/chat/Header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import "katex/dist/katex.min.css";

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="bg-chat-background">
      <SidebarProvider>
        <ErrorBoundary
          fallback={
            <div className="flex h-full w-64 items-center justify-center text-sm text-muted-foreground">
              Sidebar failed to load.
            </div>
          }
        >
          <AppSidebar />
        </ErrorBoundary>
        <SidebarInset>
          <ChatHeader />
          <ErrorBoundary>{children}</ErrorBoundary>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
};

export default Layout;
