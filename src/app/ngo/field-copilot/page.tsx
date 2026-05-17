"use client";

import { useEffect, useMemo, useState } from "react";
import { generateClient } from "aws-amplify/api";
import { Bot, RefreshCw } from "lucide-react";

import { GemmaDispatchBrief } from "@/components/ngo/GemmaDispatchBrief";
import { OfflineFieldNotes } from "@/components/ngo/OfflineFieldNotes";
import { ResourcePackingChecklist } from "@/components/ngo/ResourcePackingChecklist";
import { SosTriagePanel } from "@/components/ngo/SosTriagePanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { configureAmplify } from "@/lib/aws/amplify";
import { queries } from "@/lib/aws/graphql/operations";
import { mockDisasters, mockResourceRequests, mockResources, mockSOSSignals, mockSafeZones } from "@/lib/mock-data";
import type { Disaster, Resource, ResourceRequest, SOSSignal, SafeZone } from "@/lib/types";

type FieldCopilotState = {
  disasters: Disaster[];
  resources: Resource[];
  requests: ResourceRequest[];
  safeZones: SafeZone[];
  sosSignals: SOSSignal[];
};

const fallbackState: FieldCopilotState = {
  disasters: mockDisasters,
  resources: mockResources,
  requests: mockResourceRequests,
  safeZones: mockSafeZones,
  sosSignals: mockSOSSignals
};

export default function NgoFieldCopilotPage() {
  const hasAwsConfig = Boolean(process.env.NEXT_PUBLIC_APPSYNC_GRAPHQL_URL);
  const [state, setState] = useState<FieldCopilotState>(() => (hasAwsConfig ? {
    disasters: [],
    resources: [],
    requests: [],
    safeZones: [],
    sosSignals: []
  } : fallbackState));
  const [loading, setLoading] = useState(hasAwsConfig);
  const [message, setMessage] = useState(
    hasAwsConfig ? "Loading live field context..." : "Demo mode uses local mock field context."
  );

  const selectedDisaster = state.disasters[0] ?? null;
  const selectedSos = useMemo(() => state.sosSignals[0] ?? null, [state.sosSignals]);
  const selectedRequest = useMemo(() => state.requests[0] ?? null, [state.requests]);

  async function loadContext() {
    if (!hasAwsConfig) {
      setState(fallbackState);
      setMessage("Demo mode uses local mock field context.");
      return;
    }

    setLoading(true);
    configureAmplify();
    const client = generateClient();

    try {
      const [disastersResult, resourcesResult, requestsResult, safeZonesResult, sosResult] = await Promise.allSettled([
        client.graphql({ query: queries.getDisasters, authMode: "userPool", variables: { status: "active" } }),
        client.graphql({ query: queries.getResources, authMode: "userPool" }),
        client.graphql({ query: queries.getResourceRequests, authMode: "userPool", variables: { status: "pending" } }),
        client.graphql({ query: queries.getSafeZones, authMode: "userPool" }),
        client.graphql({ query: queries.getSOSSignals, authMode: "userPool", variables: { status: "pending" } })
      ]);

      setState({
        disasters:
          disastersResult.status === "fulfilled"
            ? (((disastersResult.value as any).data?.getDisasters ?? []) as Disaster[])
            : fallbackState.disasters,
        resources:
          resourcesResult.status === "fulfilled"
            ? (((resourcesResult.value as any).data?.getResources ?? []) as Resource[])
            : fallbackState.resources,
        requests:
          requestsResult.status === "fulfilled"
            ? (((requestsResult.value as any).data?.getResourceRequests ?? []) as ResourceRequest[])
            : fallbackState.requests,
        safeZones:
          safeZonesResult.status === "fulfilled"
            ? (((safeZonesResult.value as any).data?.getSafeZones ?? []) as SafeZone[])
            : fallbackState.safeZones,
        sosSignals:
          sosResult.status === "fulfilled"
            ? (((sosResult.value as any).data?.getSOSSignals ?? []) as SOSSignal[])
            : fallbackState.sosSignals
      });

      const failed = [disastersResult, resourcesResult, requestsResult, safeZonesResult, sosResult].filter(
        (result) => result.status === "rejected"
      ).length;
      setMessage(failed ? `Live context loaded with ${failed} fallback section(s).` : "Live NGO field context loaded.");
    } catch (error) {
      setState(fallbackState);
      setMessage(error instanceof Error ? error.message : "Unable to load live context, using demo context.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadContext();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border-primary/40 bg-primary/10 text-primary">Module F</Badge>
            <Badge>Gemma 4 NGO field copilot</Badge>
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">Field Worker Copilot</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted">
            Use Gemma 4 to triage SOS cases, brief responders, prepare packing checklists, and structure offline notes from verified CrisisConnect data.
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
              Grounding Snapshot
            </CardTitle>
            <CardDescription className="mt-2">
              {message}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge>{state.sosSignals.length} SOS cases</Badge>
            <Badge>{state.resources.length} inventory items</Badge>
            <Badge>{state.requests.length} requests</Badge>
            <Badge>{state.safeZones.length} shelters</Badge>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <SosTriagePanel sosSignals={state.sosSignals} />
        <GemmaDispatchBrief disaster={selectedDisaster} resources={state.resources} sosSignals={state.sosSignals} />
      </div>

      <ResourcePackingChecklist
        disaster={selectedDisaster}
        request={selectedRequest}
        resources={state.resources}
        safeZones={state.safeZones}
        sos={selectedSos}
      />

      <OfflineFieldNotes disaster={selectedDisaster} sos={selectedSos} />
    </div>
  );
}
