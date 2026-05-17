"use client";

import { del, get, set } from "idb-keyval";

import type { StructuredFieldNote } from "@/lib/gemma/local-client";

const FIELD_NOTES_KEY = "crisisconnect:ngo:offline-field-notes";

export type OfflineFieldNote = {
  id: string;
  rawNote: string;
  createdAt: string;
  sosId?: string | null;
  disasterId?: string | null;
  structured: StructuredFieldNote;
  synced: boolean;
};

export async function loadOfflineFieldNotes() {
  return ((await get(FIELD_NOTES_KEY)) as OfflineFieldNote[] | undefined) ?? [];
}

export async function saveOfflineFieldNotes(notes: OfflineFieldNote[]) {
  await set(FIELD_NOTES_KEY, notes);
  return notes;
}

export async function addOfflineFieldNote(note: OfflineFieldNote) {
  const notes = await loadOfflineFieldNotes();
  const next = [note, ...notes].slice(0, 50);
  await saveOfflineFieldNotes(next);
  return next;
}

export async function clearOfflineFieldNotes() {
  await del(FIELD_NOTES_KEY);
}
