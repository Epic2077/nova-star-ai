"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Heart, Link2, Bot } from "lucide-react";
import type { PartnerProfileRow } from "@/types/partnerProfile";
import type { PartnershipRow } from "@/types/partnership";

interface Props {
  partnership: PartnershipRow | null;
  partnerProfile: PartnerProfileRow | null;
  partnerName: string | null;
}

export default function PartnerProfileTab({
  partnership,
  partnerProfile,
  partnerName,
}: Props) {
  // No partnership & no AI-built profile
  if (!partnership && !partnerProfile) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="size-4" />
            Partner Profile
          </CardTitle>
          <CardDescription>
            No partner profile yet. Start chatting about your partner and Nova
            will begin building one, or link your partner via the{" "}
            <a
              href="/setting/account?section=partnership"
              className="text-primary underline underline-offset-2"
            >
              Partnership settings
            </a>
            .
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const hasLinkedPartner = partnership?.status === "active" && partnerName;
  const displayName = hasLinkedPartner
    ? partnerName
    : (partnerProfile?.name ?? "Unknown");

  return (
    <div className="space-y-6">
      {/* Source indicator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="size-4 text-pink-500" />
            {displayName}
          </CardTitle>
          <CardDescription className="flex items-center gap-1.5">
            {hasLinkedPartner ? (
              <>
                <Link2 className="size-3.5" />
                Linked partner account
              </>
            ) : (
              <>
                <Bot className="size-3.5" />
                AI-built profile from your conversations
              </>
            )}
          </CardDescription>
        </CardHeader>

        {partnerProfile && (
          <CardContent className="space-y-4">
            {partnerProfile.traits && partnerProfile.traits.length > 0 && (
              <div>
                <p className="mb-1.5 text-sm font-medium text-foreground">
                  Traits
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {partnerProfile.traits.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-xs text-foreground"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {partnerProfile.relational_tendencies &&
              partnerProfile.relational_tendencies.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="mb-1.5 text-sm font-medium text-foreground">
                      Relational tendencies
                    </p>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {partnerProfile.relational_tendencies.map((t) => (
                        <li key={t} className="flex items-start gap-2">
                          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary/60" />
                          {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}

            {partnerProfile.important_truths &&
              partnerProfile.important_truths.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="mb-1.5 text-sm font-medium text-foreground">
                      Important truths
                    </p>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {partnerProfile.important_truths.map((t) => (
                        <li key={t} className="flex items-start gap-2">
                          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary/60" />
                          {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}

            {partnerProfile.ai_notes && (
              <>
                <Separator />
                <div>
                  <p className="mb-1 text-sm font-medium text-foreground">
                    Nova&apos;s notes
                  </p>
                  <p className="text-sm whitespace-pre-line text-muted-foreground">
                    {partnerProfile.ai_notes}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        )}

        {/* Linked partner but no AI profile — show minimal info */}
        {hasLinkedPartner && !partnerProfile && (
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Your partner&apos;s account is linked. Nova uses their own profile
              to understand them — no separate profile is needed here.
            </p>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
