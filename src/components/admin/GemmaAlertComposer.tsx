"use client";

import { useMemo, useState } from "react";
import { Loader2, RadioTower } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { GemmaTrustLabels } from "@/components/ai/gemma-trust-labels";
import { generateAlertDraft } from "@/lib/ai-client";
import { mockAlertDraft } from "@/lib/mock-data";
import type { AlertDraft } from "@/lib/types";

function compactSms(text: string) {
  return text.length <= 155 ? text : `${text.slice(0, 152).trim()}...`;
}

function panicRisk(text: string) {
  const lower = text.toLowerCase();
  return ["panic", "run", "die", "impossible", "guaranteed"].some((word) => lower.includes(word));
}

export function GemmaAlertComposer() {
  const [title, setTitle] = useState("Flood safety update");
  const [body, setBody] = useState("Flooding is active near low-lying roads. Move to higher ground and follow official instructions.");
  const [targetArea, setTargetArea] = useState("Colombo flood polygon");
  const [draft, setDraft] = useState<AlertDraft | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("Compose multilingual public alerts with approval-ready risk checks.");

  const missingDetails = useMemo(
    () =>
      [
        body.toLowerCase().includes("where") || targetArea.trim() ? null : "target area",
        body.toLowerCase().includes("when") || /\d/.test(body) ? null : "time window",
        body.toLowerCase().includes("safe") || body.toLowerCase().includes("shelter") ? null : "safe action"
      ].filter((item): item is string => Boolean(item)),
    [body, targetArea]
  );

  async function generate() {
    setLoading(true);
    setMessage("Generating Gemma 4 alert draft...");
    try {
      setDraft(
        await generateAlertDraft({
          title,
          body,
          channel: ["sms", "push", "email"],
          targetRoles: ["citizen", "ngo"]
        })
      );
      setMessage("Draft ready. Human approval is required before broadcast.");
    } catch {
      setDraft(mockAlertDraft);
      setMessage("Live alert generation unavailable, showing deterministic demo draft.");
    } finally {
      setLoading(false);
    }
  }

  const activeText = draft?.english ?? body;

  return (
    <Card>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <RadioTower className="h-5 w-5 text-primary" />
            Gemma Alert Composer
          </CardTitle>
          <CardDescription className="mt-2">
            Drafts English, Sinhala, and Tamil alerts with panic-risk, missing-detail, geofence, SMS, push, and public-feed variants.
          </CardDescription>
        </div>
        <Button disabled={loading} onClick={() => void generate()}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Generate alert
        </Button>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-3">
          <input
            className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-white"
            onChange={(event) => setTitle(event.target.value)}
            value={title}
          />
          <input
            className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-white"
            onChange={(event) => setTargetArea(event.target.value)}
            value={targetArea}
          />
          <textarea
            className="min-h-28 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-foreground outline-none ring-primary placeholder:text-slate-400 focus:border-primary/40 focus:bg-slate-950/70 focus:ring-2"
            onChange={(event) => setBody(event.target.value)}
            value={body}
          />
          <p className="text-sm text-muted">{message}</p>
        </div>

        <div className="space-y-3">
          <GemmaTrustLabels requiresApproval blocked={Boolean(draft?.meta.riskFlags.blocked)} />
          <div className="flex flex-wrap gap-2">
            <Badge className={panicRisk(activeText) ? "border-danger/40 bg-danger/10 text-red-200" : ""}>
              {panicRisk(activeText) ? "panic-risk review" : "calm wording"}
            </Badge>
            <Badge>{missingDetails.length ? `missing: ${missingDetails.join(", ")}` : "required details present"}</Badge>
            <Badge>target: {targetArea}</Badge>
            <Badge>approval required</Badge>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
              <p className="text-sm font-semibold text-white">SMS version</p>
              <p className="mt-2 text-sm text-slate-300">{compactSms(activeText)}</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
              <p className="text-sm font-semibold text-white">Push version</p>
              <p className="mt-2 text-sm text-slate-300">{title}: {compactSms(activeText).slice(0, 110)}</p>
            </div>
          </div>

          {draft ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
              <p className="text-sm font-semibold text-white">Public feed version</p>
              <p className="mt-2 text-sm text-slate-300">{draft.english}</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <p className="text-sm text-muted">{draft.sinhala}</p>
                <p className="text-sm text-muted">{draft.tamil}</p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
