"use client";

import { useEffect, useState } from "react";
import { generateClient } from "aws-amplify/api";
import { Loader2, MessageSquareWarning, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { configureAmplify } from "@/lib/aws/amplify";
import { mutations } from "@/lib/aws/graphql/operations";
import { structureOfflineSos } from "@/lib/gemma/local-client";
import type { CachedEmergencySyncPackage } from "@/lib/offline/emergency-cache";
import {
  enqueueOfflineSosDraft,
  loadOfflineSosQueue,
  saveOfflineSosQueue,
  type OfflineSosDraft
} from "@/lib/offline/indexeddb-store";

type Props = {
  pkg: CachedEmergencySyncPackage | null;
  location?: string | null;
};

export function SosDraftAssistant({ pkg, location }: Props) {
  const [type, setType] = useState("medical");
  const [description, setDescription] = useState("");
  const [queue, setQueue] = useState<OfflineSosDraft[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("Prepare an SOS now and send it when connectivity returns.");

  useEffect(() => {
    void loadOfflineSosQueue().then(setQueue);
  }, []);

  async function prepareAndQueue() {
    if (!description.trim()) {
      setMessage("Describe the emergency first.");
      return;
    }
    setLoading(true);
    try {
      const structured = await structureOfflineSos({ pkg, type, description, location });
      const draft: OfflineSosDraft = {
        localId: `web-offline-${Date.now()}`,
        type,
        description,
        location,
        createdAt: new Date().toISOString(),
        packageChecksum: pkg?.checksum ?? null,
        status: "queued",
        retryCount: 0,
        structured
      };
      setQueue(await enqueueOfflineSosDraft(draft));
      setDescription("");
      setMessage("SOS draft queued locally. It can sync through the existing SOS backend later.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to queue SOS draft.");
    } finally {
      setLoading(false);
    }
  }

  async function syncQueue() {
    if (!process.env.NEXT_PUBLIC_APPSYNC_GRAPHQL_URL) {
      setMessage("Live backend is not configured.");
      return;
    }
    setLoading(true);
    configureAmplify();
    const client = generateClient();
    const next: OfflineSosDraft[] = [];

    for (const item of queue) {
      if (item.status === "synced") {
        next.push(item);
        continue;
      }
      try {
        await client.graphql({
          query: mutations.createSOS,
          authMode: "userPool",
          variables: {
            input: {
              type: item.type,
              description: item.structured.refinedMessage || item.description,
              location: item.location
            }
          }
        });
        next.push({ ...item, status: "synced" });
      } catch {
        next.push({ ...item, retryCount: item.retryCount + 1 });
      }
    }

    await saveOfflineSosQueue(next);
    setQueue(next);
    setLoading(false);
    setMessage(`${next.filter((item) => item.status === "synced").length} queued SOS drafts synced.`);
  }

  return (
    <Card>
      <CardTitle className="flex items-center gap-2">
        <MessageSquareWarning className="h-5 w-5 text-danger" />
        Prepare SOS Now, Send Later
      </CardTitle>
      <CardDescription className="mt-2">
        Gemma structures messy emergency text into a responder-ready draft and keeps it in this browser.
      </CardDescription>

      <div className="mt-5 space-y-3">
        <select
          className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm"
          onChange={(event) => setType(event.target.value)}
          value={type}
        >
          <option value="medical">Medical emergency</option>
          <option value="trapped">Trapped or stranded</option>
          <option value="evacuation">Evacuation needed</option>
          <option value="resources">Urgent essentials needed</option>
        </select>
        <textarea
          className="min-h-28 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-foreground outline-none ring-primary placeholder:text-slate-400 focus:border-primary/40 focus:bg-slate-950/70 focus:ring-2"
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Example: water coming inside house, grandmother sick, 4 people near bridge"
          value={description}
        />
        <div className="flex flex-wrap gap-3">
          <Button disabled={loading} onClick={prepareAndQueue}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Queue SOS draft
          </Button>
          <Button disabled={loading || !queue.length} onClick={syncQueue} variant="outline">
            <Send className="mr-2 h-4 w-4" />
            Sync queue
          </Button>
        </div>
        <p className="text-sm text-muted">{message}</p>
      </div>

      {queue.length ? (
        <div className="mt-5 space-y-3">
          {queue.slice(0, 4).map((item) => (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4" key={item.localId}>
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-white">{item.structured.urgency.toUpperCase()} {item.type}</p>
                <span className="text-xs uppercase tracking-wide text-primary">{item.status}</span>
              </div>
              <p className="mt-2 text-sm text-slate-300">{item.structured.refinedMessage}</p>
              <p className="mt-2 text-xs text-muted">SMS: {item.structured.smsDraft}</p>
            </div>
          ))}
        </div>
      ) : null}
    </Card>
  );
}
