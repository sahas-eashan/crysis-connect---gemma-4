"use client";

import { AlertTriangle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import type { Disaster, Resource, SOSSignal, SafeZone } from "@/lib/types";

type Props = {
  disasters: Disaster[];
  resources: Resource[];
  safeZones: SafeZone[];
  sosSignals: SOSSignal[];
};

export function GemmaRiskReview({ disasters, resources, safeZones, sosSignals }: Props) {
  const highRiskDisasters = disasters.filter((item) => ["high", "critical"].includes((item.severity ?? "").toLowerCase()));
  const lowResources = resources.filter((item) => ["low", "depleted"].includes((item.status ?? "").toLowerCase()));
  const pressuredShelters = safeZones.filter((zone) => zone.capacity > 0 && zone.currentOccupancy / zone.capacity >= 0.8);
  const medicalSos = sosSignals.filter((signal) =>
    /(medical|injur|sick|elderly|pregnant|medicine)/i.test(`${signal.type ?? ""} ${signal.description ?? ""}`)
  );

  const risks = [
    {
      label: "High-risk disaster clusters",
      value: highRiskDisasters.length,
      detail: highRiskDisasters[0]?.title ?? "No high-risk cluster in loaded context."
    },
    {
      label: "Shelter overflow warnings",
      value: pressuredShelters.length,
      detail: pressuredShelters[0] ? `${pressuredShelters[0].name} is above 80% capacity.` : "No shelter above 80% capacity."
    },
    {
      label: "Resource gaps",
      value: lowResources.length,
      detail: lowResources[0] ? `${lowResources[0].name} is ${lowResources[0].status}.` : "No low/depleted resource in loaded context."
    },
    {
      label: "Medical SOS flags",
      value: medicalSos.length,
      detail: medicalSos[0]?.description ?? "No medical keywords in loaded SOS queue."
    }
  ];

  return (
    <Card>
      <CardTitle className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-secondary" />
        Gemma Risk Review
      </CardTitle>
      <CardDescription className="mt-2">
        Deterministic command checks shown beside Gemma outputs so reviewers can see the grounded risk signals.
      </CardDescription>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {risks.map((risk) => (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4" key={risk.label}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-white">{risk.label}</p>
              <Badge>{risk.value}</Badge>
            </div>
            <p className="mt-3 text-sm text-muted">{risk.detail}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
