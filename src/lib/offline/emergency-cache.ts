"use client";

import { del, get, set } from "idb-keyval";
import { generateClient } from "aws-amplify/api";

import { configureAmplify } from "@/lib/aws/amplify";
import { queries } from "@/lib/aws/graphql/operations";
import type {
  Disaster,
  EmergencySyncInput,
  EmergencySyncPackage,
  EmergencySyncPackageJson,
  SafeZone
} from "@/lib/types";
import { parseGeoJsonPoint } from "@/lib/utils";

const PACKAGE_KEY = "crisisconnect:emergency-sync:package";
const PACKAGE_JSON_KEY = "crisisconnect:emergency-sync:package-json";

export type CachedEmergencySyncPackage = EmergencySyncPackage & {
  parsed: EmergencySyncPackageJson;
  cachedAt: string;
};

/** Parses the backend package payload once before storing it for offline use. */
export function parseEmergencySyncPackage(pkg: EmergencySyncPackage): EmergencySyncPackageJson {
  return JSON.parse(pkg.packageJson) as EmergencySyncPackageJson;
}

/**
 * Persists a verified emergency package and asks the service worker to cache any
 * bounded map tiles included in the package manifest.
 */
export async function saveEmergencySyncPackage(pkg: EmergencySyncPackage) {
  const parsed = parseEmergencySyncPackage(pkg);
  const cached: CachedEmergencySyncPackage = {
    ...pkg,
    parsed,
    cachedAt: new Date().toISOString()
  };

  await Promise.all([set(PACKAGE_KEY, cached), set(PACKAGE_JSON_KEY, parsed)]);
  await cacheEmergencyTiles(parsed.tileManifest.tiles.map((tile) => tile.url));
  return cached;
}

export async function loadEmergencySyncPackage() {
  return ((await get(PACKAGE_KEY)) as CachedEmergencySyncPackage | undefined) ?? null;
}

export async function clearEmergencySyncPackage() {
  await Promise.all([del(PACKAGE_KEY), del(PACKAGE_JSON_KEY)]);
}

/** Fetches an emergency package through AppSync for the user's current area. */
export async function fetchEmergencySyncPackage(input: EmergencySyncInput) {
  configureAmplify();
  const client = generateClient();
  const result = await client.graphql({
    query: queries.getEmergencySyncPackage,
    authMode: "userPool",
    variables: { input }
  });

  const pkg = (result as any).data?.getEmergencySyncPackage as EmergencySyncPackage | undefined;
  if (!pkg) throw new Error("Emergency sync package was not returned by the backend.");
  return pkg;
}

export async function downloadEmergencySyncPackage(input: EmergencySyncInput) {
  return saveEmergencySyncPackage(await fetchEmergencySyncPackage(input));
}

export function getPackageAgeMinutes(pkg: CachedEmergencySyncPackage | null) {
  if (!pkg) return null;
  return Math.max(0, Math.round((Date.now() - Date.parse(pkg.generatedAt)) / 60000));
}

export function isPackageStale(pkg: CachedEmergencySyncPackage | null) {
  if (!pkg) return true;
  return Date.now() > Date.parse(pkg.validUntil);
}

export async function cacheEmergencyTiles(urls: string[]) {
  if (!urls.length || typeof navigator === "undefined" || !navigator.serviceWorker?.controller) {
    return { requested: urls.length, sentToServiceWorker: false };
  }

  navigator.serviceWorker.controller.postMessage({
    type: "CACHE_EMERGENCY_TILES",
    urls
  });
  return { requested: urls.length, sentToServiceWorker: true };
}

/** Finds the nearest cached shelter using local-only package data and GPS. */
export function nearestCachedSafeZone(pkg: CachedEmergencySyncPackage | null, lat: number, lon: number) {
  if (!pkg) return null;

  return pkg.parsed.safeZones
    .map((zone) => {
      const point = parseGeoJsonPoint(zone.location);
      if (!point) return null;
      return {
        zone,
        distanceMeters: haversineMeters(lat, lon, point.latitude, point.longitude)
      };
    })
    .filter(Boolean)
    .sort((a, b) => a!.distanceMeters - b!.distanceMeters)[0] ?? null;
}

/** Returns cached disaster polygons that contain the supplied GPS point. */
export function activeCachedDisastersAt(pkg: CachedEmergencySyncPackage | null, lat: number, lon: number) {
  if (!pkg) return [] as Disaster[];
  return pkg.parsed.disasters.filter((disaster) => pointInsideGeoJsonPolygon(lat, lon, disaster.affectedArea));
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const radius = 6371000;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(deltaPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
  return 2 * radius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function pointInsideGeoJsonPolygon(lat: number, lon: number, rawPolygon?: string | null) {
  if (!rawPolygon) return false;

  try {
    const geometry = JSON.parse(rawPolygon) as { type: string; coordinates: number[][][] | number[][][][] };
    const rings =
      geometry.type === "Polygon"
        ? (geometry.coordinates as number[][][])
        : geometry.type === "MultiPolygon"
          ? (geometry.coordinates as number[][][][])[0]
          : null;
    const ring = rings?.[0];
    if (!ring?.length) return false;

    let inside = false;
    // Ray casting against the outer ring is enough for the bounded demo polygons
    // generated by the backend package resolver.
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      const intersects = yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
      if (intersects) inside = !inside;
    }
    return inside;
  } catch {
    return false;
  }
}

export function buildCachedDashboardStats(pkg: CachedEmergencySyncPackage | null) {
  return {
    activeDisasters: pkg?.parsed.disasters.length ?? 0,
    pendingSOS: 0,
    totalResources: pkg?.parsed.resources.length ?? 0,
    totalSafeZones: pkg?.parsed.safeZones.length ?? 0,
    totalUsers: 0
  };
}

export function cachedSafeZones(pkg: CachedEmergencySyncPackage | null): SafeZone[] {
  return pkg?.parsed.safeZones ?? [];
}
