"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Heart, ArrowRight, X } from "lucide-react";
import { useUser } from "@/hooks/useUser";

/**
 * A small popup that asks the user if they want to connect
 * with their partner. Triggered via sessionStorage flag.
 */
export default function PartnerConnectPopup() {
  const router = useRouter();
  const { user } = useUser();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // If the user already dismissed the popup before, never show again
    if (localStorage.getItem("nova_partner_dismissed")) return;

    // Check sessionStorage flag set by quiz completion or skip
    const shouldShow = sessionStorage.getItem("nova_show_partner_popup");
    if (shouldShow !== "1") return;

    // Check if user already has an active partnership — no need to show
    const checkPartnership = async () => {
      try {
        const res = await fetch("/api/nova-profile");
        if (!res.ok) return;
        const data = await res.json();
        if (data.partnership) {
          // Already connected — mark as dismissed so we never check again
          localStorage.setItem("nova_partner_dismissed", "1");
          sessionStorage.removeItem("nova_show_partner_popup");
          return;
        }
      } catch {
        // silently fail — still show popup
      }

      // Small delay so it doesn't clash with page transition
      const timer = setTimeout(() => {
        setOpen(true);
        sessionStorage.removeItem("nova_show_partner_popup");
      }, 800);
      return () => clearTimeout(timer);
    };

    checkPartnership();
  }, [user]);

  const handleConnect = () => {
    setOpen(false);
    localStorage.setItem("nova_partner_dismissed", "1");
    router.push("/setting/account?section=partnership");
  };

  const handleSkip = () => {
    setOpen(false);
    localStorage.setItem("nova_partner_dismissed", "1");
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-pink-500/10">
            <Heart className="size-6 text-pink-500" />
          </div>
          <DialogTitle className="text-center text-lg">
            Connect with your partner?
          </DialogTitle>
          <DialogDescription className="text-center leading-relaxed">
            Link your partner&apos;s account for shared insights, memories, and
            better relationship support.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 mt-3">
          <Button onClick={handleConnect} className="gap-2" size="lg">
            <Heart className="size-4" />
            Connect Partner
            <ArrowRight className="size-4" />
          </Button>

          <Button
            variant="ghost"
            onClick={handleSkip}
            className="gap-2 text-muted-foreground"
            size="sm"
          >
            <X className="size-4" />
            Maybe later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
