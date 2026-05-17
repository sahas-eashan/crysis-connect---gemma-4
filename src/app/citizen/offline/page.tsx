"use client";

import { useEffect, useState } from "react";
import { Download, MapPinned, RefreshCw, ShieldCheck, TriangleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import {
  activeCachedDisastersAt,
  downloadEmergencySyncPackage,
  getPackageAgeMinutes,
  isPackageStale,
  loadEmergencySyncPackage,
  nearestCachedSafeZone,
  type CachedEmergencySyncPackage
} from "@/lib/offline/emergency-cache";
import { formatDistanceMeters } from "@/lib/utils";

type LocationState = {
  lat: number;
  lon: number;
};

export default function CitizenOfflinePage() {
  const [pkg, setPkg] = useState<CachedEmergencySyncPackage | null>(null);
  const [location, setLocation] = useState<LocationState | null>(null);
  const [status, setStatus] = useState<string>("Load your emergency package before connectivity drops.");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void loadEmergencySyncPackage().then(setPkg);
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lon: position.coords.longitude
        });
      },
      () => setStatus("Location is unavailable. Enable GPS to build a local emergency package near you."),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  const ageMinutes = getPackageAgeMinutes(pkg);
  const stale = isPackageStale(pkg);
  const nearest = location ? nearestCachedSafeZone(pkg, location.lat, location.lon) : null;
  const activeDisasters = location ? activeCachedDisastersAt(pkg, location.lat, location.lon) : [];

  async function syncPackage() {
    if (!location) {
      setStatus("Enable location first so CrisisConnect can build a bounded package for your area.");
      return;
    }

    setLoading(true);
    setStatus("Downloading emergency package and preparing offline map tiles...");
    try {
      const nextPackage = await downloadEmergencySyncPackage({
        lat: location.lat,
        lon: location.lon,
        radiusKm: 8,
        minZoom: 12,
        maxZoom: 14,
        lastSyncAt: pkg?.generatedAt ?? null
      });
      setPkg(nextPackage);
      setStatus(
        `Emergency package ready. ${nextPackage.parsed.tileManifest.count} map tiles were sent to the offline cache.`
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to download emergency package.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Offline Emergency Sync</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted">
            Cache verified disaster data, safe zones, resources, alerts, and map tiles before the network becomes unreliable.
          </p>
        </div>
        <Button onClick={syncPackage} disabled={loading}>
          {loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
          Sync package
        </Button>
      </div>

      <div className="rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-slate-100">
        {status}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Package
          </CardTitle>
          <CardDescription className="mt-3">
            {pkg ? `Last synced ${ageMinutes} minutes ago.` : "No emergency package cached yet."}
          </CardDescription>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge>{pkg ? `v${pkg.version}` : "not ready"}</Badge>
            <Badge>{stale ? "stale" : "valid"}</Badge>
            {pkg ? <Badge>{pkg.parsed.tileManifest.count} tiles</Badge> : null}
          </div>
        </Card>

        <Card>
          <CardTitle className="flex items-center gap-2">
            <MapPinned className="h-5 w-5 text-primary" />
            GPS grounding
          </CardTitle>
          <CardDescription className="mt-3">
            {location
              ? `${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}`
              : "Waiting for device location."}
          </CardDescription>
          <p className="mt-4 text-sm text-slate-200">
            {nearest
              ? `${nearest.zone.name} is ${formatDistanceMeters(nearest.distanceMeters)} away.`
              : "Nearest cached safe zone will appear after sync."}
          </p>
        </Card>

        <Card>
          <CardTitle className="flex items-center gap-2">
            <TriangleAlert className="h-5 w-5 text-danger" />
            Local risk
          </CardTitle>
          <CardDescription className="mt-3">
            {activeDisasters.length
              ? `${activeDisasters.length} cached disaster polygon matches your GPS.`
              : "No cached disaster polygon currently contains your GPS point."}
          </CardDescription>
          <div className="mt-4 flex flex-wrap gap-2">
            {activeDisasters.slice(0, 3).map((disaster) => (
              <Badge key={disaster.id}>{disaster.title}</Badge>
            ))}
          </div>
        </Card>
      </div>

      {pkg ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardTitle>Cached safe zones</CardTitle>
            <div className="mt-4 space-y-3">
              {pkg.parsed.safeZones.slice(0, 6).map((zone) => (
                <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3" key={zone.id}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-white">{zone.name}</p>
                    <Badge>{zone.status ?? "active"}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {zone.currentOccupancy}/{zone.capacity} occupied
                  </p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardTitle>Cached alerts</CardTitle>
            <div className="mt-4 space-y-3">
              {pkg.parsed.publicAlerts.slice(0, 6).map((alert) => (
                <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3" key={alert.id}>
                  <p className="font-medium text-white">{alert.title}</p>
                  <p className="mt-1 text-sm text-muted">{alert.body}</p>
                </div>
              ))}
              {!pkg.parsed.publicAlerts.length ? <p className="text-sm text-muted">No cached alerts in this package.</p> : null}
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
