"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Heart, Link2, Bot, Sparkles, Eye } from "lucide-react";
import type {
  PartnerProfileRow,
  PartnerQuizAnswer,
} from "@/types/partnerProfile";
import type { PartnershipRow } from "@/types/partnership";
import Link from "next/link";

interface Props {
  partnership: PartnershipRow | null;
  partnerProfile: PartnerProfileRow | null;
  partnerSeesYou: PartnerProfileRow | null;
  partnerName: string | null;
}

export default function PartnerProfileTab({
  partnership,
  partnerProfile,
  partnerSeesYou,
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

      {/* Take / retake partner quiz CTA */}
      <Card className="border-dashed">
        <CardContent className="flex items-center gap-4 py-5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-pink-500/10">
            <Sparkles className="size-5 text-pink-500" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">
              {partnerProfile?.quiz_answers
                ? "Retake the Partner Perception Quiz"
                : "Take the Partner Perception Quiz"}
            </p>
            <p className="text-xs text-muted-foreground">
              {partnerProfile?.quiz_answers
                ? "Update how you see your partner — your previous answers will be replaced."
                : "Help Nova understand your partner through 8 quick questions. Your partner can see the results too."}
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <Link href="/quiz/partner?from=profile">
              {partnerProfile?.quiz_answers ? "Retake" : "Start Quiz"}
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* "How they see you" — partner's quiz answers about the current user */}
      {partnerSeesYou && partnerSeesYou.quiz_answers && (
        <HowTheySeeYouCard partnerName={partnerName} profile={partnerSeesYou} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  "How they see you" card                                           */
/* ------------------------------------------------------------------ */

function HowTheySeeYouCard({
  partnerName,
  profile,
}: {
  partnerName: string | null;
  profile: PartnerProfileRow;
}) {
  const answers = (profile.quiz_answers ?? []) as PartnerQuizAnswer[];
  const name = partnerName ?? "Your partner";

  return (
    <Card className="border-pink-500/20 bg-pink-500/2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Eye className="size-4 text-pink-500" />
          How {name} sees you
        </CardTitle>
        <CardDescription>
          These are {name}&apos;s answers from the Partner Perception Quiz.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* AI-generated summary */}
        {profile.ai_notes && (
          <div>
            <p className="mb-1 text-sm font-medium text-foreground">
              {name}&apos;s perspective
            </p>
            <p className="text-sm whitespace-pre-line text-muted-foreground">
              {profile.ai_notes}
            </p>
          </div>
        )}

        {profile.traits && profile.traits.length > 0 && (
          <>
            <Separator />
            <div>
              <p className="mb-1.5 text-sm font-medium text-foreground">
                How they describe you
              </p>
              <div className="flex flex-wrap gap-1.5">
                {profile.traits.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center rounded-full border border-pink-500/20 bg-pink-500/5 px-2.5 py-0.5 text-xs text-foreground"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </>
        )}

        {profile.important_truths && profile.important_truths.length > 0 && (
          <>
            <Separator />
            <div>
              <p className="mb-1.5 text-sm font-medium text-foreground">
                What they value about you
              </p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {profile.important_truths.map((t) => (
                  <li key={t} className="flex items-start gap-2">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-pink-500/60" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {/* Raw quiz answers — collapsible */}
        {answers.length > 0 && (
          <>
            <Separator />
            <details className="group">
              <summary className="cursor-pointer text-sm font-medium text-foreground hover:text-primary">
                View full quiz answers
              </summary>
              <div className="mt-3 space-y-3">
                {answers.map((a, i) => (
                  <div key={i} className="space-y-0.5">
                    <p className="text-xs font-medium text-muted-foreground">
                      {a.question}
                    </p>
                    <p className="text-sm text-foreground">{a.answer}</p>
                  </div>
                ))}
              </div>
            </details>
          </>
        )}
      </CardContent>
    </Card>
  );
}
