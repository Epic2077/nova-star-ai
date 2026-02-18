"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { useCreatorAdmin } from "@/components/creator/CreatorAdminContext";
import { formatTimestamp } from "@/lib/formatTimestamp";
import type { PersonalitySummary } from "@/types/userProfile";

export default function CreatorAIProfilePage() {
  const { result } = useCreatorAdmin();
  const nova = result?.nova;

  if (!result) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Search for a user email above to view AI profile data.
        </CardContent>
      </Card>
    );
  }

  const userProfile = nova?.userProfile;
  const partnerProfile = nova?.partnerProfile;
  const partnership = nova?.partnership;
  const partnerName = nova?.partnerName;
  const summary = userProfile?.memory_summary as PersonalitySummary | null;

  return (
    <div className="space-y-6">
      {/* User AI Profile */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>User AI Profile</CardTitle>
            <CardDescription>
              Fields from the user_profiles table that shape Nova&apos;s
              behavior
            </CardDescription>
          </CardHeader>
          <CardContent>
            {userProfile ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-48">Field</TableHead>
                    <TableHead>Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Name</TableCell>
                    <TableCell>{userProfile.name}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Tone</TableCell>
                    <TableCell>{userProfile.tone ?? "—"}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Interests</TableCell>
                    <TableCell>
                      {userProfile.interests?.length ? (
                        <div className="flex flex-wrap gap-1">
                          {userProfile.interests.map((i) => (
                            <span
                              key={i}
                              className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-xs"
                            >
                              {i}
                            </span>
                          ))}
                        </div>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">
                      Emotional Patterns
                    </TableCell>
                    <TableCell>
                      {userProfile.emotional_patterns ?? "—"}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">
                      Communication Style
                    </TableCell>
                    <TableCell>
                      {userProfile.communication_style ?? "—"}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Setup Mode</TableCell>
                    <TableCell>{userProfile.setup_mode}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Updated</TableCell>
                    <TableCell>
                      {formatTimestamp(userProfile.updated_at)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">
                No user AI profile found.
              </p>
            )}
          </CardContent>
        </Card>

        {/* AI-Learned Personality */}
        <Card>
          <CardHeader>
            <CardTitle>AI-Learned Personality</CardTitle>
            <CardDescription>
              memory_summary JSONB — built automatically from conversations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {summary && Object.keys(summary).length > 0 ? (
              <div className="space-y-3">
                {summary.traits && summary.traits.length > 0 && (
                  <TagGroup label="Traits" items={summary.traits} />
                )}
                {summary.emotionalTendencies &&
                  summary.emotionalTendencies.length > 0 && (
                    <TagGroup
                      label="Emotional Tendencies"
                      items={summary.emotionalTendencies}
                    />
                  )}
                {summary.communicationPreferences &&
                  summary.communicationPreferences.length > 0 && (
                    <TagGroup
                      label="Communication Preferences"
                      items={summary.communicationPreferences}
                    />
                  )}
                {summary.values && summary.values.length > 0 && (
                  <TagGroup label="Values" items={summary.values} />
                )}
                {summary.stressResponses &&
                  summary.stressResponses.length > 0 && (
                    <TagGroup
                      label="Stress Responses"
                      items={summary.stressResponses}
                    />
                  )}
                {summary.humor && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Humor
                    </p>
                    <p className="text-sm">{summary.humor}</p>
                  </div>
                )}
                {summary.boundaries && summary.boundaries.length > 0 && (
                  <TagGroup label="Boundaries" items={summary.boundaries} />
                )}
                {summary.notes && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Notes
                    </p>
                    <p className="text-sm whitespace-pre-line">
                      {summary.notes}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No personality data learned yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Partnership & Partner Profile */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Partnership</CardTitle>
          </CardHeader>
          <CardContent>
            {partnership ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-48">Field</TableHead>
                    <TableHead>Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">ID</TableCell>
                    <TableCell className="font-mono text-xs">
                      {partnership.id}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Status</TableCell>
                    <TableCell>
                      <span className="rounded-full border border-green-500/20 bg-green-500/10 px-2 py-0.5 text-xs text-green-600">
                        {partnership.status}
                      </span>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Partner Name</TableCell>
                    <TableCell>{partnerName ?? "—"}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">User A</TableCell>
                    <TableCell className="font-mono text-xs">
                      {partnership.user_a}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">User B</TableCell>
                    <TableCell className="font-mono text-xs">
                      {partnership.user_b ?? "—"}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Invite Code</TableCell>
                    <TableCell className="font-mono">
                      {partnership.invite_code}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Created</TableCell>
                    <TableCell>
                      {formatTimestamp(partnership.created_at)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">
                No active partnership.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI Partner Profile</CardTitle>
            <CardDescription>
              {partnerProfile
                ? `Source: ${partnerProfile.source}`
                : "No AI-built partner profile"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {partnerProfile ? (
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Name
                  </p>
                  <p className="text-sm">{partnerProfile.name}</p>
                </div>
                {partnerProfile.traits && partnerProfile.traits.length > 0 && (
                  <TagGroup label="Traits" items={partnerProfile.traits} />
                )}
                {partnerProfile.relational_tendencies &&
                  partnerProfile.relational_tendencies.length > 0 && (
                    <TagGroup
                      label="Relational Tendencies"
                      items={partnerProfile.relational_tendencies}
                    />
                  )}
                {partnerProfile.important_truths &&
                  partnerProfile.important_truths.length > 0 && (
                    <TagGroup
                      label="Important Truths"
                      items={partnerProfile.important_truths}
                    />
                  )}
                {partnerProfile.ai_notes && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      AI Notes
                    </p>
                    <p className="text-sm whitespace-pre-line">
                      {partnerProfile.ai_notes}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Updated
                  </p>
                  <p className="text-sm">
                    {formatTimestamp(partnerProfile.updated_at)}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No partner profile data.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function TagGroup({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-1">
        {items.map((item) => (
          <span
            key={item}
            className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-xs"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
