"use client";

import { useState } from "react";
import { ClipboardList, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { generateNgoDispatchBrief, type NgoDispatchBrief } from "@/lib/gemma/local-client";
import type { Disaster, Resource, SOSSignal } from "@/lib/types";

type Props = {
  disaster?: Disaster | null;
  resources: Resource[];
  sosSignals: SOSSignal[];
};

export function GemmaDispatchBrief({ disaster, resources, sosSignals }: Props) {
  const [brief, setBrief] = useState<NgoDispatchBrief | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("Generate a responder brief from open SOS cases and current inventory.");

  async function generateBrief() {
    setLoading(true);
    setMessage("Preparing Gemma 4 field dispatch brief...");
    try {
      const next = await generateNgoDispatchBrief({
        responderName: "Field Team Alpha",
        sosSignals,
        resources,
        disaster
      });
      setBrief(next);
      setMessage("Brief ready for dispatcher review.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to prepare dispatch brief.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Gemma Field Dispatch Brief
          </CardTitle>
          <CardDescription className="mt-2">
            Turns multiple SOS cases into a short responder-ready assignment and carry list.
          </CardDescription>
        </div>
        <Button disabled={loading || !sosSignals.length} onClick={() => void generateBrief()}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Generate brief
        </Button>
      </div>

      <p className="mt-4 text-sm text-muted">{message}</p>

      {brief ? (
        <div className="mt-5 space-y-4">
          <p className="rounded-2xl border border-primary/25 bg-primary/10 p-4 text-sm text-slate-100">
            {brief.responderBrief}
          </p>

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <p className="text-sm font-semibold text-white">Assigned cases</p>
              <div className="mt-3 space-y-2 text-sm text-slate-300">
                {brief.assignedCases.map((item) => (
                  <p key={item}>- {item}</p>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Carry items</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {brief.carryItems.map((item) => (
                  <Badge key={item}>{item}</Badge>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {brief.riskFlags.map((flag) => (
              <Badge className="border-danger/40 bg-danger/10 text-red-200" key={flag}>
                {flag}
              </Badge>
            ))}
            {brief.humanApprovalRequired ? <Badge>human approval required</Badge> : null}
          </div>
        </div>
      ) : null}
    </Card>
  );
}
