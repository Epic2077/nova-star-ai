"use client";

import { useState } from "react";
import { useUser } from "@/hooks/useUser";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SecuritySection() {
  const { user, signOut } = useUser();
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const handlePasswordChange = async () => {
    if (!newPassword) {
      toast.error("Please enter a new password");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password updated successfully");
    } catch {
      toast.error("Failed to update password");
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      router.push("/login");
    } catch {
      toast.error("Failed to sign out");
      setSigningOut(false);
    }
  };

  return (
    <div className="flex-1 space-y-8 p-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-foreground">Security</h3>
        <p className="text-sm text-muted-foreground">
          Manage your password and account access
        </p>
      </div>

      <Separator />

      {/* Password */}
      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
          <CardDescription>
            Update the password you use to sign in
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 max-w-sm">
            <Label htmlFor="email-display">Email</Label>
            <Input
              id="email-display"
              value={user?.email ?? ""}
              disabled
              className="opacity-60"
            />
          </div>

          <div className="grid gap-2 max-w-sm">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <div className="grid gap-2 max-w-sm">
            <Label htmlFor="confirm-password">Confirm new password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <Button
            onClick={handlePasswordChange}
            disabled={saving || !newPassword}
          >
            {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
            Update password
          </Button>
        </CardContent>
      </Card>

      <Separator />

      {/* Sign out */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive">Sign out</CardTitle>
          <CardDescription>
            End your current session on this device
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={handleSignOut}
            disabled={signingOut}
          >
            {signingOut ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <LogOut className="mr-2 size-4" />
            )}
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
