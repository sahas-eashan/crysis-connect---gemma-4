"use client";

import { useEffect, useState } from "react";
import { FileText, Loader2, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { structureNgoFieldNote } from "@/lib/gemma/local-client";
import {
  addOfflineFieldNote,
  clearOfflineFieldNotes,
  loadOfflineFieldNotes,
  type OfflineFieldNote
} from "@/lib/ngo/offline-field-cache";
import type { Disaster, SOSSignal } from "@/lib/types";

type Props = {
  disaster?: Disaster | null;
  sos?: SOSSignal | null;
};

export function OfflineFieldNotes({ disaster, sos }: Props) {
  const [note, setNote] = useState("");
  const [notes, setNotes] = useState<OfflineFieldNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("Record field observations offline and let Gemma structure them for later review.");

  useEffect(() => {
    void loadOfflineFieldNotes().then(setNotes);
  }, []);

  async function saveNote() {
    if (!note.trim()) {
      setMessage("Write a field note first.");
      return;
    }

    setLoading(true);
    setMessage("Structuring field note with Gemma 4...");
    try {
      const structured = await structureNgoFieldNote({ note, sos, disaster });
      const nextNote: OfflineFieldNote = {
        id: `field-note-${Date.now()}`,
        rawNote: note,
        createdAt: new Date().toISOString(),
        sosId: sos?.id ?? null,
        disasterId: disaster?.id ?? null,
        structured,
        synced: false
      };
      setNotes(await addOfflineFieldNote(nextNote));
      setNote("");
      setMessage("Field note saved locally. It can be reviewed before public or government sharing.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save field note.");
    } finally {
      setLoading(false);
    }
  }

  async function clearNotes() {
    await clearOfflineFieldNotes();
    setNotes([]);
    setMessage("Offline field notes cleared from this browser.");
  }

  return (
    <Card>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Offline NGO Field Notes
          </CardTitle>
          <CardDescription className="mt-2">
            Converts messy field notes into case status, medical follow-up, resource needs, and government-safe summaries.
          </CardDescription>
        </div>
        <Button disabled={!notes.length} onClick={() => void clearNotes()} variant="outline">
          <Trash2 className="mr-2 h-4 w-4" />
          Clear
        </Button>
      </div>

      <div className="mt-5 space-y-3">
        <textarea
          className="min-h-28 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-foreground outline-none ring-primary placeholder:text-slate-400 focus:border-primary/40 focus:bg-slate-950/70 focus:ring-2"
          onChange={(event) => setNote(event.target.value)}
          placeholder="Example: family evacuated, one elderly patient, needs medicine"
          value={note}
        />
        <Button disabled={loading} onClick={() => void saveNote()}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Structure and save note
        </Button>
        <p className="text-sm text-muted">{message}</p>
      </div>

      {notes.length ? (
        <div className="mt-5 space-y-3">
          {notes.slice(0, 5).map((item) => (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4" key={item.id}>
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{item.structured.case_status}</Badge>
                {item.structured.medical_followup ? <Badge>medical follow-up</Badge> : null}
                <Badge>{item.structured.public_update_safe ? "public-safe" : "internal only"}</Badge>
              </div>
              <p className="mt-3 text-sm text-slate-300">{item.structured.government_summary}</p>
              {item.structured.resources_needed.length ? (
                <p className="mt-2 text-xs text-muted">
                  Resources: {item.structured.resources_needed.join(", ")}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </Card>
  );
}
