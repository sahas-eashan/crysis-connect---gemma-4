"use client";

import { useMemo, useState } from "react";
import { Bot, Loader2, ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { triageSosCase } from "@/lib/ai-client";
import { mockSosTriage } from "@/lib/mock-data";
import type { SOSSignal, SosTriage } from "@/lib/types";

type Props = {
  sosSignals: SOSSignal[];
};

export function SosTriagePanel({ sosSignals }: Props) {
  const [selectedId, setSelectedId] = useState(sosSignals[0]?.id ?? "");
  const [triage, setTriage] = useState<SosTriage | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("Select an SOS case and run Gemma triage for dispatcher review.");
  const selected = useMemo(
    () => sosSignals.find((item) => item.id === selectedId) ?? sosSignals[0] ?? null,
    [selectedId, sosSignals]
  );

  async function analyze() {
    if (!selected) return;
    setLoading(true);
    setMessage("Running Gemma 4 SOS triage...");
    try {
      setTriage(await triageSosCase(selected.id));
      setMessage("Live triage ready. Human approval remains required for dispatch.");
    } catch {
      setTriage({
        ...mockSosTriage,
        sosId: selected.id,
        rationale: {
          ...mockSosTriage.rationale,
          summary: "Demo fallback triage generated because the live AI backend is unavailable."
        }
      });
      setMessage("Live triage unavailable, so a deterministic demo fallback is shown.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-danger" />
            Gemma SOS Triage
          </CardTitle>
          <CardDescription className="mt-2">
            Explains severity, urgency, responder suggestions, flags, missing information, and review status.
          </CardDescription>
        </div>
        <Button disabled={loading || !selected} onClick={() => void analyze()}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
          Analyze SOS
        </Button>
      </div>

      <div className="mt-5">
        <select
          className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-white"
          onChange={(event) => setSelectedId(event.target.value)}
          value={selected?.id ?? ""}
        >
          {sosSignals.map((signal) => (
            <option key={signal.id} value={signal.id}>
              {signal.type ?? "SOS"} - {signal.description ?? signal.id}
            </option>
          ))}
        </select>
      </div>

      <p className="mt-4 text-sm text-muted">{message}</p>

      {triage ? (
        <div className="mt-5 space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge>{triage.severity} severity</Badge>
            <Badge>{triage.urgency} urgency</Badge>
            <Badge>{Math.round(triage.meta.confidence * 100)}% confidence</Badge>
            <Badge>{triage.meta.requiresHumanApproval ? "human approval required" : "ready"}</Badge>
          </div>

          <p className="text-sm text-slate-200">{triage.rationale.summary}</p>
          <div className="space-y-2 text-sm text-slate-300">
            {triage.rationale.bullets.map((item) => (
              <p key={item}>- {item}</p>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {triage.recommendations.map((item) => (
              <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4" key={item.title}>
                <p className="font-medium text-white">{item.title}</p>
                <p className="mt-2 text-sm text-slate-300">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </Card>
  );
}
