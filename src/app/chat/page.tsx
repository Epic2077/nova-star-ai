import { AppSidebar } from "@/components/app-sidebar";
import ChatBody from "@/components/chat/Body";
import ChatHeader from "@/components/chat/Header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function Page() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <ChatHeader />
        {/* Chat content goes here */}
        <ChatBody />
      </SidebarInset>
    </SidebarProvider>
  );
}
