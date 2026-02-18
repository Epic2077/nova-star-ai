"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@/hooks/useUser";
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
import {
  Loader2,
  Copy,
  Check,
  Heart,
  UserPlus,
  Unlink,
  RefreshCw,
} from "lucide-react";
import type { PartnershipWithPartner } from "@/types/partnership";

export default function PartnershipSection() {
  const { user, isLoading: userLoading } = useUser();

  const [partnership, setPartnership] = useState<PartnershipWithPartner | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [dissolving, setDissolving] = useState(false);
  const [inviteInput, setInviteInput] = useState("");
  const [copied, setCopied] = useState(false);

  const fetchPartnership = useCallback(async () => {
    try {
      const res = await fetch("/api/partnership");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setPartnership(data.partnership ?? null);
    } catch {
      console.error("Failed to load partnership");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!userLoading && user) {
      fetchPartnership();
    }
  }, [user, userLoading, fetchPartnership]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/partnership", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPartnership({ ...data.partnership, partnerName: null });
      toast.success("Partnership created! Share your invite code.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create partnership",
      );
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async () => {
    const code = inviteInput.trim();
    if (!code) {
      toast.error("Please enter an invite code");
      return;
    }

    setJoining(true);
    try {
      const res = await fetch("/api/partnership", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "join", inviteCode: code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setInviteInput("");
      toast.success("Partnership activated!");
      // Refetch to get partner name
      await fetchPartnership();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to join partnership",
      );
    } finally {
      setJoining(false);
    }
  };

  const handleDissolve = async () => {
    if (!partnership) return;

    setDissolving(true);
    try {
      const res = await fetch("/api/partnership", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "dissolve",
          partnershipId: partnership.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPartnership(null);
      toast.success("Partnership dissolved");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to dissolve partnership",
      );
    } finally {
      setDissolving(false);
    }
  };

  const handleCopy = async () => {
    if (!partnership?.invite_code) return;
    await navigator.clipboard.writeText(partnership.invite_code);
    setCopied(true);
    toast.success("Code copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  if (userLoading || loading) {
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
        <h3 className="text-lg font-semibold text-foreground">Partnership</h3>
        <p className="text-sm text-muted-foreground">
          Connect with your partner for shared insights and memory
        </p>
      </div>

      <Separator />

      {/* ── No partnership yet ── */}
      {!partnership && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Create */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="size-4" />
                Create Partnership
              </CardTitle>
              <CardDescription>
                Generate an invite code and share it with your partner
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleCreate} disabled={creating}>
                {creating && <Loader2 className="mr-2 size-4 animate-spin" />}
                Generate Invite Code
              </Button>
            </CardContent>
          </Card>

          {/* Join */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="size-4" />
                Join Partnership
              </CardTitle>
              <CardDescription>
                Enter the invite code your partner shared with you
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2">
                <Label htmlFor="invite-code">Invite Code</Label>
                <Input
                  id="invite-code"
                  value={inviteInput}
                  onChange={(e) => setInviteInput(e.target.value)}
                  placeholder="Enter code…"
                  onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                />
              </div>
              <Button onClick={handleJoin} disabled={joining}>
                {joining && <Loader2 className="mr-2 size-4 animate-spin" />}
                Join
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Pending partnership (waiting for partner) ── */}
      {partnership?.status === "pending" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="size-4 animate-spin" />
              Waiting for Partner
            </CardTitle>
            <CardDescription>
              Share this invite code with your partner. Once they enter it, the
              partnership will activate.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Your Invite Code</Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-md border bg-muted px-4 py-2.5 font-mono text-lg tracking-widest">
                  {partnership.invite_code}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="size-4 text-green-500" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </Button>
              </div>
            </div>

            <Separator />

            <Button
              variant="destructive"
              size="sm"
              onClick={handleDissolve}
              disabled={dissolving}
            >
              {dissolving && <Loader2 className="mr-2 size-4 animate-spin" />}
              <Unlink className="mr-2 size-4" />
              Cancel Partnership
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Active partnership ── */}
      {partnership?.status === "active" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="size-4 text-red-500" />
              Connected with {partnership.partnerName ?? "your partner"}
            </CardTitle>
            <CardDescription>
              Your partnership is active. Nova Star can now use shared memory
              and insights for both of you.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Status</p>
                <p className="font-medium text-green-600">Active</p>
              </div>
              <div>
                <p className="text-muted-foreground">Partner</p>
                <p className="font-medium">
                  {partnership.partnerName ?? "Unknown"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Connected since</p>
                <p className="font-medium">
                  {new Date(partnership.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            <Separator />

            <Button
              variant="destructive"
              size="sm"
              onClick={handleDissolve}
              disabled={dissolving}
            >
              {dissolving && <Loader2 className="mr-2 size-4 animate-spin" />}
              <Unlink className="mr-2 size-4" />
              Dissolve Partnership
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
