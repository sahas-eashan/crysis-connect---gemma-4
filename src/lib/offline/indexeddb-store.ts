"use client";

import { del, get, set } from "idb-keyval";

export type OfflineSosDraft = {
  localId: string;
  type: string;
  description: string;
  location?: string | null;
  createdAt: string;
  packageChecksum?: string | null;
  status: "queued" | "synced";
  retryCount: number;
  structured: {
    incidentType: string;
    peopleCount: number;
    medicalRisk: boolean;
    urgency: string;
    missingInformation: string[];
    refinedMessage: string;
    smsDraft: string;
    translations: {
      english: string;
      sinhala: string;
      tamil: string;
    };
  };
};

const OFFLINE_SOS_QUEUE_KEY = "crisisconnect:offline-sos:queue";

export async function loadOfflineSosQueue() {
  return ((await get(OFFLINE_SOS_QUEUE_KEY)) as OfflineSosDraft[] | undefined) ?? [];
}

export async function saveOfflineSosQueue(queue: OfflineSosDraft[]) {
  await set(OFFLINE_SOS_QUEUE_KEY, queue);
}

export async function enqueueOfflineSosDraft(draft: OfflineSosDraft) {
  const queue = await loadOfflineSosQueue();
  const next = [draft, ...queue.filter((item) => item.localId !== draft.localId)];
  await saveOfflineSosQueue(next);
  return next;
}

export async function clearOfflineSosQueue() {
  await del(OFFLINE_SOS_QUEUE_KEY);
}
