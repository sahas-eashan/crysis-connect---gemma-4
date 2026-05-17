"use client";

import { MapPinned } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import type { Alert, Disaster, Resource, SOSSignal, SafeZone } from "@/lib/types";

type Props = {
  alerts: Alert[];
  disasters: Disaster[];
  resources: Resource[];
  safeZones: SafeZone[];
  sosSignals: SOSSignal[];
};

function latestDate(items: Array<{ createdAt?: string | null; updatedAt?: string | null } | Record<string, unknown>>) {
  const times = items
    .flatMap((item) => [
      typeof item.updatedAt === "string" ? item.updatedAt : null,
      typeof item.createdAt === "string" ? item.createdAt : null
    ])
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value).getTime())
    .filter((value) => Number.isFinite(value));
  return times.length ? new Date(Math.max(...times)) : null;
}

function ageMinutes(date: Date | null) {
  if (!date) return null;
  return Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
}

export function DataFreshnessMap({ alerts, disasters, resources, safeZones, sosSignals }: Props) {
  const layers = [
    { label: "Disaster polygons", count: disasters.length, latest: latestDate(disasters) },
    { label: "Safe-zone capacity", count: safeZones.length, latest: latestDate(safeZones) },
    { label: "Resource inventory", count: resources.length, latest: latestDate(resources) },
    { label: "SOS queue", count: sosSignals.length, latest: latestDate(sosSignals) },
    { label: "Public alerts", count: alerts.length, latest: latestDate(alerts) }
  ];

  return (
    <Card>
      <CardTitle className="flex items-center gap-2">
        <MapPinned className="h-5 w-5 text-primary" />
        Data Freshness Map
      </CardTitle>
      <CardDescription className="mt-2">
        Shows which operational layers are fresh enough for Gemma command reasoning and offline package publication.
      </CardDescription>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {layers.map((layer) => {
          const age = ageMinutes(layer.latest);
          const stale = age == null || age > 180;
          return (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4" key={layer.label}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-white">{layer.label}</p>
                <Badge className={stale ? "border-secondary/40 bg-secondary/10 text-yellow-200" : ""}>
                  {stale ? "review" : "fresh"}
                </Badge>
              </div>
              <p className="mt-3 text-2xl font-semibold text-white">{layer.count}</p>
              <p className="mt-1 text-xs text-muted">
                {age == null ? "No timestamp available" : `Latest update ${age} min ago`}
              </p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
