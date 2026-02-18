"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@/hooks/useUser";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Camera, Loader2 } from "lucide-react";

export default function ProfileSection() {
  const { user, isLoading: userLoading } = useUser();
  const supabase = createSupabaseBrowserClient();

  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("full_name, bio, avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    setFullName(data?.full_name ?? user.user_metadata?.full_name ?? "");
    setBio(data?.bio ?? "");
    setAvatarUrl(data?.avatar_url ?? user.user_metadata?.avatar ?? "");
    setLoaded(true);
  }, [user, supabase]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const initials = fullName
    ? fullName
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : (user?.email?.[0]?.toUpperCase() ?? "?");

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(path);

      setAvatarUrl(publicUrl);

      await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      toast.success("Avatar updated");
    } catch {
      toast.error("Failed to upload avatar");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        full_name: fullName,
        bio,
        avatar_url: avatarUrl,
      });

      if (error) throw error;

      await supabase.auth.updateUser({
        data: { full_name: fullName },
      });

      toast.success("Profile saved");
    } catch {
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  if (userLoading || !loaded) {
    return (
      <div className="flex flex-1 items-center justify-center p-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-8 p-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-foreground">Profile</h3>
        <p className="text-sm text-muted-foreground">
          How others see you on the platform
        </p>
      </div>

      <Separator />

      {/* Avatar */}
      <div className="flex items-center gap-6">
        <div className="relative group">
          <Avatar className="size-20">
            <AvatarImage src={avatarUrl} alt={fullName} />
            <AvatarFallback className="text-lg">{initials}</AvatarFallback>
          </Avatar>
          <label
            htmlFor="avatar-upload"
            className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100"
          >
            {uploading ? (
              <Loader2 className="size-5 animate-spin text-white" />
            ) : (
              <Camera className="size-5 text-white" />
            )}
          </label>
          <input
            id="avatar-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarUpload}
            disabled={uploading}
          />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Profile photo</p>
          <p className="text-xs text-muted-foreground">
            Click to upload. Recommended 256×256px.
          </p>
        </div>
      </div>

      <Separator />

      {/* Form fields */}
      <div className="grid gap-6 max-w-lg">
        <div className="grid gap-2">
          <Label htmlFor="fullName">Full name</Label>
          <Input
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your full name"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            value={user?.email ?? ""}
            disabled
            className="opacity-60"
          />
          <p className="text-xs text-muted-foreground">
            Email cannot be changed here
          </p>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell us a bit about yourself…"
            rows={3}
          />
        </div>
      </div>

      <div className="flex justify-start pt-2">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
          Save changes
        </Button>
      </div>
    </div>
  );
}
