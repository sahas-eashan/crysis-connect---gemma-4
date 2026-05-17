"use client";

import { AlertTriangle, Database } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { CachedEmergencySyncPackage } from "@/lib/offline/emergency-cache";

type Props = {
  pkg: CachedEmergencySyncPackage | null;
};

export function DataFreshnessBanner({ pkg }: Props) {
  if (!pkg) {
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
        <AlertTriangle className="mr-2 inline h-4 w-4" />
        No offline emergency package is cached yet.
      </div>
    );
  }

  const ageMinutes = Math.max(0, Math.round((Date.now() - Date.parse(pkg.generatedAt)) / 60000));
  const stale = Date.now() > Date.parse(pkg.validUntil);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-slate-100 md:flex-row md:items-center md:justify-between">
      <span>
        <Database className="mr-2 inline h-4 w-4 text-primary" />
        Gemma 4 Local Guidance based on cached verified CrisisConnect data. Last synced: {ageMinutes} minutes ago.
      </span>
      <div className="flex gap-2">
        <Badge>{stale ? "stale data warning" : "fresh cache"}</Badge>
        <Badge>{pkg.parsed.tileManifest.count} map tiles</Badge>
      </div>
    </div>
  );
}
