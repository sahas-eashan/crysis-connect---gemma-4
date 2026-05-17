"use client";

import { useState } from "react";
import { Loader2, PackageCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import {
  generateResourcePackingChecklist,
  type ResourcePackingChecklist as PackingChecklist
} from "@/lib/gemma/local-client";
import type { Disaster, Resource, ResourceRequest, SOSSignal, SafeZone } from "@/lib/types";

type Props = {
  disaster?: Disaster | null;
  request?: ResourceRequest | null;
  resources: Resource[];
  safeZones: SafeZone[];
  sos?: SOSSignal | null;
};

export function ResourcePackingChecklist({ disaster, request, resources, safeZones, sos }: Props) {
  const [checklist, setChecklist] = useState<PackingChecklist | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("Build a packing checklist from SOS context, inventory, disaster type, and shelter pressure.");

  async function generateChecklist() {
    setLoading(true);
    setMessage("Preparing Gemma 4 packing checklist...");
    try {
      setChecklist(await generateResourcePackingChecklist({ disaster, request, resources, safeZones, sos }));
      setMessage("Checklist ready. Confirm stock and route before departure.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to prepare packing checklist.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <PackageCheck className="h-5 w-5 text-primary" />
            Gemma Resource Packing Checklist
          </CardTitle>
          <CardDescription className="mt-2">
            Produces supplies, pre-departure checks, and arrival reporting prompts for field teams.
          </CardDescription>
        </div>
        <Button disabled={loading || (!sos && !request)} onClick={() => void generateChecklist()}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Build checklist
        </Button>
      </div>

      <p className="mt-4 text-sm text-muted">{message}</p>

      {checklist ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <div>
            <p className="text-sm font-semibold text-white">Carry</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {checklist.suppliesToCarry.map((item) => (
                <Badge key={item}>{item}</Badge>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Confirm before leaving</p>
            <div className="mt-3 space-y-2 text-sm text-slate-300">
              {checklist.confirmBeforeLeaving.map((item) => (
                <p key={item}>- {item}</p>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Report after arrival</p>
            <div className="mt-3 space-y-2 text-sm text-slate-300">
              {checklist.reportAfterArrival.map((item) => (
                <p key={item}>- {item}</p>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
