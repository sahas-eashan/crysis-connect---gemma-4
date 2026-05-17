"use client";

import { useState } from "react";
import { DownloadCloud, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { downloadEmergencySyncPackage, type CachedEmergencySyncPackage } from "@/lib/offline/emergency-cache";

export function EmergencySyncPackagePublisher() {
  const [lat, setLat] = useState(6.9271);
  const [lon, setLon] = useState(79.8612);
  const [radiusKm, setRadiusKm] = useState(8);
  const [pkg, setPkg] = useState<CachedEmergencySyncPackage | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("Publish a bounded offline emergency package for citizen and NGO devices.");

  async function publishPackage() {
    setLoading(true);
    setMessage("Generating offline emergency package from live PostGIS-backed records...");
    try {
      const next = await downloadEmergencySyncPackage({
        lat,
        lon,
        radiusKm,
        minZoom: 12,
        maxZoom: 14,
        lastSyncAt: pkg?.generatedAt ?? null
      });
      setPkg(next);
      setMessage("Emergency sync package generated and cached for this browser demo.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to publish emergency package.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <DownloadCloud className="h-5 w-5 text-primary" />
            Emergency Sync Package Publisher
          </CardTitle>
          <CardDescription className="mt-2">
            Creates disaster polygons, shelter capacity, alerts, contacts, risk rules, and tile manifests for offline clients.
          </CardDescription>
        </div>
        <Button disabled={loading} onClick={() => void publishPackage()}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Publish package
        </Button>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <label className="text-sm text-muted">
          Latitude
          <input
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-white"
            onChange={(event) => setLat(Number(event.target.value))}
            type="number"
            value={lat}
          />
        </label>
        <label className="text-sm text-muted">
          Longitude
          <input
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-white"
            onChange={(event) => setLon(Number(event.target.value))}
            type="number"
            value={lon}
          />
        </label>
        <label className="text-sm text-muted">
          Radius km
          <input
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-white"
            max={25}
            min={1}
            onChange={(event) => setRadiusKm(Number(event.target.value))}
            type="number"
            value={radiusKm}
          />
        </label>
      </div>

      <p className="mt-4 text-sm text-muted">{message}</p>

      {pkg ? (
        <div className="mt-5 flex flex-wrap gap-2">
          <Badge>checksum {pkg.checksum.slice(0, 12)}</Badge>
          <Badge>{pkg.parsed.disasters.length} disasters</Badge>
          <Badge>{pkg.parsed.safeZones.length} shelters</Badge>
          <Badge>{pkg.parsed.publicAlerts.length} alerts</Badge>
          <Badge>{pkg.parsed.tileManifest.count} tiles</Badge>
          <Badge>valid until {new Date(pkg.validUntil).toLocaleString()}</Badge>
        </div>
      ) : null}
    </Card>
  );
}
