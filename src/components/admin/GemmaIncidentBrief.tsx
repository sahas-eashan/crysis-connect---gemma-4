"use client";

import { useState } from "react";
import { FileSearch, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { GemmaTrustLabels } from "@/components/ai/gemma-trust-labels";
import { generateIncidentBrief, recommendOperations } from "@/lib/ai-client";
import { mockIncidentBrief, mockOperationsRecommendationSet } from "@/lib/mock-data";
import type { IncidentBrief, OperationsRecommendationSet } from "@/lib/types";

type Props = {
  disasterId?: string | null;
};

function priorityClass(priority?: string) {
  const value = priority?.toLowerCase();
  if (value === "critical") return "border-danger/40 bg-danger/10 text-red-200";
  if (value === "high") return "border-secondary/40 bg-secondary/10 text-yellow-200";
  return "border-primary/40 bg-primary/10 text-primary";
}

export function GemmaIncidentBrief({ disasterId }: Props) {
  const [brief, setBrief] = useState<IncidentBrief | null>(null);
  const [operations, setOperations] = useState<OperationsRecommendationSet | null>(null);
  const [timeframe, setTimeframe] = useState("next_6_hours");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("Generate a Gemma incident brief and operations plan from live command records.");

  async function generate() {
    setLoading(true);
    setMessage("Generating Gemma 4 command brief...");
    try {
      const [nextBrief, nextOperations] = await Promise.all([
        generateIncidentBrief(disasterId ?? null),
        recommendOperations(timeframe)
      ]);
      setBrief(nextBrief);
      setOperations(nextOperations);
      setMessage("Live Gemma command brief ready for approval.");
    } catch {
      setBrief(mockIncidentBrief);
      setOperations({ ...mockOperationsRecommendationSet, timeframe });
      setMessage("Live AI unavailable, showing deterministic demo command brief.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <FileSearch className="h-5 w-5 text-primary" />
            Gemma Incident Brief
          </CardTitle>
          <CardDescription className="mt-2">
            Summarizes risk clusters, shelter pressure, resource gaps, assumptions, stale data warnings, and recommended actions.
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-white"
            onChange={(event) => setTimeframe(event.target.value)}
            value={timeframe}
          >
            <option value="next_1_hour">Next 1 hour</option>
            <option value="next_6_hours">Next 6 hours</option>
            <option value="next_24_hours">Next 24 hours</option>
          </select>
          <Button disabled={loading} onClick={() => void generate()}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Generate brief
          </Button>
        </div>
      </div>

      <p className="mt-4 text-sm text-muted">{message}</p>

      {brief ? (
        <div className="mt-5 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
            <GemmaTrustLabels
              blocked={brief.meta.riskFlags.blocked}
              offline={Boolean(brief.meta.offlineMode)}
              requiresApproval={brief.meta.requiresHumanApproval}
              stale={Boolean(brief.meta.dataFreshnessMinutes && brief.meta.dataFreshnessMinutes > 180)}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge>{brief.meta.runtime?.replace(/_/g, " ") ?? "Gemma 4"}</Badge>
              <Badge>{Math.round(brief.meta.confidence * 100)}% confidence</Badge>
            </div>
            <p className="mt-4 text-lg font-semibold text-white">{brief.headline}</p>
            <p className="mt-3 text-sm text-slate-300">{brief.summary}</p>
            <div className="mt-4 space-y-2 text-sm text-slate-300">
              {brief.rationale.bullets.map((item) => (
                <p key={item}>- {item}</p>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {operations?.recommendations.map((item) => (
              <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4" key={item.title}>
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-white">{item.title}</p>
                  <Badge className={priorityClass(item.priority)}>{item.priority}</Badge>
                </div>
                <p className="mt-2 text-sm text-slate-300">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </Card>
  );
}
