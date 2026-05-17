"use client";

import { useEffect, useState } from "react";
import { generateClient } from "aws-amplify/api";
import { Bot, RefreshCw } from "lucide-react";

import { DataFreshnessMap } from "@/components/admin/DataFreshnessMap";
import { EmergencySyncPackagePublisher } from "@/components/admin/EmergencySyncPackagePublisher";
import { GemmaAlertComposer } from "@/components/admin/GemmaAlertComposer";
import { GemmaIncidentBrief } from "@/components/admin/GemmaIncidentBrief";
import { GemmaRiskReview } from "@/components/admin/GemmaRiskReview";
import { ModelAuditDashboard } from "@/components/admin/ModelAuditDashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { configureAmplify } from "@/lib/aws/amplify";
import { queries } from "@/lib/aws/graphql/operations";
import { mockDisasters, mockNews, mockResources, mockSOSSignals, mockSafeZones } from "@/lib/mock-data";
import type { Alert, Disaster, Resource, SOSSignal, SafeZone } from "@/lib/types";

type CommandState = {
  alerts: Alert[];
  disasters: Disaster[];
  resources: Resource[];
  safeZones: SafeZone[];
  sosSignals: SOSSignal[];
};

const fallbackState: CommandState = {
  alerts: [
    {
      id: "demo-alert-1",
      title: mockNews[0]?.title ?? "Flood safety alert",
      body: mockNews[0]?.content ?? "Follow official flood safety guidance.",
      type: "public",
      channel: ["sms", "push"],
      createdAt: new Date().toISOString()
    }
  ],
  disasters: mockDisasters,
  resources: mockResources,
  safeZones: mockSafeZones,
  sosSignals: mockSOSSignals
};

export default function GemmaCommandCenterPage() {
  const hasAwsConfig = Boolean(process.env.NEXT_PUBLIC_APPSYNC_GRAPHQL_URL);
  const [state, setState] = useState<CommandState>(() =>
    hasAwsConfig
      ? { alerts: [], disasters: [], resources: [], safeZones: [], sosSignals: [] }
      : fallbackState
  );
  const [loading, setLoading] = useState(hasAwsConfig);
  const [message, setMessage] = useState(
    hasAwsConfig ? "Loading live command-center context..." : "Demo mode uses local command-center context."
  );

  async function loadContext() {
    if (!hasAwsConfig) {
      setState(fallbackState);
      setMessage("Demo mode uses local command-center context.");
      return;
    }

    setLoading(true);
    configureAmplify();
    const client = generateClient();

    try {
      const [alertsResult, disastersResult, resourcesResult, safeZonesResult, sosResult] = await Promise.allSettled([
        client.graphql({ query: queries.getAlerts, authMode: "userPool" }),
        client.graphql({ query: queries.getDisasters, authMode: "userPool", variables: { status: "active" } }),
        client.graphql({ query: queries.getResources, authMode: "userPool" }),
        client.graphql({ query: queries.getSafeZones, authMode: "userPool" }),
        client.graphql({ query: queries.getSOSSignals, authMode: "userPool", variables: { status: "pending" } })
      ]);

      setState({
        alerts:
          alertsResult.status === "fulfilled"
            ? (((alertsResult.value as any).data?.getAlerts ?? []) as Alert[])
            : fallbackState.alerts,
        disasters:
          disastersResult.status === "fulfilled"
            ? (((disastersResult.value as any).data?.getDisasters ?? []) as Disaster[])
            : fallbackState.disasters,
        resources:
          resourcesResult.status === "fulfilled"
            ? (((resourcesResult.value as any).data?.getResources ?? []) as Resource[])
            : fallbackState.resources,
        safeZones:
          safeZonesResult.status === "fulfilled"
            ? (((safeZonesResult.value as any).data?.getSafeZones ?? []) as SafeZone[])
            : fallbackState.safeZones,
        sosSignals:
          sosResult.status === "fulfilled"
            ? (((sosResult.value as any).data?.getSOSSignals ?? []) as SOSSignal[])
            : fallbackState.sosSignals
      });

      const failed = [alertsResult, disastersResult, resourcesResult, safeZonesResult, sosResult].filter(
        (result) => result.status === "rejected"
      ).length;
      setMessage(failed ? `Live context loaded with ${failed} fallback section(s).` : "Live command context loaded.");
    } catch (error) {
      setState(fallbackState);
      setMessage(error instanceof Error ? error.message : "Unable to load live command context.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadContext();
  }, []);

  const selectedDisaster = state.disasters[0] ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border-primary/40 bg-primary/10 text-primary">Module G</Badge>
            <Badge>Gemma 4 government command center</Badge>
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">Gemma Command Center</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted">
            Generate incident briefs, operations plans, multilingual alerts, risk reviews, audit decisions, and offline package snapshots from verified CrisisConnect data.
          </p>
        </div>
        <Button disabled={loading} onClick={() => void loadContext()} variant="outline">
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh context
        </Button>
      </div>

      <Card className="border-primary/30">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              Government Grounding Snapshot
            </CardTitle>
            <CardDescription className="mt-2">{message}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge>{state.disasters.length} incidents</Badge>
            <Badge>{state.sosSignals.length} open SOS</Badge>
            <Badge>{state.resources.length} resources</Badge>
            <Badge>{state.safeZones.length} shelters</Badge>
            <Badge>{state.alerts.length} alerts</Badge>
          </div>
        </div>
      </Card>

      <GemmaIncidentBrief disasterId={selectedDisaster?.id ?? null} />
      <GemmaRiskReview
        disasters={state.disasters}
        resources={state.resources}
        safeZones={state.safeZones}
        sosSignals={state.sosSignals}
      />
      <GemmaAlertComposer />
      <EmergencySyncPackagePublisher />
      <DataFreshnessMap
        alerts={state.alerts}
        disasters={state.disasters}
        resources={state.resources}
        safeZones={state.safeZones}
        sosSignals={state.sosSignals}
      />
      <ModelAuditDashboard />
    </div>
  );
}
