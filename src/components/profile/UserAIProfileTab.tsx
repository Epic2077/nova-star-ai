"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Save, Sparkles, ClipboardList } from "lucide-react";
import type { UserProfileRow } from "@/types/userProfile";
import type { PersonalitySummary } from "@/types/userProfile";

interface Props {
  profile: UserProfileRow | null;
  onSaved: () => void;
}

export default function UserAIProfileTab({ profile, onSaved }: Props) {
  const router = useRouter();
  const [name, setName] = useState(profile?.name ?? "");
  const [tone, setTone] = useState(profile?.tone ?? "");
  const [interestsText, setInterestsText] = useState(
    profile?.interests?.join(", ") ?? "",
  );
  const [emotionalPatterns, setEmotionalPatterns] = useState(
    profile?.emotional_patterns ?? "",
  );
  const [communicationStyle, setCommunicationStyle] = useState(
    profile?.communication_style ?? "",
  );
  const [saving, setSaving] = useState(false);

  const summary = profile?.memory_summary as PersonalitySummary | null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const interests = interestsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch("/api/nova-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name || undefined,
          tone: tone || null,
          interests: interests.length ? interests : null,
          emotional_patterns: emotionalPatterns || null,
          communication_style: communicationStyle || null,
        }),
      });

      if (!res.ok) throw new Error("Save failed");
      toast.success("AI profile updated");
      onSaved();
    } catch {
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Editable fields */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Your AI Profile</CardTitle>
              <CardDescription>
                These fields shape how Nova understands and communicates with
                you. Edit them anytime — Nova also refines them as you chat.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 gap-1.5"
              onClick={() => router.push("/quiz?from=profile")}
            >
              <ClipboardList className="size-4" />
              Take Quiz
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-2">
            <Label htmlFor="ai-name">Name</Label>
            <Input
              id="ai-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="How Nova knows you"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="ai-tone">Tone preference</Label>
            <Input
              id="ai-tone"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              placeholder="e.g. warm, direct, playful, gentle"
            />
            <p className="text-xs text-muted-foreground">
              The communication tone you prefer when talking with Nova
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="ai-interests">Interests</Label>
            <Input
              id="ai-interests"
              value={interestsText}
              onChange={(e) => setInterestsText(e.target.value)}
              placeholder="e.g. Philosophy, Music, Coding, Art"
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated list of your interests
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="ai-emotional">Emotional patterns</Label>
            <Textarea
              id="ai-emotional"
              value={emotionalPatterns}
              onChange={(e) => setEmotionalPatterns(e.target.value)}
              placeholder="How you typically process emotions…"
              rows={3}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="ai-comm">Communication style</Label>
            <Input
              id="ai-comm"
              value={communicationStyle}
              onChange={(e) => setCommunicationStyle(e.target.value)}
              placeholder="e.g. direct, reflective, humor-driven"
            />
          </div>

          <div className="flex justify-start pt-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Save className="mr-2 size-4" />
              )}
              Save changes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* AI-learned personality (read-only) */}
      {summary && Object.keys(summary).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              What Nova has learned about you
            </CardTitle>
            <CardDescription>
              Nova builds this personality profile over time from your
              conversations. This is read-only — it updates automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {summary.traits && summary.traits.length > 0 && (
              <PersonalityField label="Traits" items={summary.traits} />
            )}
            {summary.emotionalTendencies &&
              summary.emotionalTendencies.length > 0 && (
                <PersonalityField
                  label="Emotional tendencies"
                  items={summary.emotionalTendencies}
                />
              )}
            {summary.communicationPreferences &&
              summary.communicationPreferences.length > 0 && (
                <PersonalityField
                  label="Communication preferences"
                  items={summary.communicationPreferences}
                />
              )}
            {summary.values && summary.values.length > 0 && (
              <PersonalityField label="Values" items={summary.values} />
            )}
            {summary.stressResponses && summary.stressResponses.length > 0 && (
              <PersonalityField
                label="Stress responses"
                items={summary.stressResponses}
              />
            )}
            {summary.humor && (
              <div>
                <p className="text-sm font-medium text-foreground">
                  Humor style
                </p>
                <p className="text-sm text-muted-foreground">{summary.humor}</p>
              </div>
            )}
            {summary.boundaries && summary.boundaries.length > 0 && (
              <PersonalityField label="Boundaries" items={summary.boundaries} />
            )}
            {summary.notes && (
              <div>
                <p className="text-sm font-medium text-foreground">Notes</p>
                <p className="text-sm whitespace-pre-line text-muted-foreground">
                  {summary.notes}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tag list display                                                    */
/* ------------------------------------------------------------------ */

function PersonalityField({
  label,
  items,
}: {
  label: string;
  items: string[];
}) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-foreground">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <span
            key={item}
            className="inline-flex items-center rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-xs text-foreground"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
