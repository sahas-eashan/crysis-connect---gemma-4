"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, History, Loader2, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { getAiAuditLogs, reviewAiAuditLog } from "@/lib/ai-client";
import { mockAiAuditLogs } from "@/lib/mock-data";
import type { AiAuditRef } from "@/lib/types";

export function ModelAuditDashboard() {
  const [logs, setLogs] = useState<AiAuditRef[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("Review Gemma model actions before public or operational use.");

  async function loadLogs() {
    setLoading(true);
    try {
      setLogs(await getAiAuditLogs(12));
      setMessage("Live Gemma audit logs loaded.");
    } catch {
      setLogs(mockAiAuditLogs);
      setMessage("Live audit logs unavailable, showing demo audit entries.");
    } finally {
      setLoading(false);
    }
  }

  async function review(id: string, approved: boolean) {
    try {
      const updated = await reviewAiAuditLog(id, approved);
      setLogs((current) => current.map((item) => (item.id === id ? updated : item)));
      setMessage(approved ? "Audit entry approved." : "Audit entry rejected.");
    } catch {
      setLogs((current) =>
        current.map((item) =>
          item.id === id ? { ...item, reviewStatus: approved ? "approved" : "rejected" } : item
        )
      );
      setMessage("Live review unavailable, updated demo audit status locally.");
    }
  }

  useEffect(() => {
    void loadLogs();
  }, []);

  return (
    <Card>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Model Audit Dashboard
          </CardTitle>
          <CardDescription className="mt-2">
            Tracks Gemma action, model name, status, review state, and approval decisions.
          </CardDescription>
        </div>
        <Button disabled={loading} onClick={() => void loadLogs()} variant="outline">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Refresh audits
        </Button>
      </div>

      <p className="mt-4 text-sm text-muted">{message}</p>

      <div className="mt-5 space-y-3">
        {logs.map((log) => (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4" key={log.id}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="font-medium text-white">{log.action}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge>{log.model}</Badge>
                  <Badge>{log.status}</Badge>
                  <Badge>{log.reviewStatus ?? "pending_review"}</Badge>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => void review(log.id, true)} variant="success">
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Approve
                </Button>
                <Button onClick={() => void review(log.id, false)} variant="danger">
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
